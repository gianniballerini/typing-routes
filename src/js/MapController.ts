import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

class MapController {
    map: maplibregl.Map;

    constructor() {
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
    }
}

const mapController = new MapController();
mapController.init();
export { mapController as MapController };

