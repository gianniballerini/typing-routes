import { MapController } from './MapController';
import { MouseInfoCard } from './MouseInfoCard';
import { RoutesController } from './RoutesController';

declare global {
    interface Window {
        app: MainApplication;
    }
}

class MainApplication {
    map_controller: MapController;
    mouse_info_card: MouseInfoCard;
    routes_controller: RoutesController;

    constructor() {
        this.map_controller = new MapController();
        this.mouse_info_card = new MouseInfoCard();
        this.mouse_info_card.hide();
        this.map_controller.setMouseInfoCard(this.mouse_info_card);
        this.map_controller.init();
        this.routes_controller = new RoutesController();
        this.routes_controller.init();
        this.map_controller.setRouteCityIdsMap(this.routes_controller.getRouteCityIdsMap());

        const fc = this.routes_controller.getRoutesFeatureCollection();
        this.map_controller.renderRoutes(fc);

        const citiesFc = this.routes_controller.getCitiesFeatureCollection();
        this.map_controller.renderCities(citiesFc);
    }

    setRouteVisited(routeId: string, visited: boolean) {
        const routesFc = this.routes_controller.setRouteVisited(routeId, visited);
        this.map_controller.updateRoutes(routesFc);

        const citiesFc = this.routes_controller.getCitiesFeatureCollection();
        this.map_controller.updateCities(citiesFc);
    }
}

const app = new MainApplication();
window.app = app; // Expose the app object to the global window object for debugging purposes
