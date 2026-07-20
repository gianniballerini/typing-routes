import { Game } from '../Game';
import { MapController } from '../MapController';
import { RoutesController } from '../RoutesController';
import { GameUiPresenter } from '../ui/GameUiPresenter';

class GameFlowCoordinator {
    private game: Game;
    private routes_controller: RoutesController;
    private map_controller: MapController;
    private ui_presenter: GameUiPresenter;

    constructor(
        game: Game,
        routes_controller: RoutesController,
        map_controller: MapController,
        ui_presenter: GameUiPresenter
    ) {
        this.game = game;
        this.routes_controller = routes_controller;
        this.map_controller = map_controller;
        this.ui_presenter = ui_presenter;
    }

    init(): void {
        this.ui_presenter.onStartRequested(this.handleStartRequested);
        this.map_controller.addEventListener('route-selected', this.handleRouteSelected as EventListener);

        this.game.addEventListener('city-visited', this.handleCityVisited as EventListener);
        this.game.addEventListener('route-complete', this.handleRouteComplete as EventListener);
        this.game.addEventListener('statechange', this.handleStateChange);

        this.game.typing_controller.addEventListener('target-set', this.handleTypingTargetSet as EventListener);
        this.game.typing_controller.addEventListener('progress', this.handleTypingProgress as EventListener);

        this.ui_presenter.renderState(this.game.state);
        this.refreshMenuFromSelectedRoute();
    }

    private handleStartRequested = (): void => {
        const selectedRouteId = this.map_controller.getSelectedRouteId();
        if (!selectedRouteId) {
            console.warn('Select a route before starting the game');
            return;
        }

        this.game.selectRoute(selectedRouteId);
        this.game.start();
    };

    private handleCityVisited = (event: Event): void => {
        const customEvent = event as CustomEvent<{ cityId: string }>;
        this.setCityVisited(customEvent.detail.cityId, true);
    };

    private handleRouteComplete = (event: Event): void => {
        const customEvent = event as CustomEvent<{ routeId: string }>;
        this.setRouteVisited(customEvent.detail.routeId, true);
        this.map_controller.selectRoute(null);
        console.log(`Route complete: ${customEvent.detail.routeId}`);
    };

    private handleRouteSelected = (event: Event): void => {
        const customEvent = event as CustomEvent<{ routeId: string | null }>;
        const routeId = customEvent.detail.routeId;
        const selectedRoute = routeId ? this.routes_controller.routes[routeId] ?? null : null;

        if (selectedRoute) {
            this.ui_presenter.setMenuRoutePreview(selectedRoute);
            return;
        }

        this.ui_presenter.setMenuWelcomeState();
    };

    private handleStateChange = (): void => {
        this.ui_presenter.renderState(this.game.state);
    };

    private handleTypingTargetSet = (event: Event): void => {
        const customEvent = event as CustomEvent<{ target: string }>;
        this.ui_presenter.renderTyping('', customEvent.detail.target);
        this.ui_presenter.renderCurrentRouteAndCity(this.game.current_route);
    };

    private handleTypingProgress = (event: Event): void => {
        const customEvent = event as CustomEvent<{ typed: string; target: string }>;
        this.ui_presenter.renderTyping(customEvent.detail.typed, customEvent.detail.target);
    };

    private setRouteVisited(routeId: string, visited: boolean): void {
        const routesFc = this.routes_controller.setRouteVisited(routeId, visited);
        this.map_controller.updateRoutes(routesFc);

        const citiesFc = this.routes_controller.getCitiesFeatureCollection();
        this.map_controller.updateCities(citiesFc);
    }

    private setCityVisited(cityId: string, visited: boolean): void {
        for (const route of Object.values(this.routes_controller.routes)) {
            const city = route.cities.find((entry) => entry.id === cityId);
            if (!city) continue;

            city.visited = visited;
            const citiesFc = this.routes_controller.getCitiesFeatureCollection();
            this.map_controller.updateCities(citiesFc);
            return;
        }
    }

    private refreshMenuFromSelectedRoute(): void {
        const selectedRouteId = this.map_controller.getSelectedRouteId();
        const selectedRoute = selectedRouteId ? this.routes_controller.routes[selectedRouteId] ?? null : null;

        if (selectedRoute) {
            this.ui_presenter.setMenuRoutePreview(selectedRoute);
            return;
        }

        this.ui_presenter.setMenuWelcomeState();
    }
}

export { GameFlowCoordinator };
