import { gsap } from 'gsap';
import { Settings } from '../Settings';
import {
    clamp,
    projectLat,
    projectLon,
    unprojectX,
    unprojectY,
    worldSizeAtZoom,
    type Coordinate
} from './MercatorProjection';

export type CameraTarget = {
    center?: Coordinate;
    zoom?: number;
};

type Bounds = {
    west: number;
    south: number;
    east: number;
    north: number;
};

/**
 * The map camera: a centre in world units plus a zoom, and the projection from
 * world units to screen pixels.
 *
 * Deliberately mirrors the MapLibre transform it replaces, because every tuned
 * value in `Settings` was chosen against that behaviour:
 *
 * - `worldSize = 512 * 2**zoom`, so `maxZoom` and `routeSelection.flyToZoom`
 *   keep their meaning.
 * - `maxBounds` clamps panning only. The zoom floor comes from
 *   `Settings.countryView`: a contain fit of the country's bbox, so the map
 *   opens with all of Argentina on screen and cannot zoom out past it. Without
 *   a floor the map would open as a speck in the middle of an empty canvas.
 */
class MapCamera {
    private centerX: number;
    private centerY: number;
    private zoomLevel: number;
    private viewportWidth: number;
    private viewportHeight: number;
    private readonly bounds: Bounds | null;
    private readonly onChange: () => void;
    private activeTween: gsap.core.Tween | null;

    constructor(onChange: () => void) {
        this.onChange = onChange;
        this.activeTween = null;
        this.viewportWidth = 1;
        this.viewportHeight = 1;

        const maxBounds = Settings.maxBounds as [[number, number], [number, number]] | null;
        this.bounds = maxBounds
            ? {
                west: maxBounds[0][0],
                south: maxBounds[0][1],
                east: maxBounds[1][0],
                north: maxBounds[1][1]
            }
            : null;

        this.centerX = projectLon(Settings.center[0]);
        this.centerY = projectLat(Settings.center[1]);
        this.zoomLevel = Settings.initialZoom;
    }

    get zoom(): number {
        return this.zoomLevel;
    }

    get worldSize(): number {
        return worldSizeAtZoom(this.zoomLevel);
    }

    get width(): number {
        return this.viewportWidth;
    }

    get height(): number {
        return this.viewportHeight;
    }

    getCenter(): Coordinate {
        return [unprojectX(this.centerX), unprojectY(this.centerY)];
    }

    setViewport(width: number, height: number): void {
        // A camera resting at the country view must stay fitted across a resize.
        // The zoom floor alone will not do it: a shorter viewport *lowers* the
        // floor, so the old zoom stays legal and the country gets cropped.
        // Anything zoomed in past the fit — a selected route, a run — is left
        // where the player put it.
        const wasAtCountryView = Math.abs(this.zoomLevel - this.minZoomForBounds()) < 1e-6;

        this.viewportWidth = Math.max(1, width);
        this.viewportHeight = Math.max(1, height);

        if (wasAtCountryView) this.applyTarget(this.countryViewTarget());
        else this.constrain();

        this.onChange();
    }

    /** World units -> screen pixels (CSS px, origin at the canvas top-left). */
    projectWorldX(x: number): number {
        return (x - this.centerX) * this.worldSize + this.viewportWidth / 2;
    }

    projectWorldY(y: number): number {
        return (y - this.centerY) * this.worldSize + this.viewportHeight / 2;
    }

    projectLngLat(lon: number, lat: number): [number, number] {
        return [this.projectWorldX(projectLon(lon)), this.projectWorldY(projectLat(lat))];
    }

    /** Screen pixels -> lon/lat, for turning a pointer position into a place. */
    unprojectScreen(px: number, py: number): Coordinate {
        const worldX = (px - this.viewportWidth / 2) / this.worldSize + this.centerX;
        const worldY = (py - this.viewportHeight / 2) / this.worldSize + this.centerY;
        return [unprojectX(worldX), unprojectY(worldY)];
    }

    /**
     * The zoom at which `bounds` fits *inside* the padded viewport on both axes:
     * a contain fit, so the whole box is visible with slack on the longer axis.
     * The cover fit this replaced (`Math.max`) filled the screen by cropping
     * whichever axis had the surplus, which cut the country north and south.
     */
    private containZoomFor(bounds: Bounds, paddingRatio: number): number {
        const boundsWidth = Math.abs(projectLon(bounds.east) - projectLon(bounds.west));
        const boundsHeight = Math.abs(projectLat(bounds.south) - projectLat(bounds.north));
        if (boundsWidth <= 0 || boundsHeight <= 0) return Settings.minZoom;

        const padding = Math.min(this.viewportWidth, this.viewportHeight) * paddingRatio;
        const availableWidth = Math.max(1, this.viewportWidth - padding * 2);
        const availableHeight = Math.max(1, this.viewportHeight - padding * 2);

        // The largest worldSize at which the bounds still fit on both axes.
        const fittingWorld = Math.min(
            availableWidth / boundsWidth,
            availableHeight / boundsHeight
        );

        return Math.log2(fittingWorld / 512);
    }

