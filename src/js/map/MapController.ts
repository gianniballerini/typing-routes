import type { FeatureCollection, Geometry, Position } from 'geojson';
import { MouseInfoCard } from '../MouseInfoCard';
import { Settings } from '../Settings';
import { decodeBorder, loadBorderBuffer } from './BorderStore';
import { MapCamera } from './MapCamera';
import type { CityFeature, PickResult, RouteFeature } from './MapFeatures';
import { MapRenderer, type HoverRingState, type ProgressMarkerState } from './MapRenderer';
import { interpolateByZoom, projectLat, projectLon } from './MercatorProjection';
import { PickBuffer } from './PickBuffer';

const DRAG_THRESHOLD_PX = 4;
const ZOOM_PER_WHEEL_LINE = 0.0025;

/**
 * Owns the map canvas: camera, rendering, hit testing and pointer interaction.
 *
 * Replaces the MapLibre GL instance this class used to wrap. The public API is
 * deliberately unchanged — `GameFlowCoordinator`, `MapRouteCursor`,
 * `KeyboardInputCoordinator` and `DebugPaneController` all talk to it exactly as
 * they did, including the DOM `CustomEvent`s dispatched on the canvas.
 *
 * Interaction is driven off a single pick buffer rather than per-layer queries, so
 * the "is the pointer on a city or the route underneath it?" priority that the
 * MapLibre version resolved with a second `queryRenderedFeatures` is now just
 * draw order.
 */
class MapController {
    private readonly canvas: HTMLCanvasElement;
    private readonly camera: MapCamera;
    private readonly renderer: MapRenderer;
    private readonly pickBuffer: PickBuffer;

    private routes: RouteFeature[];
    private cities: CityFeature[];
    private routeById: Map<string, RouteFeature>;
    private cityById: Map<string, CityFeature>;

    private ready: boolean;
    private pendingCallbacks: Array<() => void>;
    private selectedId: string | null;
    private hoveredRouteId: string | null;
    private hoveredCityId: string | null;
    private routeCityIdsMap: { [key: string]: string[] };
    private cityRoutesMap: { [key: string]: Array<{ id: string; displayName: string }> };
    private selectedRouteCityIds: string[];
    private mouseInfoCard: MouseInfoCard | null;

    private marker: ProgressMarkerState;
    private hoverRing: HoverRingState;
    private hoverPulseStartedAtMs: number;

    private frameHandle: number | null;
    private needsRender: boolean;
    private showHitboxes: boolean;

    private dragging: boolean;
    private dragMoved: boolean;
    private lastPointerX: number;
    private lastPointerY: number;
    private pendingPointer: { x: number; y: number } | null;

    constructor() {
        const container = document.getElementById('map');
        if (!(container instanceof HTMLCanvasElement)) {
            throw new Error('Missing #map canvas element');
        }
        this.canvas = container;

        this.routes = [];
        this.cities = [];
        this.routeById = new Map();
        this.cityById = new Map();

        this.ready = false;
        this.pendingCallbacks = [];
        this.selectedId = null;
        this.hoveredRouteId = null;
        this.hoveredCityId = null;
        this.routeCityIdsMap = {};
        this.cityRoutesMap = {};
        this.selectedRouteCityIds = [];
        this.mouseInfoCard = null;

        this.marker = { x: 0, y: 0, visible: false, bearing: 0 };
        this.hoverRing = { cityId: null, radius: 0, strokeOpacity: 0 };
        this.hoverPulseStartedAtMs = 0;

        this.frameHandle = null;
        this.needsRender = true;
        this.showHitboxes = Settings.routeLine.hitboxDebug.visible;

        this.dragging = false;
        this.dragMoved = false;
        this.lastPointerX = 0;
        this.lastPointerY = 0;
        this.pendingPointer = null;

        this.camera = new MapCamera(() => this.invalidate());
        this.renderer = new MapRenderer(this.canvas);
        this.pickBuffer = new PickBuffer();
    }

    init(): void {
        this.handleResize();
        window.addEventListener('resize', this.handleResize);

        this.canvas.addEventListener('pointerdown', this.handlePointerDown);
        this.canvas.addEventListener('pointermove', this.handlePointerMove);
        this.canvas.addEventListener('pointerup', this.handlePointerUp);
        this.canvas.addEventListener('pointerleave', this.handlePointerLeave);
        this.canvas.addEventListener('wheel', this.handleWheel, { passive: false });

        this.startLoop();

        // The border is decoration: a failure to fetch it must not keep the app
        // on the loading screen, so readiness does not wait on it.
        void loadBorderBuffer()
            .then((buffer) => {
                this.renderer.setBorder(decodeBorder(buffer));
                this.invalidate();
            })
            .catch(() => { /* map simply renders without the outline */ });

        this.ready = true;
        const callbacks = this.pendingCallbacks;
        this.pendingCallbacks = [];
        callbacks.forEach((cb) => cb());
    }

