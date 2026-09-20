import { Settings } from '../Settings';
import type { MapCamera } from './MapCamera';
import type { CityFeature, PickResult, RouteFeature } from './MapFeatures';
import { interpolateByZoom } from './MercatorProjection';

// Ids are encoded as flat RGB. Routes and cities live in disjoint ranges so one
// pixel read identifies both which feature was hit and what kind it is.
const ROUTE_BASE = 0x010000;
const CITY_BASE = 0x400000;

const toColor = (key: number): string =>
    `rgb(${(key >> 16) & 255},${(key >> 8) & 255},${key & 255})`;

/**
 * Hit testing, as an offscreen canvas that paints every interactive feature in a
 * unique flat colour at its *hitbox* size. A pointer test is then one
 * `getImageData` of a single pixel.
 *
 * This reproduces what `queryRenderedFeatures` did against the old transparent
 * hitbox layers — including the deliberately fat targets (routes 8–18 px, cities
 * 7–13 px by zoom) — and the cities-over-routes priority falls out of draw order
 * for free, rather than needing the manual re-query the MapLibre version did.
 *
 * Two things this depends on:
 * - `willReadFrequently`, without which each read is a GPU readback stall.
 * - Drawing at 1x rather than device pixels. The targets are 8–18 px wide, so
 *   device pixels buy no accuracy and double the cost of every read.
 */
class PickBuffer {
    private readonly canvas: HTMLCanvasElement;
    private readonly ctx: CanvasRenderingContext2D | null;
    private routes: RouteFeature[];
    private cities: CityFeature[];
    private readonly idByKey: Map<number, PickResult>;
    private dirty: boolean;

    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d', { alpha: false, willReadFrequently: true });
        this.routes = [];
        this.cities = [];
        this.idByKey = new Map();
        this.dirty = true;
    }

    getCanvas(): HTMLCanvasElement {
        return this.canvas;
    }

    setRoutes(routes: RouteFeature[]): void {
        this.routes = routes;
        this.reindex();
        this.dirty = true;
    }

    setCities(cities: CityFeature[]): void {
        this.cities = cities;
        this.reindex();
        this.dirty = true;
    }

    invalidate(): void {
        this.dirty = true;
    }

    private reindex(): void {
        this.idByKey.clear();
        this.routes.forEach((route, index) => {
            this.idByKey.set(ROUTE_BASE + index, { kind: 'route', id: route.id });
        });
        this.cities.forEach((city, index) => {
            this.idByKey.set(CITY_BASE + index, { kind: 'city', id: city.id });
        });
    }

    private resize(width: number, height: number): boolean {
        const w = Math.max(1, Math.round(width));
        const h = Math.max(1, Math.round(height));
        if (this.canvas.width === w && this.canvas.height === h) return false;
        this.canvas.width = w;
        this.canvas.height = h;
        return true;
    }

    /** Repaints only when something actually changed; safe to call every frame. */
    redrawIfNeeded(camera: MapCamera): void {
        const ctx = this.ctx;
        if (!ctx) return;

        const resized = this.resize(camera.width, camera.height);
        if (!this.dirty && !resized) return;

        const { width, height } = this.canvas;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, width, height);

        const zoom = camera.zoom;

        const hitWidth = interpolateByZoom(
            zoom,
            Settings.routeLine.hitWidthByZoom.minZoom,
            Settings.routeLine.hitWidthByZoom.minWidth,
            Settings.routeLine.hitWidthByZoom.maxZoom,
            Settings.routeLine.hitWidthByZoom.maxWidth
        );

        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.lineWidth = hitWidth;

        this.routes.forEach((route, index) => {
            if (!this.isRouteVisible(route, camera)) return;
            ctx.strokeStyle = toColor(ROUTE_BASE + index);
            for (const part of route.parts) {
                ctx.beginPath();
                ctx.moveTo(camera.projectWorldX(part[0]), camera.projectWorldY(part[1]));
                for (let i = 2; i < part.length; i += 2) {
                    ctx.lineTo(camera.projectWorldX(part[i]), camera.projectWorldY(part[i + 1]));
                }
                ctx.stroke();
            }
        });

        // Cities last, so a dot on top of a line wins the pixel — the priority the
        // MapLibre version had to re-query for by hand.
        const hitRadius = interpolateByZoom(
            zoom,
            Settings.cityCircle.hitRadiusByZoom.minZoom,
            Settings.cityCircle.hitRadiusByZoom.minRadius,
            Settings.cityCircle.hitRadiusByZoom.maxZoom,
            Settings.cityCircle.hitRadiusByZoom.maxRadius
        );

        this.cities.forEach((city, index) => {
            const x = camera.projectWorldX(city.x);
            const y = camera.projectWorldY(city.y);
            if (x < -hitRadius || y < -hitRadius || x > width + hitRadius || y > height + hitRadius) return;
            ctx.fillStyle = toColor(CITY_BASE + index);
            ctx.beginPath();
            ctx.arc(x, y, hitRadius, 0, Math.PI * 2);
            ctx.fill();
        });

        this.dirty = false;
    }

    private isRouteVisible(route: RouteFeature, camera: MapCamera): boolean {
        const margin = 32;
        const x0 = camera.projectWorldX(route.minX);
        const x1 = camera.projectWorldX(route.maxX);
        const y0 = camera.projectWorldY(route.minY);
        const y1 = camera.projectWorldY(route.maxY);
        return !(
            x1 < -margin
            || y1 < -margin
            || x0 > camera.width + margin
            || y0 > camera.height + margin
        );
    }

    /** Returns the feature under a CSS-pixel position, or null for background. */
    pick(x: number, y: number): PickResult | null {
        const ctx = this.ctx;
        if (!ctx) return null;

        const px = Math.round(x);
        const py = Math.round(y);
        if (px < 0 || py < 0 || px >= this.canvas.width || py >= this.canvas.height) return null;

        const data = ctx.getImageData(px, py, 1, 1).data;
        const key = (data[0] << 16) | (data[1] << 8) | data[2];
        return this.idByKey.get(key) ?? null;
    }
}

export { PickBuffer };