    /**
     * The lowest zoom the camera may reach: the whole country on screen. Zooming
     * out past this would only add empty map, so it is the real floor regardless
     * of `Settings.minZoom`.
     */
    private minZoomForBounds(): number {
        const { bounds, paddingRatio } = Settings.countryView;
        return Math.max(Settings.minZoom, this.containZoomFor(bounds, paddingRatio));
    }

    /**
     * Centre and zoom that frame the whole country — the menu's resting camera.
     * The centre is the *projected* midpoint, not the mean of the latitudes:
     * Mercator stretches latitude, so the two are not the same point.
     */
    countryViewTarget(): CameraTarget {
        const { bounds } = Settings.countryView;
        const midY = (projectLat(bounds.north) + projectLat(bounds.south)) / 2;

        // Deliberately the floor rather than the raw contain fit, so a camera at
        // rest here compares equal to it (see `setViewport`).
        return {
            center: [(bounds.west + bounds.east) / 2, unprojectY(midY)],
            zoom: this.minZoomForBounds()
        };
    }

    /** Clamps zoom to the allowed range, then keeps the viewport inside `maxBounds`. */
    private constrain(): void {
        this.zoomLevel = clamp(this.zoomLevel, this.minZoomForBounds(), Settings.maxZoom);

        if (!this.bounds) return;

        const world = this.worldSize;
        const halfW = this.viewportWidth / 2 / world;
        const halfH = this.viewportHeight / 2 / world;

        const west = projectLon(this.bounds.west);
        const east = projectLon(this.bounds.east);
        // y grows south, so the northern edge is the smaller value.
        const north = projectLat(this.bounds.north);
        const south = projectLat(this.bounds.south);

        const minX = west + halfW;
        const maxX = east - halfW;
        const minY = north + halfH;
        const maxY = south - halfH;

        // When the viewport is larger than the bounds on an axis, there is no
        // valid range left: centre on the bounds rather than snapping to an edge.
        this.centerX = minX > maxX ? (west + east) / 2 : clamp(this.centerX, minX, maxX);
        this.centerY = minY > maxY ? (north + south) / 2 : clamp(this.centerY, minY, maxY);
    }

    private applyTarget(target: CameraTarget): void {
        if (target.center) {
            const [lon, lat] = target.center;
            if (Number.isFinite(lon) && Number.isFinite(lat)) {
                this.centerX = projectLon(lon);
                this.centerY = projectLat(lat);
            }
        }
        if (typeof target.zoom === 'number' && Number.isFinite(target.zoom)) {
            this.zoomLevel = target.zoom;
        }
        this.constrain();
    }

    stopTween(): void {
        this.activeTween?.kill();
        this.activeTween = null;
    }

    jumpTo(target: CameraTarget): void {
        this.stopTween();
        this.applyTarget(target);
        this.onChange();
    }

    /** Pans by a screen-pixel delta; used by the drag handler. */
    panBy(dxPixels: number, dyPixels: number): void {
        this.stopTween();
        const world = this.worldSize;
        this.centerX -= dxPixels / world;
        this.centerY -= dyPixels / world;
        this.constrain();
        this.onChange();
    }

    /**
     * Zooms by a delta while holding the world point under the pointer fixed, so
     * the map scales around the cursor rather than the viewport centre.
     */
    zoomBy(delta: number, anchorX: number, anchorY: number): void {
        this.stopTween();

        const before = this.worldSize;
        const anchorWorldX = (anchorX - this.viewportWidth / 2) / before + this.centerX;
        const anchorWorldY = (anchorY - this.viewportHeight / 2) / before + this.centerY;

        this.zoomLevel = clamp(this.zoomLevel + delta, this.minZoomForBounds(), Settings.maxZoom);

        const after = this.worldSize;
        this.centerX = anchorWorldX - (anchorX - this.viewportWidth / 2) / after;
        this.centerY = anchorWorldY - (anchorY - this.viewportHeight / 2) / after;

        this.constrain();
        this.onChange();
    }

    /**
     * Eased move, standing in for MapLibre's `flyTo` / `easeTo`. Tweening the
     * *projected* centre rather than lon/lat keeps the motion linear on screen;
     * tweening latitude directly would drift as Mercator stretches toward the poles.
     */
    easeTo(target: CameraTarget, durationMs: number, ease = 'power2.out'): void {
        this.stopTween();

        const from = { x: this.centerX, y: this.centerY, zoom: this.zoomLevel };
        const to = { x: this.centerX, y: this.centerY, zoom: this.zoomLevel };

        if (target.center) {
            const [lon, lat] = target.center;
            if (Number.isFinite(lon) && Number.isFinite(lat)) {
                to.x = projectLon(lon);
                to.y = projectLat(lat);
            }
        }
        if (typeof target.zoom === 'number' && Number.isFinite(target.zoom)) {
            to.zoom = clamp(target.zoom, this.minZoomForBounds(), Settings.maxZoom);
        }

        if (durationMs <= 0) {
            this.jumpTo(target);
            return;
        }

        this.activeTween = gsap.to(from, {
            x: to.x,
            y: to.y,
            zoom: to.zoom,
            duration: durationMs / 1000,
            ease,
            onUpdate: () => {
                this.centerX = from.x;
                this.centerY = from.y;
                this.zoomLevel = from.zoom;
                this.constrain();
                this.onChange();
            },
            onComplete: () => {
                this.activeTween = null;
            }
        });
    }
}

export { MapCamera };
