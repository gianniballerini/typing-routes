import type { FeatureCollection } from 'geojson';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MouseInfoCard } from './MouseInfoCard';
import { Settings } from './Settings';
import { createCarMarkerIcon } from './utils/CarMarkerIcon';

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
            bearing: number;
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
    private cityRoutesMap: { [key: string]: Array<{ id: string; displayName: string }> };
    private selectedRouteCityIds: string[];
    private mouseInfoCard: MouseInfoCard | null;
    private hoveredCityId: string | null;
    private progressMarkerBearing: number;

    constructor() {
        this.ready = false;
        this.pendingCallbacks = [];
        this.hoveredId = null;
        this.selectedId = null;
        this.routeCityIdsMap = {};
        this.cityRoutesMap = {};
        this.selectedRouteCityIds = [];
        this.mouseInfoCard = null;
        this.hoveredCityId = null;
        this.progressMarkerBearing = 0;
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

    setCityRoutesMap(cityRoutesMap: { [key: string]: Array<{ id: string; displayName: string }> }) {
        this.cityRoutesMap = cityRoutesMap;
    }

    setHitboxVisibility(visible: boolean): void {
        this.onReady(() => {
            const hasCityLayer = !!this.map.getLayer(Settings.layerIds.citiesCircleHitbox);
            if (hasCityLayer) {
                this.map.setPaintProperty(
                    Settings.layerIds.citiesCircleHitbox,
                    'circle-opacity',
                    visible ? Settings.cityCircle.hitboxDebug.opacity : 0.01
                );
                this.map.setPaintProperty(
                    Settings.layerIds.citiesCircleHitbox,
                    'circle-stroke-width',
                    visible ? Settings.cityCircle.hitboxDebug.strokeWidth : 0
                );
                this.map.setPaintProperty(
                    Settings.layerIds.citiesCircleHitbox,
                    'circle-stroke-opacity',
                    visible ? Settings.cityCircle.hitboxDebug.strokeOpacity : 0
                );
            }

            const hasRouteLayer = !!this.map.getLayer(Settings.layerIds.nationalRoutesHitbox);
            if (hasRouteLayer) {
                this.map.setPaintProperty(
                    Settings.layerIds.nationalRoutesHitbox,
                    'line-opacity',
                    visible ? Settings.routeLine.hitboxDebug.opacity : 0.01
                );
            }
        });
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

    private emitCitySelected(cityId: string, cityName: string): void {
        const connectedRoutes = this.cityRoutesMap[cityId] ?? [];
        this.map.getCanvas().dispatchEvent(new CustomEvent('city-selected', {
            detail: {
                cityId,
                cityName,
                routeIds: connectedRoutes.map((route) => route.id),
                routeDisplayNames: connectedRoutes.map((route) => route.displayName)
            }
        }));
    }

    private buildConnectedRoutesTooltip(routeDisplayNames: string[]): string {
        if (routeDisplayNames.length === 0) return 'Sin rutas conectadas';
        if (routeDisplayNames.length <= 3) return `Conecta con ${routeDisplayNames.join(', ')}`;

        const maxVisible = 3;
        const visibleRoutes = routeDisplayNames.slice(0, maxVisible).join(', ');
        const remainingCount = routeDisplayNames.length - maxVisible;
        return `Conecta con ${visibleRoutes} +${remainingCount}`;
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

            this.map.addLayer({
                id: Settings.layerIds.nationalRoutesHitbox,
                type: 'line',
                source: Settings.sourceIds.nationalRoutes,
                paint: {
                    'line-width': [
                        'interpolate', ['linear'], ['zoom'],
                        Settings.routeLine.hitWidthByZoom.minZoom, Settings.routeLine.hitWidthByZoom.minWidth,
                        Settings.routeLine.hitWidthByZoom.maxZoom, Settings.routeLine.hitWidthByZoom.maxWidth
                    ],
                    // Transparent interaction-only layer to make route hover/click easier.
                    'line-color': Settings.routeLine.hitboxDebug.color,
                    'line-opacity': Settings.routeLine.hitboxDebug.visible
                        ? Settings.routeLine.hitboxDebug.opacity
                        : 0.01
                }
            });

            this.map.on('mousemove', Settings.layerIds.nationalRoutesHitbox, (e) => {
                if (!e.features || e.features.length === 0) return;

                const hasCitiesHitboxLayer = !!this.map.getLayer(Settings.layerIds.citiesCircleHitbox);
                if (hasCitiesHitboxLayer) {
                    const cityFeatures = this.map.queryRenderedFeatures(e.point, {
                        layers: [Settings.layerIds.citiesCircleHitbox]
                    });

                    if (cityFeatures.length > 0) {
                        if (this.hoveredId !== null) {
                            this.map.setFeatureState({ source: Settings.sourceIds.nationalRoutes, id: this.hoveredId }, { hovered: false });
                            this.hoveredId = null;
                        }
                        return;
                    }
                }

                const feature = e.features[0];
                const properties = feature.properties as { route_display?: string; name?: string; cities_count?: number } | undefined;
                const nextHoveredId = feature.id ?? null;

                this.map.getCanvas().style.cursor = 'pointer';

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
                        this.mouseInfoCard.show(
                            routeName,
                            `${citiesCount} ${citiesCount === 1 ? 'ciudad' : 'ciudades'}`,
                            'route',
                            e.point.x + 10,
                            e.point.y + 10
                        );
                    }
                }
            });

            this.map.on('mouseleave', Settings.layerIds.nationalRoutesHitbox, () => {
                if (this.hoveredId !== null) {
                    this.map.setFeatureState({ source: Settings.sourceIds.nationalRoutes, id: this.hoveredId }, { hovered: false });
                }
                this.hoveredId = null;

                if (this.hoveredCityId === null) {
                    this.mouseInfoCard?.hide();
                    this.map.getCanvas().style.cursor = '';
                }
            });

            this.map.on('click', Settings.layerIds.nationalRoutesHitbox, (e) => {
                if (!e.features || e.features.length === 0) return;
                const clickedId = e.features[0].id ?? null;
                this.selectRoute(this.selectedId === clickedId ? null : clickedId);
            });

            this.map.on('click', (e) => {
                const routeFeatures = this.map.queryRenderedFeatures(e.point, {
                    layers: [Settings.layerIds.nationalRoutesHitbox]
                });

                if (routeFeatures.length > 0) return;

                const hasCitiesLayer = !!this.map.getLayer(Settings.layerIds.citiesCircleHitbox);
                if (hasCitiesLayer) {
                    const cityFeatures = this.map.queryRenderedFeatures(e.point, {
                        layers: [Settings.layerIds.citiesCircleHitbox]
                    });
                    if (cityFeatures.length > 0) return;
                }

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

            this.map.addLayer({
                id: Settings.layerIds.citiesCircleHitbox,
                type: 'circle',
                source: Settings.sourceIds.cities,
                paint: {
                    'circle-radius': [
                        'interpolate', ['linear'], ['zoom'],
                        Settings.cityCircle.hitRadiusByZoom.minZoom, Settings.cityCircle.hitRadiusByZoom.minRadius,
                        Settings.cityCircle.hitRadiusByZoom.maxZoom, Settings.cityCircle.hitRadiusByZoom.maxRadius
                    ],
                    // Interaction layer that can also be toggled visible for debugging.
                    'circle-color': Settings.cityCircle.hitboxDebug.color,
                    'circle-opacity': Settings.cityCircle.hitboxDebug.visible
                        ? Settings.cityCircle.hitboxDebug.opacity
                        : 0.01,
                    'circle-stroke-width': Settings.cityCircle.hitboxDebug.visible
                        ? Settings.cityCircle.hitboxDebug.strokeWidth
                        : 0,
                    'circle-stroke-color': Settings.cityCircle.hitboxDebug.strokeColor,
                    'circle-stroke-opacity': Settings.cityCircle.hitboxDebug.visible
                        ? Settings.cityCircle.hitboxDebug.strokeOpacity
                        : 0
                }
            });

            this.map.on('mousemove', Settings.layerIds.citiesCircleHitbox, (e) => {
                if (!e.features || e.features.length === 0) return;

                const feature = e.features[0];
                const properties = feature.properties as { id?: string; name?: string } | undefined;
                const cityId = String(feature.id ?? properties?.id ?? '');
                const cityName = String(properties?.name ?? '');

                if (this.hoveredId !== null) {
                    this.map.setFeatureState({ source: Settings.sourceIds.nationalRoutes, id: this.hoveredId }, { hovered: false });
                    this.hoveredId = null;
                }

                if (this.mouseInfoCard && cityId && cityName) {
                    if (this.hoveredCityId === cityId) {
                        this.mouseInfoCard.moveTo(e.point.x + 10, e.point.y + 10);
                        this.map.getCanvas().style.cursor = 'pointer';
                        return;
                    }

                    this.hoveredCityId = cityId;
                    const connectedRoutes = this.cityRoutesMap[cityId] ?? [];
                    const routeDisplayNames = connectedRoutes.map((route) => route.displayName);
                    this.mouseInfoCard.show(
                        cityName,
                        this.buildConnectedRoutesTooltip(routeDisplayNames),
                        'city',
                        e.point.x + 10,
                        e.point.y + 10
                    );
                }
                this.map.getCanvas().style.cursor = 'pointer';
            });

            this.map.on('mouseleave', Settings.layerIds.citiesCircleHitbox, () => {
                this.hoveredCityId = null;

                if (this.hoveredId === null) {
                    this.mouseInfoCard?.hide();
                    this.map.getCanvas().style.cursor = '';
                }
            });

            this.map.on('click', Settings.layerIds.citiesCircleHitbox, (e) => {
                if (!e.features || e.features.length === 0) return;
                const feature = e.features[0];
                const properties = feature.properties as { id?: string; name?: string } | undefined;
                const cityId = String(feature.id ?? properties?.id ?? '');
                const cityName = String(properties?.name ?? '');
                if (!cityId || !cityName) return;

                this.emitCitySelected(cityId, cityName);
            });

            this.renderProgressMarker();
        });
    }

    private createProgressMarkerData(
        coordinates: [number, number],
        visible: boolean,
        bearing: number
    ): ProgressMarkerFeatureCollection {
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
                        visible,
                        bearing
                    }
                }
            ]
        };
    }

    private addProgressMarkerIcon(): boolean {
        if (this.map.hasImage(Settings.progressMarker.iconId)) return true;

        const icon = createCarMarkerIcon({
            length: Settings.progressMarker.size,
            bodyColor: Settings.progressMarker.color,
            roofColor: Settings.progressMarker.roofColor,
            glassColor: Settings.progressMarker.glassColor,
            lightColor: Settings.progressMarker.lightColor,
            strokeColor: Settings.progressMarker.strokeColor,
            strokeWidth: Settings.progressMarker.strokeWidth
        });
        if (!icon) return false;

        this.map.addImage(
            Settings.progressMarker.iconId,
            { width: icon.width, height: icon.height, data: icon.data },
            { pixelRatio: icon.pixelRatio }
        );

        return true;
    }

    private renderProgressMarker(): void {
        if (this.map.getSource(Settings.sourceIds.progressMarker)) return;

        this.map.addSource(Settings.sourceIds.progressMarker, {
            type: 'geojson',
            data: this.createProgressMarkerData([Settings.center[0], Settings.center[1]], false, 0)
        });

        const hasIcon = this.addProgressMarkerIcon();

        if (!hasIcon) {
            // Canvas unavailable: fall back to a plain dot so progress stays visible.
            this.map.addLayer({
                id: Settings.layerIds.progressMarkerIcon,
                type: 'circle',
                source: Settings.sourceIds.progressMarker,
                paint: {
                    'circle-radius': Settings.progressMarker.size / 2,
                    'circle-color': Settings.progressMarker.color,
                    'circle-opacity': ['case', ['get', 'visible'], Settings.progressMarker.opacity, 0],
                    'circle-stroke-width': Settings.progressMarker.strokeWidth,
                    'circle-stroke-color': Settings.progressMarker.strokeColor
                }
            });
            return;
        }

        this.map.addLayer({
            id: Settings.layerIds.progressMarkerIcon,
            type: 'symbol',
            source: Settings.sourceIds.progressMarker,
            layout: {
                'icon-image': Settings.progressMarker.iconId,
                'icon-rotate': ['get', 'bearing'],
                'icon-rotation-alignment': 'map',
                'icon-allow-overlap': true,
                'icon-ignore-placement': true,
                'icon-size': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    Settings.progressMarker.sizeByZoom.minZoom,
                    Settings.progressMarker.sizeByZoom.minSize,
                    Settings.progressMarker.sizeByZoom.maxZoom,
                    Settings.progressMarker.sizeByZoom.maxSize
                ]
            },
            paint: {
                'icon-opacity': ['case', ['get', 'visible'], Settings.progressMarker.opacity, 0]
            }
        });
    }

    setProgressMarkerCoordinate(coordinates: [number, number], visible = true, bearing?: number): void {
        const source = this.map.getSource(Settings.sourceIds.progressMarker) as maplibregl.GeoJSONSource;
        if (!source) return;

        // Keep the last known heading when the caller has no direction to report.
        if (typeof bearing === 'number' && Number.isFinite(bearing)) {
            this.progressMarkerBearing = bearing;
        }

        source.setData(this.createProgressMarkerData(coordinates, visible, this.progressMarkerBearing));
    }

    hideProgressMarker(): void {
        const source = this.map.getSource(Settings.sourceIds.progressMarker) as maplibregl.GeoJSONSource;
        if (!source) return;
        source.setData(
            this.createProgressMarkerData([Settings.center[0], Settings.center[1]], false, this.progressMarkerBearing)
        );
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

