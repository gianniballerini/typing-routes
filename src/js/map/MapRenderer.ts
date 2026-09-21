import { Settings } from '../Settings';
import { createCarMarkerSprite, type CarMarkerSprite } from '../utils/CarMarkerIcon';
import { createTintedSilhouette } from '../utils/CountrySilhouette';
import { artworkRect, strokeCountryOutline, type CountryOutline } from './CountryOutline';
import type { MapCamera } from './MapCamera';
import type { CityFeature, RouteFeature } from './MapFeatures';
import { interpolateByZoom } from './MercatorProjection';

export type ProgressMarkerState = {
    x: number;
    y: number;
    visible: boolean;
    bearing: number;
};

export type HoverRingState = {
    cityId: string | null;
    radius: number;
    strokeOpacity: number;
};

export type RouteOutlineState = {
    routeId: string | null;
    /** Outer width of the ring, in CSS pixels. */
    width: number;
    strokeOpacity: number;
};

export type CityBurstState = {
    cityId: string;
    /** 0 when the city was just completed, 1 when the burst is over. */
    progress: number;
};

/**
 * Draws the map: country, border, routes, cities, hover ring, progress
 * marker — back to front, each layer painting over the one beneath it.
 *
 * Every size here comes from the same `Settings` zoom ramp the old `interpolate`
 * expressions used, resolved to a plain number once per frame instead of being
 * re-evaluated per feature.
 */