    onReady(cb: () => void): void {
        if (this.ready) cb();
        else this.pendingCallbacks.push(cb);
    }

    // --- event surface -----------------------------------------------------

    addEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
        this.canvas.addEventListener(type, listener);
    }

    removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
        this.canvas.removeEventListener(type, listener);
    }

    // `fromMapInteraction` separates a click on the canvas from a programmatic
    // selection (the route list picking a route for the player); only the former
    // deserves a click sound.
    private emitRouteSelected(routeId: string | null, fromMapInteraction: boolean): void {
        this.canvas.dispatchEvent(new CustomEvent('route-selected', {
            detail: { routeId, fromMapInteraction }
        }));
    }

    private emitCitySelected(cityId: string, cityName: string): void {
        const connectedRoutes = this.cityRoutesMap[cityId] ?? [];
        this.canvas.dispatchEvent(new CustomEvent('city-selected', {
            detail: {
                cityId,
                cityName,
                routeIds: connectedRoutes.map((route) => route.id),
                routeDisplayNames: connectedRoutes.map((route) => route.displayName)
            }
        }));
    }

    // --- wiring ------------------------------------------------------------

    setMouseInfoCard(mouseInfoCard: MouseInfoCard): void {
        this.mouseInfoCard = mouseInfoCard;
    }

    setRouteCityIdsMap(routeCityIdsMap: { [key: string]: string[] }): void {
        this.routeCityIdsMap = routeCityIdsMap;
    }

    setCityRoutesMap(cityRoutesMap: { [key: string]: Array<{ id: string; displayName: string }> }): void {
        this.cityRoutesMap = cityRoutesMap;
    }

    setHitboxVisibility(visible: boolean): void {
        this.showHitboxes = visible;
        this.invalidate();
    }

    // --- ingest ------------------------------------------------------------

    private projectGeometry(geometry: Geometry | undefined): {
        parts: Float64Array[];
        minX: number; minY: number; maxX: number; maxY: number;
    } | null {
        if (!geometry) return null;

        const lines: Position[][] = geometry.type === 'LineString'
            ? [geometry.coordinates]
            : geometry.type === 'MultiLineString'
                ? geometry.coordinates
                : [];
        if (lines.length === 0) return null;

        const parts: Float64Array[] = [];
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        for (const line of lines) {
            if (line.length < 2) continue;
            const part = new Float64Array(line.length * 2);
            for (let i = 0; i < line.length; i += 1) {
                const x = projectLon(Number(line[i][0]));
                const y = projectLat(Number(line[i][1]));
                part[i * 2] = x;
                part[i * 2 + 1] = y;
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
            parts.push(part);
        }

        if (parts.length === 0) return null;
        return { parts, minX, minY, maxX, maxY };
    }

    renderRoutes(fc: FeatureCollection): void {
        this.onReady(() => {
            this.routes = [];
            this.routeById.clear();

            for (const feature of fc.features) {
                const props = (feature.properties ?? {}) as Record<string, unknown>;
                const id = String(props.id ?? feature.id ?? '');
                if (!id) continue;

                const projected = this.projectGeometry(feature.geometry);
                if (!projected) continue;

                const route: RouteFeature = {
                    id,
                    parts: projected.parts,
                    minX: projected.minX,
                    minY: projected.minY,
                    maxX: projected.maxX,
                    maxY: projected.maxY,
                    properties: {
                        routeDisplay: String(props.route_display ?? props.name ?? ''),
                        name: String(props.name ?? ''),
                        citiesCount: Number(props.cities_count ?? 0),
                        visited: Boolean(props.visited),
                        stars: Number(props.stars ?? 0)
                    },
                    hovered: id === this.hoveredRouteId,
                    selected: id === this.selectedId
                };
                this.routes.push(route);
                this.routeById.set(id, route);
            }

            this.pickBuffer.setRoutes(this.routes);
            this.invalidate();
        });
    }

    /**
     * Refreshes route paint state (visited, stars) without reprojecting.
     *
     * The old implementation had to hand MapLibre a whole replacement
     * `FeatureCollection` for this; here only the properties that changed move.
     */
    updateRoutes(fc: FeatureCollection): void {
        this.onReady(() => {
            let geometryChanged = false;

            for (const feature of fc.features) {
                const props = (feature.properties ?? {}) as Record<string, unknown>;
                const id = String(props.id ?? feature.id ?? '');
                const route = this.routeById.get(id);
                if (!route) { geometryChanged = true; continue; }

                route.properties.visited = Boolean(props.visited);
                route.properties.stars = Number(props.stars ?? 0);
                route.properties.citiesCount = Number(props.cities_count ?? route.properties.citiesCount);
            }

            // A route we have never seen means the set itself changed, not just its
            // paint state, so fall back to a full rebuild.
            if (geometryChanged) {
                this.renderRoutes(fc);
                return;
            }

            this.invalidate();
        });
    }

    renderCities(fc: FeatureCollection): void {
        this.onReady(() => {
            this.cities = [];
            this.cityById.clear();

            for (const feature of fc.features) {
                const props = (feature.properties ?? {}) as Record<string, unknown>;
                const id = String(props.id ?? feature.id ?? '');
                if (!id || feature.geometry?.type !== 'Point') continue;

                const [lon, lat] = feature.geometry.coordinates;
                const city: CityFeature = {
                    id,
                    x: projectLon(Number(lon)),
                    y: projectLat(Number(lat)),
                    properties: {
                        name: String(props.name ?? ''),
                        visited: Boolean(props.visited),
                        tier: String(props.tier ?? '')
                    },
                    selected: false
                };
                this.cities.push(city);
                this.cityById.set(id, city);
            }

            this.applySelectedRouteCitiesState();
            this.pickBuffer.setCities(this.cities);
            this.invalidate();
        });
    }

    updateCities(fc: FeatureCollection): void {
        this.onReady(() => {
            let unknown = false;

            for (const feature of fc.features) {
                const props = (feature.properties ?? {}) as Record<string, unknown>;
                const id = String(props.id ?? feature.id ?? '');
                const city = this.cityById.get(id);
                if (!city) { unknown = true; continue; }
                city.properties.visited = Boolean(props.visited);
            }

            if (unknown) {
                this.renderCities(fc);
                return;
            }

            this.applySelectedRouteCitiesState();
            this.invalidate();
        });
    }

    /**
     * Per-city paint update.
     *
     * Was a no-op under MapLibre, whose `GeoJSONSource` had no per-feature patch
     * API and required a full `setData`; on a canvas it is a state flip.
     */
    setCityVisited(cityId: string, visited: boolean): void {
        const city = this.cityById.get(cityId);
        if (!city) return;
        city.properties.visited = visited;
        this.invalidate();
    }

    // --- selection ---------------------------------------------------------

    private clearSelectedRouteCitiesState(): void {
        for (const cityId of this.selectedRouteCityIds) {
            const city = this.cityById.get(cityId);
            if (city) city.selected = false;
        }
        this.selectedRouteCityIds = [];
    }

    private applySelectedRouteCitiesState(): void {
        this.clearSelectedRouteCitiesState();
        if (this.selectedId === null) return;

        const cityIds = this.routeCityIdsMap[this.selectedId] ?? [];
        for (const cityId of cityIds) {
            const city = this.cityById.get(cityId);
            if (city) city.selected = true;
        }
        this.selectedRouteCityIds = [...cityIds];
    }

    selectRoute(routeId: string | number | null, fromMapInteraction = false): void {
        const nextId = routeId === null ? null : String(routeId);

        if (this.selectedId !== null) {
            const previous = this.routeById.get(this.selectedId);
            if (previous) previous.selected = false;
        }

        this.selectedId = nextId;

        if (nextId !== null) {
            const route = this.routeById.get(nextId);
            if (route) route.selected = true;
        }

        this.applySelectedRouteCitiesState();
        this.invalidate();
        this.emitRouteSelected(nextId, fromMapInteraction);
    }

    getSelectedRouteId(): string | null {
        return this.selectedId;
    }

    // --- progress marker ---------------------------------------------------

    setProgressMarkerCoordinate(coordinates: [number, number], visible = true, bearing?: number): void {
        const [lon, lat] = coordinates;
        if (!Number.isFinite(lon) || !Number.isFinite(lat)) return;

        // Keep the last known heading when the caller has no direction to report.
        if (typeof bearing === 'number' && Number.isFinite(bearing)) {
            this.marker.bearing = bearing;
        }

        this.marker.x = projectLon(lon);
        this.marker.y = projectLat(lat);
        this.marker.visible = visible;
        this.invalidate();
    }

    hideProgressMarker(): void {
        this.marker.visible = false;
        this.invalidate();
    }

    // --- camera ------------------------------------------------------------

    flyToCoordinate(center: [number, number], zoom?: number): void {
        this.onReady(() => {
            if (!Array.isArray(center) || center.length !== 2) return;
            const [lon, lat] = center;
            if (!Number.isFinite(lon) || !Number.isFinite(lat)) return;
            this.camera.easeTo({ center, ...(typeof zoom === 'number' ? { zoom } : {}) }, 1200, 'power2.inOut');
        });
    }

    jumpToCoordinate(center: [number, number], zoom?: number): void {
        this.onReady(() => {
            if (!Array.isArray(center) || center.length !== 2) return;
            const [lon, lat] = center;
            if (!Number.isFinite(lon) || !Number.isFinite(lat)) return;
            this.camera.easeTo({ center, ...(typeof zoom === 'number' ? { zoom } : {}) }, 180, 'none');
        });
    }

    resetToCountryView(): void {
        this.onReady(() => {
            this.camera.easeTo(
                { center: [Settings.center[0], Settings.center[1]], zoom: Settings.initialZoom },
                280,
                'power2.out'
            );
        });
    }

    // --- render loop -------------------------------------------------------

    private invalidate(): void {
        this.needsRender = true;
        this.pickBuffer.invalidate();
    }

    private handleResize = (): void => {
        const { width, height } = this.renderer.resize();
        this.camera.setViewport(width, height);
        this.invalidate();
    };

    private startLoop(): void {
        if (this.frameHandle !== null) return;
        const frame = () => {
            this.tick();
            this.frameHandle = requestAnimationFrame(frame);
        };
        this.frameHandle = requestAnimationFrame(frame);
    }

    private prefersReducedMotion(): boolean {
        return typeof window.matchMedia === 'function'
            && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    private updateHoverRing(): void {
        if (this.hoveredCityId === null) {
            if (this.hoverRing.cityId !== null) {
                this.hoverRing = { cityId: null, radius: 0, strokeOpacity: 0 };
                this.needsRender = true;
            }
            return;
        }

        const ring = Settings.cityCircle.hoverRing;
        const baseRadius = interpolateByZoom(
            this.camera.zoom,
            Settings.cityCircle.hitRadiusByZoom.minZoom,
            Settings.cityCircle.hitRadiusByZoom.minRadius,
            Settings.cityCircle.hitRadiusByZoom.maxZoom,
            Settings.cityCircle.hitRadiusByZoom.maxRadius
        );

        // A still ring still answers "which dot is this?", so reduced motion
        // loses the animation and nothing else.
        if (this.prefersReducedMotion()) {
            this.hoverRing = {
                cityId: this.hoveredCityId,
                radius: baseRadius,
                strokeOpacity: ring.maxOpacity
            };
            return;
        }

        const elapsed = performance.now() - this.hoverPulseStartedAtMs;
        const phase = (elapsed % ring.periodMs) / ring.periodMs;
        // Cosine ease, so the ripple has no seam where the period wraps.
        const pulse = (1 - Math.cos(phase * 2 * Math.PI)) / 2;

        this.hoverRing = {
            cityId: this.hoveredCityId,
            radius: baseRadius + ring.growthPx * pulse,
            strokeOpacity: ring.maxOpacity - (ring.maxOpacity - ring.minOpacity) * pulse
        };
        this.needsRender = true;
    }

    private tick(): void {
        // Hit testing is resolved once per frame rather than per pointer event:
        // a raw mousemove stream can fire far faster than the display, and each
        // test is a canvas read.
        if (this.pendingPointer) {
            const { x, y } = this.pendingPointer;
            this.pendingPointer = null;
            this.pickBuffer.redrawIfNeeded(this.camera);
            this.resolveHover(x, y);
        }

        this.updateHoverRing();

        if (!this.needsRender) return;
        this.needsRender = false;

        this.pickBuffer.redrawIfNeeded(this.camera);
        this.renderer.draw(
            this.camera,
            this.routes,
            this.cities,
            this.hoverRing,
            this.marker,
            this.showHitboxes ? this.pickBuffer.getCanvas() : null
        );
    }

    // --- interaction -------------------------------------------------------

    private localPoint(event: PointerEvent | WheelEvent): { x: number; y: number } {
        const rect = this.canvas.getBoundingClientRect();
        return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }

    private buildConnectedRoutesTooltip(routeDisplayNames: string[]): string {
        if (routeDisplayNames.length === 0) return 'Sin rutas conectadas';
        if (routeDisplayNames.length <= 3) return `Conecta con ${routeDisplayNames.join(', ')}`;

        const maxVisible = 3;
        const visibleRoutes = routeDisplayNames.slice(0, maxVisible).join(', ');
        return `Conecta con ${visibleRoutes} +${routeDisplayNames.length - maxVisible}`;
    }

    private resolveHover(x: number, y: number): void {
        const hit = this.pickBuffer.pick(x, y);

        const nextRouteId = hit?.kind === 'route' ? hit.id : null;
        const nextCityId = hit?.kind === 'city' ? hit.id : null;

        if (nextRouteId !== this.hoveredRouteId) {
            if (this.hoveredRouteId) {
                const previous = this.routeById.get(this.hoveredRouteId);
                if (previous) previous.hovered = false;
            }
            this.hoveredRouteId = nextRouteId;
            if (nextRouteId) {
                const route = this.routeById.get(nextRouteId);
                if (route) route.hovered = true;
            }
            this.needsRender = true;
        }

        if (nextCityId !== this.hoveredCityId) {
            this.hoveredCityId = nextCityId;
            this.hoverPulseStartedAtMs = performance.now();
            this.needsRender = true;
        }

        this.canvas.style.cursor = hit ? 'pointer' : '';

        if (!this.mouseInfoCard) return;

        if (nextCityId) {
            const city = this.cityById.get(nextCityId);
            if (!city || !city.properties.name) return;
            const names = (this.cityRoutesMap[nextCityId] ?? []).map((route) => route.displayName);
            this.mouseInfoCard.show(
                city.properties.name,
                this.buildConnectedRoutesTooltip(names),
                'city',
                x + 10,
                y + 10
            );
            return;
        }

        if (nextRouteId) {
            const route = this.routeById.get(nextRouteId);
            if (!route) return;
            const count = route.properties.citiesCount;
            this.mouseInfoCard.show(
                route.properties.routeDisplay,
                `${count} ${count === 1 ? 'ciudad' : 'ciudades'}`,
                'route',
                x + 10,
                y + 10
            );
            return;
        }

        this.mouseInfoCard.hide();
    }

    private handlePointerDown = (event: PointerEvent): void => {
        if (event.button !== 0) return;
        const { x, y } = this.localPoint(event);
        this.dragging = true;
        this.dragMoved = false;
        this.lastPointerX = x;
        this.lastPointerY = y;
        this.canvas.setPointerCapture(event.pointerId);
    };

    private handlePointerMove = (event: PointerEvent): void => {
        const { x, y } = this.localPoint(event);

        if (this.dragging) {
            const dx = x - this.lastPointerX;
            const dy = y - this.lastPointerY;
            if (!this.dragMoved && Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) this.dragMoved = true;
            if (this.dragMoved) {
                this.camera.panBy(dx, dy);
                this.lastPointerX = x;
                this.lastPointerY = y;
                this.mouseInfoCard?.hide();
            }
            return;
        }

        // Deferred to the next frame; see `tick`.
        this.pendingPointer = { x, y };
        if (this.hoveredCityId !== null) this.mouseInfoCard?.moveTo(x + 10, y + 10);
    };

    private handlePointerUp = (event: PointerEvent): void => {
        if (this.canvas.hasPointerCapture(event.pointerId)) {
            this.canvas.releasePointerCapture(event.pointerId);
        }

        const wasDragging = this.dragging;
        const moved = this.dragMoved;
        this.dragging = false;
        this.dragMoved = false;

        // A pan should never also select whatever happened to be under the cursor
        // when the drag ended.
        if (!wasDragging || moved) return;

        const { x, y } = this.localPoint(event);
        this.pickBuffer.redrawIfNeeded(this.camera);
        const hit: PickResult | null = this.pickBuffer.pick(x, y);

        if (hit?.kind === 'city') {
            const city = this.cityById.get(hit.id);
            if (city && city.properties.name) this.emitCitySelected(hit.id, city.properties.name);
            return;
        }

        if (hit?.kind === 'route') {
            this.selectRoute(this.selectedId === hit.id ? null : hit.id, true);
            return;
        }

        if (this.selectedId !== null) this.selectRoute(null, true);
    };

    private handlePointerLeave = (): void => {
        this.pendingPointer = null;

        if (this.hoveredRouteId) {
            const route = this.routeById.get(this.hoveredRouteId);
            if (route) route.hovered = false;
            this.hoveredRouteId = null;
        }
        this.hoveredCityId = null;
        this.canvas.style.cursor = '';
        this.mouseInfoCard?.hide();
        this.needsRender = true;
    };

    private handleWheel = (event: WheelEvent): void => {
        event.preventDefault();
        const { x, y } = this.localPoint(event);
        // deltaMode 1 is lines rather than pixels; normalise so a notch feels the same.
        const pixels = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
        this.camera.zoomBy(-pixels * ZOOM_PER_WHEEL_LINE, x, y);
        this.pendingPointer = { x, y };
    };
}

export { MapController };
