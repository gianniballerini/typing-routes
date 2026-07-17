import type { FeatureCollection } from 'geojson';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

class MapController {
    map: maplibregl.Map;
    private ready: boolean;
    private pendingCallbacks: Array<() => void>;

    constructor() {
        this.ready = false;
        this.pendingCallbacks = [];
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
                data: fc
            });
            this.map.addLayer({
                id: 'national-routes-line',
                type: 'line',
                source: 'national-routes',
                paint: {
                    'line-color': '#d62828',
                    'line-width': [
                        'interpolate', ['linear'], ['zoom'],
                        3, 1.2,
                        7, 4
                    ],
                    'line-opacity': 0.9
                }
            });
        });
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

