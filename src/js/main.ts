import { MapController } from './MapController';

declare global {
    interface Window {
        map: maplibregl.Map;
    }
}

const map_controller = MapController;


window.map = map_controller; // Expose the map object to the global window object for debugging purposes
