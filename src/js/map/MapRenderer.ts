import { Settings } from '../Settings';
import { createCarMarkerSprite, type CarMarkerSprite } from '../utils/CarMarkerIcon';
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

/**
 * Draws the map: border, routes, cities, hover ring, progress marker — in the
 * same order the MapLibre layer stack had, so the visual result is unchanged.
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
    private borderParts: Float64Array[];
    private pixelRatio: number;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        // Transparent on purpose: the page background already paints the map colour
        // (`$argentina-dark-gray` on `body`), exactly as it showed through the
        // MapLibre canvas. Filling here would duplicate that value in two places.
        this.ctx = canvas.getContext('2d', { alpha: true });
        this.sprite = null;
        this.spriteResolved = false;
        this.borderParts = [];
        this.pixelRatio = 1;
    }

    setBorder(parts: Float64Array[]): void {
        this.borderParts = parts;
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

    /** Same precedence the old `['case', ...]` paint expression encoded. */
    private routeColor(route: RouteFeature): string {
        const colors = Settings.routeLine.colors;
        if (route.selected) return colors.selected;
        if (route.hovered) return colors.hovered;
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

    draw(
        camera: MapCamera,
        routes: RouteFeature[],
        cities: CityFeature[],
        hoverRing: HoverRingState,
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

        // 1. Border.
        if (this.borderParts.length > 0) {
            ctx.strokeStyle = Settings.argentinaBorder.color;
            ctx.lineWidth = Settings.argentinaBorder.width;
            this.strokeParts(ctx, camera, this.borderParts);
        }

        // 2. Routes.
        const lineWidth = interpolateByZoom(
            zoom,
            Settings.routeLine.widthByZoom.minZoom,
            Settings.routeLine.widthByZoom.minWidth,
            Settings.routeLine.widthByZoom.maxZoom,
            Settings.routeLine.widthByZoom.maxWidth
        );
        ctx.globalAlpha = Settings.routeLine.opacity;
        ctx.lineWidth = lineWidth;

        // Selected and hovered routes are drawn last so they sit above their
        // neighbours at a crossing, which is what the highlight is for.
        const highlighted: RouteFeature[] = [];
        for (const route of routes) {
            if (!this.isRouteVisible(route, camera, lineWidth)) continue;
            if (route.selected || route.hovered) {
                highlighted.push(route);
                continue;
            }
            ctx.strokeStyle = this.routeColor(route);
            this.strokeParts(ctx, camera, route.parts);
        }
        for (const route of highlighted) {
            ctx.strokeStyle = this.routeColor(route);
            this.strokeParts(ctx, camera, route.parts);
        }
        ctx.globalAlpha = 1;

        // 3. Cities.
        const radius = interpolateByZoom(
            zoom,
            Settings.cityCircle.radiusByZoom.minZoom,
            Settings.cityCircle.radiusByZoom.minRadius,
            Settings.cityCircle.radiusByZoom.maxZoom,
            Settings.cityCircle.radiusByZoom.maxRadius
        );
        ctx.lineWidth = Settings.cityCircle.stroke.width;
        ctx.strokeStyle = Settings.cityCircle.stroke.color;

        for (const city of cities) {
            const x = camera.projectWorldX(city.x);
            const y = camera.projectWorldY(city.y);
            if (x < -radius || y < -radius || x > camera.width + radius || y > camera.height + radius) continue;

            ctx.fillStyle = city.selected
                ? Settings.cityCircle.colors.selected
                : city.properties.visited
                    ? Settings.cityCircle.colors.visited
                    : Settings.cityCircle.colors.default;

            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
            if (Settings.cityCircle.stroke.width > 0) ctx.stroke();
        }

        // 4. Hover ring.
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

        // 5. Progress marker.
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
