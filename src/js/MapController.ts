import maplibregl from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';
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
}

export { MapController };

