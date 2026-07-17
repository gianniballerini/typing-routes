import { MapController } from './MapController';

declare global {
    interface Window {
        app: MainApplication;
    }
}

class MainApplication {
    map_controller: typeof MapController;
    constructor() {
        this.map_controller = MapController;
    }
}

const app = new MainApplication();
window.app = app; // Expose the app object to the global window object for debugging purposes