class MapRenderer {
    private readonly canvas: HTMLCanvasElement;
    private readonly ctx: CanvasRenderingContext2D | null;
    private sprite: CarMarkerSprite | null;
    private spriteResolved: boolean;
    private outline: CountryOutline | null;
    private texture: HTMLImageElement | null;
    private silhouette: HTMLCanvasElement | null;
    private silhouetteResolved: boolean;
    private pixelRatio: number;
    private scratch: HTMLCanvasElement | null;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        // Transparent: the sea canvas underneath shows through wherever the
        // map does not paint.
        this.ctx = canvas.getContext('2d', { alpha: true });
        this.sprite = null;
        this.spriteResolved = false;
        this.outline = null;
        this.texture = null;
        this.silhouette = null;
        this.silhouetteResolved = false;
        this.pixelRatio = 1;
        this.scratch = null;
    }

    setCountryOutline(outline: CountryOutline | null): void {
        this.outline = outline;
    }

    setTexture(image: HTMLImageElement | null): void {
        this.texture = image;
        // The shadow is baked from this image, so it has to be baked again.
        this.silhouette = null;
        this.silhouetteResolved = false;
    }

    /**
     * Sizes the backing store to device pixels while the drawing code keeps
     * working in CSS pixels. Returns the CSS size so the camera can follow.
     */
    resize(): { width: number; height: number } {
        const rect = this.canvas.getBoundingClientRect();
        const width = Math.max(1, Math.round(rect.width));
        const height = Math.max(1, Math.round(rect.height));

        this.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        const deviceWidth = Math.round(width * this.pixelRatio);
        const deviceHeight = Math.round(height * this.pixelRatio);

        if (this.canvas.width !== deviceWidth || this.canvas.height !== deviceHeight) {
            this.canvas.width = deviceWidth;
            this.canvas.height = deviceHeight;
        }

        return { width, height };
    }

    private getSprite(): CarMarkerSprite | null {
        // Built once, lazily: the sprite needs a canvas context, which can be
        // unavailable, and there is no point retrying every frame.
        if (this.spriteResolved) return this.sprite;
        this.spriteResolved = true;
        this.sprite = createCarMarkerSprite({
            length: Settings.progressMarker.size,
            bodyColor: Settings.progressMarker.color,
            roofColor: Settings.progressMarker.roofColor,
            glassColor: Settings.progressMarker.glassColor,
            lightColor: Settings.progressMarker.lightColor,
            strokeColor: Settings.progressMarker.strokeColor,
            strokeWidth: Settings.progressMarker.strokeWidth
        });
        return this.sprite;
    }

    /**
     * The country flattened to the shadow colour, baked once.
     *
     * Same lazy shape as `getSprite()`: the bake needs a canvas context, which
     * can be unavailable, and there is no point retrying every frame.
     */
    private getSilhouette(): HTMLCanvasElement | null {
        if (this.silhouetteResolved) return this.silhouette;
        if (!this.texture) return null;
        this.silhouetteResolved = true;
        this.silhouette = createTintedSilhouette(
            this.texture,
            Settings.countryShadow.color,
            Settings.countryShadow.maxSize
        );
        return this.silhouette;
    }

    /** Same precedence the old `['case', ...]` paint expression encoded. */
    private routeColor(route: RouteFeature): string {
        const colors = Settings.routeLine.colors;
        if (route.selected) return colors.selected;
        if (route.properties.stars >= 3) return colors.stars3;
        if (route.properties.stars >= 2) return colors.stars2;
        if (route.properties.stars > 0) return colors.stars1;
        if (route.properties.visited) return colors.visited;
        return colors.default;
    }

    private isRouteVisible(route: RouteFeature, camera: MapCamera, margin: number): boolean {
        const x0 = camera.projectWorldX(route.minX);
        const x1 = camera.projectWorldX(route.maxX);
        const y0 = camera.projectWorldY(route.minY);
        const y1 = camera.projectWorldY(route.maxY);
        return !(x1 < -margin || y1 < -margin || x0 > camera.width + margin || y0 > camera.height + margin);
    }

    private strokeParts(
        ctx: CanvasRenderingContext2D,
        camera: MapCamera,
        parts: Float64Array[]
    ): void {
        for (const part of parts) {
            if (part.length < 4) continue;
            ctx.beginPath();
            ctx.moveTo(camera.projectWorldX(part[0]), camera.projectWorldY(part[1]));
            for (let i = 2; i < part.length; i += 2) {
                ctx.lineTo(camera.projectWorldX(part[i]), camera.projectWorldY(part[i + 1]));
            }
            ctx.stroke();
        }
    }

    /**
     * Strokes a hollow outline along a route: a wide stroke with a narrower one
     * punched out of it. It is built off-screen so the punch clears only the
     * outline, leaving the map visible in the gap between ring and road.
     */
    private strokeRouteOutline(
        ctx: CanvasRenderingContext2D,
        camera: MapCamera,
        route: RouteFeature,
        outline: RouteOutlineState
    ): void {
        const style = Settings.routeLine.hoverOutline;
        const innerWidth = outline.width - style.strokeWidth * 2;
        if (innerWidth <= 0) return;

        const deviceWidth = this.canvas.width;
        const deviceHeight = this.canvas.height;
        if (!this.scratch) this.scratch = document.createElement('canvas');
        if (this.scratch.width !== deviceWidth || this.scratch.height !== deviceHeight) {
            this.scratch.width = deviceWidth;
            this.scratch.height = deviceHeight;
        }
        const scratchCtx = this.scratch.getContext('2d');
        if (!scratchCtx) return;

        scratchCtx.setTransform(1, 0, 0, 1, 0, 0);
        scratchCtx.clearRect(0, 0, deviceWidth, deviceHeight);
        scratchCtx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
        scratchCtx.lineJoin = 'round';
        scratchCtx.lineCap = 'round';

        scratchCtx.strokeStyle = style.color;
        scratchCtx.lineWidth = outline.width;
        this.strokeParts(scratchCtx, camera, route.parts);

        scratchCtx.globalCompositeOperation = 'destination-out';
        scratchCtx.lineWidth = innerWidth;
        this.strokeParts(scratchCtx, camera, route.parts);
        scratchCtx.globalCompositeOperation = 'source-over';

        ctx.globalAlpha = outline.strokeOpacity;
        ctx.drawImage(this.scratch, 0, 0, camera.width, camera.height);
        ctx.globalAlpha = 1;
    }

    draw(
        camera: MapCamera,
        routes: RouteFeature[],
        cities: CityFeature[],
        hoverRing: HoverRingState,
        routeOutline: RouteOutlineState,
        bursts: CityBurstState[],
        marker: ProgressMarkerState,
        hitboxOverlay: HTMLCanvasElement | null
    ): void {
        const ctx = this.ctx;
        if (!ctx) return;

        const zoom = camera.zoom;

        ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
        ctx.clearRect(0, 0, camera.width, camera.height);

        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        // The sea and its shallows live on their own canvas underneath (see
        // `SeaRenderer`), so they can animate without this layer redrawing.
        // Everything here is painted over a transparent backing store.
        const rect = artworkRect(camera);
        const { left, top } = rect;

        // 1. The country's shadow: the same silhouette, flat and offset. Drawn
        // with no blur on purpose — the hard edge is what makes the landmass
        // read as lying on top of the water rather than glowing above it.
        const silhouette = this.getSilhouette();
        if (silhouette) {
            ctx.globalAlpha = Settings.countryShadow.opacity;
            ctx.drawImage(
                silhouette,
                left + Settings.countryShadow.offsetX,
                top + Settings.countryShadow.offsetY,
                rect.width,
                rect.height
            );
            ctx.globalAlpha = 1;
        }

        // 2. Country artwork.
        if (this.texture) {
            ctx.globalAlpha = Settings.mapTexture.opacity;
            ctx.drawImage(this.texture, left, top, rect.width, rect.height);
            ctx.globalAlpha = 1;
        }

        // 3. Coastline.
        if (this.outline) strokeCountryOutline(
            ctx,
            this.outline,
            rect,
            [Settings.argentinaBorder.width],
            [Settings.argentinaBorder.color]
        );

        // 4. Routes.
        const lineWidth = interpolateByZoom(
            zoom,
            Settings.routeLine.widthByZoom.minZoom,
            Settings.routeLine.widthByZoom.minWidth,
            Settings.routeLine.widthByZoom.maxZoom,
            Settings.routeLine.widthByZoom.maxWidth
        );
        const casingWidth = interpolateByZoom(
            zoom,
            Settings.routeLine.casing.widthByZoom.minZoom,
            Settings.routeLine.casing.widthByZoom.minWidth,
            Settings.routeLine.casing.widthByZoom.maxZoom,
            Settings.routeLine.casing.widthByZoom.maxWidth
        );
        const casedWidth = lineWidth + casingWidth * 2;
        ctx.globalAlpha = Settings.routeLine.opacity;

        // Selected and hovered routes are drawn last so they sit above their
        // neighbours at a crossing, which is what the highlight is for. The
        // hover outline goes between the two batches: above the routes it
        // crosses, below the road it circles.
        const plain: RouteFeature[] = [];
        const highlighted: RouteFeature[] = [];
        for (const route of routes) {
            if (!this.isRouteVisible(route, camera, casedWidth)) continue;
            (route.selected || route.hovered ? highlighted : plain).push(route);
        }

        // Every casing before any fill: casing and fill interleaved per route
        // would let a later route's casing cut across an earlier route's colour
        // at a crossing, which reads as a gap in the road.
        const strokeCased = (batch: RouteFeature[]): void => {
            ctx.lineWidth = casedWidth;
            ctx.strokeStyle = Settings.routeLine.casing.color;
            for (const route of batch) this.strokeParts(ctx, camera, route.parts);

            ctx.lineWidth = lineWidth;
            for (const route of batch) {
                ctx.strokeStyle = this.routeColor(route);
                this.strokeParts(ctx, camera, route.parts);
            }
        };
        strokeCased(plain);
        ctx.globalAlpha = 1;
        if (routeOutline.routeId !== null && routeOutline.strokeOpacity > 0) {
            const hovered = highlighted.find((route) => route.id === routeOutline.routeId);
            if (hovered) this.strokeRouteOutline(ctx, camera, hovered, routeOutline);
        }
        ctx.globalAlpha = Settings.routeLine.opacity;
        strokeCased(highlighted);
        ctx.globalAlpha = 1;

        // 5. Cities.
        const radius = interpolateByZoom(
            zoom,
            Settings.cityCircle.radiusByZoom.minZoom,
            Settings.cityCircle.radiusByZoom.minRadius,
            Settings.cityCircle.radiusByZoom.maxZoom,
            Settings.cityCircle.radiusByZoom.maxRadius
        );
        const visitedStyle = Settings.cityCircle.visited;
        const burstStyle = Settings.cityCircle.completionBurst;
        const burstById = new Map(bursts.map((burst) => [burst.cityId, burst.progress]));
        const maxRadius = radius * visitedStyle.radiusScale * burstStyle.popScale;

        for (const city of cities) {
            const x = camera.projectWorldX(city.x);
            const y = camera.projectWorldY(city.y);
            if (x < -maxRadius || y < -maxRadius || x > camera.width + maxRadius || y > camera.height + maxRadius) continue;

            // A completed city wins over the selected-route tint: during a run
            // every city on the route is selected, and the medal is the point.
            const visited = city.properties.visited;
            let cityRadius = visited ? radius * visitedStyle.radiusScale : radius;

            const progress = burstById.get(city.id);
            if (progress !== undefined) {
                // Overshoot and settle: peaks early, decays back to rest size.
                const pop = Math.sin(Math.PI * Math.min(1, progress * 1.6)) * (1 - progress);
                cityRadius *= 1 + (burstStyle.popScale - 1) * pop;
            }

            ctx.fillStyle = visited
                ? Settings.cityCircle.colors.visited
                : city.selected
                    ? Settings.cityCircle.colors.selected
                    : Settings.cityCircle.colors.default;

            ctx.beginPath();
            ctx.arc(x, y, cityRadius, 0, Math.PI * 2);
            ctx.fill();
            if (Settings.cityCircle.stroke.width > 0) {
                ctx.lineWidth = Settings.cityCircle.stroke.width;
                ctx.strokeStyle = Settings.cityCircle.stroke.color;
                ctx.stroke();
            }

            if (visited) {
                ctx.fillStyle = visitedStyle.highlightColor;
                ctx.beginPath();
                ctx.arc(x, y, cityRadius * visitedStyle.highlightScale, 0, Math.PI * 2);
                ctx.fill();
            }

            if (progress !== undefined) {
                const eased = 1 - Math.pow(1 - progress, 3);
                ctx.globalAlpha = 1 - progress;
                ctx.strokeStyle = burstStyle.ringColor;
                ctx.lineWidth = burstStyle.ringStrokeWidth;
                ctx.beginPath();
                ctx.arc(x, y, cityRadius + burstStyle.ringGrowthPx * eased, 0, Math.PI * 2);
                ctx.stroke();
                ctx.globalAlpha = 1;
            }
        }

        // 6. Hover ring.
        if (hoverRing.cityId !== null && hoverRing.strokeOpacity > 0) {
            const city = cities.find((candidate) => candidate.id === hoverRing.cityId);
            if (city) {
                ctx.globalAlpha = hoverRing.strokeOpacity;
                ctx.strokeStyle = Settings.cityCircle.hoverRing.color;
                ctx.lineWidth = Settings.cityCircle.hoverRing.strokeWidth;
                ctx.beginPath();
                ctx.arc(
                    camera.projectWorldX(city.x),
                    camera.projectWorldY(city.y),
                    hoverRing.radius,
                    0,
                    Math.PI * 2
                );
                ctx.stroke();
                ctx.globalAlpha = 1;
            }
        }

        // 7. Progress marker.
        if (marker.visible) {
            const x = camera.projectWorldX(marker.x);
            const y = camera.projectWorldY(marker.y);
            const sprite = this.getSprite();
            const scale = interpolateByZoom(
                zoom,
                Settings.progressMarker.sizeByZoom.minZoom,
                Settings.progressMarker.sizeByZoom.minSize,
                Settings.progressMarker.sizeByZoom.maxZoom,
                Settings.progressMarker.sizeByZoom.maxSize
            );

            ctx.globalAlpha = Settings.progressMarker.opacity;
            if (sprite) {
                const w = sprite.cssWidth * scale;
                const h = sprite.cssHeight * scale;
                ctx.save();
                ctx.translate(x, y);
                // The sprite points north, so the route bearing rotates it directly.
                ctx.rotate(marker.bearing * Math.PI / 180);
                ctx.drawImage(sprite.canvas, -w / 2, -h / 2, w, h);
                ctx.restore();
            } else {
                // Canvas unavailable for the sprite: a plain dot still shows progress.
                ctx.fillStyle = Settings.progressMarker.color;
                ctx.beginPath();
                ctx.arc(x, y, (Settings.progressMarker.size / 2) * scale, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        }

        // Debug: the pick buffer composited over the frame, so hit targets are visible.
        if (hitboxOverlay) {
            ctx.globalAlpha = Settings.routeLine.hitboxDebug.opacity;
            ctx.drawImage(hitboxOverlay, 0, 0, camera.width, camera.height);
            ctx.globalAlpha = 1;
        }
    }
}

export { MapRenderer };
