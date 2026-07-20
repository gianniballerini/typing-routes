import type { FeatureCollection } from 'geojson';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MouseInfoCard } from './MouseInfoCard';
import { Settings } from './Settings';

type ProgressMarkerFeatureCollection = {
    type: 'FeatureCollection';
    features: Array<{
        type: 'Feature';
        geometry: {
            type: 'Point';
            coordinates: [number, number];
        };
        properties: {
            visible: boolean;
        };
    }>;
};

class MapController {
    map: maplibregl.Map;
    private ready: boolean;
    private pendingCallbacks: Array<() => void>;
    private hoveredId: string | number | null;
    private selectedId: string | number | null;
    private routeCityIdsMap: { [key: string]: string[] };
    private selectedRouteCityIds: string[];
    private mouseInfoCard: MouseInfoCard | null;

    constructor() {
        this.ready = false;
        this.pendingCallbacks = [];
        this.hoveredId = null;
        this.selectedId = null;
        this.routeCityIdsMap = {};
        this.selectedRouteCityIds = [];
        this.mouseInfoCard = null;
        this.map = new maplibregl.Map({
            container: 'map', // container id
            // style: 'https://demotiles.maplibre.org/globe.json', // style URL
            style: {
                "version": 8,
                "sources": {},
                "layers": []
            },
            center: Settings.center as [number, number],
            zoom: Settings.initialZoom,
            maxZoom: Settings.maxZoom,
            minZoom: Settings.minZoom,
            maxBounds: Settings.maxBounds as [[number, number], [number, number]]
        });
    }

    init() {
        this.map.on('load', () => {
            this.ready = true;
            this.pendingCallbacks.forEach((cb) => cb());
            this.pendingCallbacks = [];

            this.onReady(() => {
                this.map.addSource(Settings.sourceIds.openmaptiles, {
                    type: 'vector',
                    url: 'https://demotiles.maplibre.org/tiles/tiles.json'
                });

                this.map.addLayer({
                    'id': Settings.layerIds.argentinaLimits,
                    'type': 'line',
                    'source': Settings.sourceIds.openmaptiles,
                    'source-layer': 'countries',
                    'filter': ['==', 'ADM0_A3', 'ARG'],
                    'paint': {
                        'line-color': Settings.argentinaBorder.color,
                        'line-width': Settings.argentinaBorder.width
                    }
                });
            });
        });
    }

    onReady(cb: () => void) {
        if (this.ready) cb();
        else this.pendingCallbacks.push(cb);
    }

    setMouseInfoCard(mouseInfoCard: MouseInfoCard) {
        this.mouseInfoCard = mouseInfoCard;
    }

    setRouteCityIdsMap(routeCityIdsMap: { [key: string]: string[] }) {
        this.routeCityIdsMap = routeCityIdsMap;
    }

    addEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
        this.map.getCanvas().addEventListener(type, listener);
    }

    removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
        this.map.getCanvas().removeEventListener(type, listener);
    }

    private emitRouteSelected(routeId: string | null): void {
        this.map.getCanvas().dispatchEvent(new CustomEvent('route-selected', {
            detail: { routeId }
        }));
    }

    private clearSelectedRouteCitiesFeatureState() {
        for (const cityId of this.selectedRouteCityIds) {
            this.map.setFeatureState(
                { source: Settings.sourceIds.cities, id: cityId },
                { selected: false }
            );
        }
        this.selectedRouteCityIds = [];
    }

    private applySelectedRouteCitiesFeatureState() {
        if (this.selectedId === null) return;

        const selectedRouteId = String(this.selectedId);
        const cityIds = this.routeCityIdsMap[selectedRouteId] ?? [];

        for (const cityId of cityIds) {
            this.map.setFeatureState(
                { source: Settings.sourceIds.cities, id: cityId },
                { selected: true }
            );
        }

        this.selectedRouteCityIds = [...cityIds];
    }

    renderRoutes(fc: FeatureCollection) {
        this.onReady(() => {
            this.map.addSource(Settings.sourceIds.nationalRoutes, {
                type: 'geojson',
                data: fc,
                promoteId: 'id'
            });
            this.map.addLayer({
                id: Settings.layerIds.nationalRoutesLine,
                type: 'line',
                source: Settings.sourceIds.nationalRoutes,
                paint: {
                    'line-color': [
                        'case',
                        ['boolean', ['feature-state', 'selected'], false], Settings.routeLine.colors.selected,
                        ['boolean', ['feature-state', 'hovered'], false], Settings.routeLine.colors.hovered,
                        ['get', 'visited'], Settings.routeLine.colors.visited,
                        Settings.routeLine.colors.default
                    ],
                    'line-width': [
                        'interpolate', ['linear'], ['zoom'],
                        Settings.routeLine.widthByZoom.minZoom, Settings.routeLine.widthByZoom.minWidth,
                        Settings.routeLine.widthByZoom.maxZoom, Settings.routeLine.widthByZoom.maxWidth
                    ],
                    'line-opacity': Settings.routeLine.opacity
                }
            });

            this.map.on('mousemove', Settings.layerIds.nationalRoutesLine, (e) => {
                if (!e.features || e.features.length === 0) return;
                const feature = e.features[0];
                const properties = feature.properties as { route_display?: string; name?: string; cities_count?: number } | undefined;
                const nextHoveredId = feature.id ?? null;

                if (this.hoveredId !== nextHoveredId) {
                    if (this.hoveredId !== null) {
                        this.map.setFeatureState({ source: Settings.sourceIds.nationalRoutes, id: this.hoveredId }, { hovered: false });
                    }
                    this.hoveredId = nextHoveredId;
                    if (this.hoveredId !== null) {
                        this.map.setFeatureState({ source: Settings.sourceIds.nationalRoutes, id: this.hoveredId }, { hovered: true });
                    }

                    if (this.hoveredId !== null && this.mouseInfoCard) {
                        const routeName = String(properties?.route_display ?? properties?.name ?? '');
                        const citiesCount = Number(properties?.cities_count ?? 0);
                        this.mouseInfoCard.show(routeName, `${citiesCount} ${citiesCount === 1 ? 'ciudad' : 'ciudades'}`);
                    }
                }

                this.mouseInfoCard?.moveTo(e.point.x, e.point.y);
                this.map.getCanvas().style.cursor = 'pointer';
            });

            this.map.on('mouseleave', Settings.layerIds.nationalRoutesLine, () => {
                if (this.hoveredId !== null) {
                    this.map.setFeatureState({ source: Settings.sourceIds.nationalRoutes, id: this.hoveredId }, { hovered: false });
                }
                this.hoveredId = null;
                this.mouseInfoCard?.hide();
                this.map.getCanvas().style.cursor = '';
            });

            this.map.on('click', Settings.layerIds.nationalRoutesLine, (e) => {
                if (!e.features || e.features.length === 0) return;
                const clickedId = e.features[0].id ?? null;
                this.selectRoute(this.selectedId === clickedId ? null : clickedId);
            });

            this.map.on('click', (e) => {
                const routeFeatures = this.map.queryRenderedFeatures(e.point, {
                    layers: [Settings.layerIds.nationalRoutesLine]
                });

                if (routeFeatures.length > 0) return;
                if (this.selectedId === null) return;

                this.selectRoute(null);
            });
        });
    }

    selectRoute(routeId: string | number | null) {
        if (this.selectedId !== null) {
            this.map.setFeatureState({ source: Settings.sourceIds.nationalRoutes, id: this.selectedId }, { selected: false });
        }

        this.clearSelectedRouteCitiesFeatureState();

        this.selectedId = routeId;
        if (routeId !== null) {
            this.map.setFeatureState({ source: Settings.sourceIds.nationalRoutes, id: routeId }, { selected: true });
            this.applySelectedRouteCitiesFeatureState();
        }

        this.emitRouteSelected(routeId === null ? null : String(routeId));
    }

    getSelectedRouteId(): string | null {
        if (this.selectedId === null) return null;
        return String(this.selectedId);
    }

    renderCities(fc: FeatureCollection) {
        this.onReady(() => {
            this.map.addSource(Settings.sourceIds.cities, {
                type: 'geojson',
                data: fc,
                promoteId: 'id'
            });
            this.map.addLayer({
                id: Settings.layerIds.citiesCircle,
                type: 'circle',
                source: Settings.sourceIds.cities,
                paint: {
                    'circle-radius': [
                        'interpolate', ['linear'], ['zoom'],
                        Settings.cityCircle.radiusByZoom.minZoom, Settings.cityCircle.radiusByZoom.minRadius,
                        Settings.cityCircle.radiusByZoom.maxZoom, Settings.cityCircle.radiusByZoom.maxRadius
                    ],
                    'circle-color': [
                        'case',
                        ['boolean', ['feature-state', 'selected'], false], Settings.cityCircle.colors.selected,
                        ['get', 'visited'], Settings.cityCircle.colors.visited,
                        Settings.cityCircle.colors.default
                    ],
                    'circle-stroke-width': Settings.cityCircle.stroke.width,
                    'circle-stroke-color': Settings.cityCircle.stroke.color
                }
            });

            this.renderProgressMarker();
        });
    }

    private createProgressMarkerData(coordinates: [number, number], visible: boolean): ProgressMarkerFeatureCollection {
        return {
            type: 'FeatureCollection',
            features: [
                {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates
                    },
                    properties: {
                        visible
                    }
                }
            ]
        };
    }

    private renderProgressMarker(): void {
        if (this.map.getSource(Settings.sourceIds.progressMarker)) return;

        this.map.addSource(Settings.sourceIds.progressMarker, {
            type: 'geojson',
            data: this.createProgressMarkerData([Settings.center[0], Settings.center[1]], false)
        });

        this.map.addLayer({
            id: Settings.layerIds.progressMarkerSquare,
            type: 'circle',
            source: Settings.sourceIds.progressMarker,
            paint: {
                'circle-radius': Settings.progressMarker.size,
                'circle-color': Settings.progressMarker.color,
                'circle-opacity': [
                    'case',
                    ['get', 'visible'],
                    Settings.progressMarker.opacity,
                    0
                ],
                'circle-stroke-width': Settings.progressMarker.strokeWidth,
                'circle-stroke-color': Settings.progressMarker.strokeColor
            }
        });
    }

    setProgressMarkerCoordinate(coordinates: [number, number], visible = true): void {
        const source = this.map.getSource(Settings.sourceIds.progressMarker) as maplibregl.GeoJSONSource;
        if (!source) return;
        source.setData(this.createProgressMarkerData(coordinates, visible));
    }

    hideProgressMarker(): void {
        const source = this.map.getSource(Settings.sourceIds.progressMarker) as maplibregl.GeoJSONSource;
        if (!source) return;
        source.setData(this.createProgressMarkerData([Settings.center[0], Settings.center[1]], false));
    }

    updateCities(fc: FeatureCollection) {
        const source = this.map.getSource(Settings.sourceIds.cities) as maplibregl.GeoJSONSource;
        if (source) {
            source.setData(fc);
            // Keep selected-route city highlighting after source data refreshes.
            this.clearSelectedRouteCitiesFeatureState();
            this.applySelectedRouteCitiesFeatureState();
        }
    }

    updateRoutes(fc: FeatureCollection) {
        const source = this.map.getSource(Settings.sourceIds.nationalRoutes) as maplibregl.GeoJSONSource;
        if (source) source.setData(fc);
    }

    setCityVisited(cityId: string, visited: boolean) {
        const source = this.map.getSource(Settings.sourceIds.cities) as maplibregl.GeoJSONSource;
        if (!source) return;
        void cityId;
        void visited;
        // MapLibre GeoJSONSource has no per-feature patch API and requires setData
        // with a full FeatureCollection replacement. State ownership stays upstream.
    }

    flyToCoordinate(center: [number, number], zoom?: number): void {
        this.onReady(() => {
            if (!Array.isArray(center) || center.length !== 2) return;

            const [lon, lat] = center;
            if (!Number.isFinite(lon) || !Number.isFinite(lat)) return;

            this.map.flyTo({
                center: [lon, lat],
                ...(typeof zoom === 'number' ? { zoom } : {})
            });
        });
    }

    jumpToCoordinate(center: [number, number], zoom?: number): void {
        this.onReady(() => {
            if (!Array.isArray(center) || center.length !== 2) return;

            const [lon, lat] = center;
            if (!Number.isFinite(lon) || !Number.isFinite(lat)) return;

            this.map.easeTo({
                center: [lon, lat],
                ...(typeof zoom === 'number' ? { zoom } : {}),
                duration: 180
            });
        });
    }

    resetToCountryView(): void {
        this.onReady(() => {
            this.map.easeTo({
                center: [Settings.center[0], Settings.center[1]],
                zoom: Settings.initialZoom,
                duration: 280
            });
        });
    }
}

export { MapController };

