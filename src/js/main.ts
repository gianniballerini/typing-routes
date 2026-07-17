import { MapController } from './MapController';
import { RoutesController } from './RoutesController';

declare global {
    interface Window {
        app: MainApplication;
    }
}

class MainApplication {
    map_controller: MapController;
    routes_controller: RoutesController;

    constructor() {
        this.map_controller = new MapController();
        this.map_controller.init();
        this.routes_controller = new RoutesController();
        this.routes_controller.init();

        const fc = this.routes_controller.getRoutesFeatureCollection();
        this.map_controller.renderRoutes(fc);

        const citiesFc = this.routes_controller.getCitiesFeatureCollection();
        this.map_controller.renderCities(citiesFc);
    }
}

const app = new MainApplication();
window.app = app; // Expose the app object to the global window object for debugging purposes
