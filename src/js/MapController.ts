import type { FeatureCollection } from 'geojson';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

class MapController {
    map: maplibregl.Map;
    private ready: boolean;
    private pendingCallbacks: Array<() => void>;
    private hoveredId: string | number | null;
    private selectedId: string | number | null;

    constructor() {
        this.ready = false;
        this.pendingCallbacks = [];
        this.hoveredId = null;
        this.selectedId = null;
        this.map = new maplibregl.Map({
            container: 'map', // container id
            // style: 'https://demotiles.maplibre.org/globe.json', // style URL
            style: {
                "version": 8,
                "sources": {},
                "layers": []
            },
            center: [-63.6167, -38.4161], // Centered over Argentina

            zoom: 3.5,
            maxZoom: 7,
            minZoom: 3,

            maxBounds: [
                [-76.0, -56.0], // southwest corner [lng, lat]
                [-52.0, -21.0]  // northeast corner [lng, lat]
            ]
        });
    }

    init() {
        this.map.on('load', () => {
            this.ready = true;
            this.pendingCallbacks.forEach((cb) => cb());
            this.pendingCallbacks = [];

            this.onReady(() => {
                this.map.addSource('openmaptiles', {
                    type: 'vector',
                    url: 'https://demotiles.maplibre.org/tiles/tiles.json'
                });

                this.map.addLayer({
                    'id': 'argentina-limits',
                    'type': 'line',
                    'source': 'openmaptiles',
                    'source-layer': 'countries',
                    'filter': ['==', 'ADM0_A3', 'ARG'],
                    'paint': {
                        'line-color': '#32323222',
                        'line-width': 2.5
                    }
                });
            });
        });
    }

    onReady(cb: () => void) {
        if (this.ready) cb();
        else this.pendingCallbacks.push(cb);
    }

    renderRoutes(fc: FeatureCollection) {
        this.onReady(() => {
            this.map.addSource('national-routes', {
                type: 'geojson',
                data: fc,
                promoteId: 'id'
            });
            this.map.addLayer({
                id: 'national-routes-line',
                type: 'line',
                source: 'national-routes',
                paint: {
                    'line-color': [
                        'case',
                        ['boolean', ['feature-state', 'selected'], false], '#6CACE4',
                        ['boolean', ['feature-state', 'hovered'], false], '#777777',
                        ['get', 'visited'], '#FFB81C',
                        '#cccccc'
                    ],
                    'line-width': [
                        'interpolate', ['linear'], ['zoom'],
                        3, 1.2,
                        7, 4
                    ],
                    'line-opacity': 0.9
                }
            });

            this.map.on('mousemove', 'national-routes-line', (e) => {
                if (!e.features || e.features.length === 0) return;
                const feature = e.features[0];
                if (this.hoveredId === feature.id) return;
                if (this.hoveredId !== null) {
                    this.map.setFeatureState({ source: 'national-routes', id: this.hoveredId }, { hovered: false });
                }
                this.hoveredId = feature.id ?? null;
                if (this.hoveredId !== null) {
                    this.map.setFeatureState({ source: 'national-routes', id: this.hoveredId }, { hovered: true });
                }
                this.map.getCanvas().style.cursor = 'pointer';
            });

            this.map.on('mouseleave', 'national-routes-line', () => {
                if (this.hoveredId !== null) {
                    this.map.setFeatureState({ source: 'national-routes', id: this.hoveredId }, { hovered: false });
                }
                this.hoveredId = null;
                this.map.getCanvas().style.cursor = '';
            });

            this.map.on('click', 'national-routes-line', (e) => {
                if (!e.features || e.features.length === 0) return;
                const clickedId = e.features[0].id ?? null;
                this.selectRoute(this.selectedId === clickedId ? null : clickedId);
            });
        });
    }

    selectRoute(routeId: string | number | null) {
        if (this.selectedId !== null) {
            this.map.setFeatureState({ source: 'national-routes', id: this.selectedId }, { selected: false });
        }
        this.selectedId = routeId;
        if (routeId !== null) {
            this.map.setFeatureState({ source: 'national-routes', id: routeId }, { selected: true });
        }
    }

    renderCities(fc: FeatureCollection) {
        this.onReady(() => {
            this.map.addSource('cities', {
                type: 'geojson',
                data: fc
            });
            this.map.addLayer({
                id: 'cities-circle',
                type: 'circle',
                source: 'cities',
                paint: {
                    'circle-radius': [
                        'interpolate', ['linear'], ['zoom'],
                        3, 2,
                        7, 6
                    ],
                    'circle-color': [
                        'case',
                        ['get', 'visited'], '#2a9d8f',
                        '#cccccc'
                    ],
                    'circle-stroke-width': 1,
                    'circle-stroke-color': '#ffffff'
                }
            });
        });
    }

    updateCities(fc: FeatureCollection) {
        const source = this.map.getSource('cities') as maplibregl.GeoJSONSource;
        if (source) source.setData(fc);
    }

    updateRoutes(fc: FeatureCollection) {
        const source = this.map.getSource('national-routes') as maplibregl.GeoJSONSource;
        if (source) source.setData(fc);
    }

    setCityVisited(cityId: string, visited: boolean) {
        const source = this.map.getSource('cities') as maplibregl.GeoJSONSource;
        if (!source) return;
        void cityId;
        void visited;
        // MapLibre GeoJSONSource has no per-feature patch API and requires setData
        // with a full FeatureCollection replacement. State ownership stays upstream.
    }
}

export { MapController };

