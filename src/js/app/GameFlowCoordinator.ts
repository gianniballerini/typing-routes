import type { Geometry } from 'geojson';
import { Game } from '../Game';
import { MapController } from '../MapController';
import { RoutesController } from '../RoutesController';
import { Settings } from '../Settings';
import { GameUiPresenter } from '../ui/GameUiPresenter';
import type { RouteMetrics, SnappedRoutePoint } from '../utils/GeometryUtils';
import { buildRouteMetrics, interpolateOnRoute, projectPointOnRoute } from '../utils/GeometryUtils';

class GameFlowCoordinator {
    private game: Game;
    private routes_controller: RoutesController;
    private map_controller: MapController;
    private ui_presenter: GameUiPresenter;
    private routeMetrics: RouteMetrics | null;
    private snappedCityPoints: SnappedRoutePoint[];

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
        this.routeMetrics = null;
        this.snappedCityPoints = [];
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
        this.initializeRouteSnappingData(selectedRouteId);

        const firstCityCoordinate = this.getCurrentSnappedCityCoordinate();
        if (firstCityCoordinate) {
            this.map_controller.flyToCoordinate(firstCityCoordinate, Settings.routeSelection.flyToZoom);
        }

        this.game.start();

        if (firstCityCoordinate) {
            this.map_controller.setProgressMarkerCoordinate(firstCityCoordinate, true);
        }
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

        if (selectedRoute && routeId) {
            this.ui_presenter.setMenuRoutePreview(selectedRoute);

            const geometry = this.routes_controller.getGeometryById(routeId);
            const routeStartCoordinate = this.getRouteStartCoordinate(geometry);
            if (routeStartCoordinate) {
                this.map_controller.flyToCoordinate(routeStartCoordinate, Settings.routeSelection.flyToZoom);
            }
            this.routeMetrics = null;
            this.snappedCityPoints = [];
            this.map_controller.hideProgressMarker();
            return;
        }

        this.ui_presenter.setMenuWelcomeState();
        this.routeMetrics = null;
        this.snappedCityPoints = [];
        this.map_controller.hideProgressMarker();
    };

    private getRouteStartCoordinate(geometry: Geometry | undefined): [number, number] | null {
        if (!geometry) return null;

        if (geometry.type === 'LineString') {
            const firstPoint = geometry.coordinates[0];
            if (!firstPoint || firstPoint.length < 2) return null;

            const lon = Number(firstPoint[0]);
            const lat = Number(firstPoint[1]);
            if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
            return [lon, lat];
        }

        if (geometry.type === 'MultiLineString') {
            const firstSegment = geometry.coordinates[0];
            const firstPoint = firstSegment?.[0];
            if (!firstPoint || firstPoint.length < 2) return null;

            const lon = Number(firstPoint[0]);
            const lat = Number(firstPoint[1]);
            if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
            return [lon, lat];
        }

        return null;
    }

    private handleStateChange = (): void => {
        this.ui_presenter.renderState(this.game.state);
    };

    private handleTypingTargetSet = (event: Event): void => {
        const customEvent = event as CustomEvent<{ target: string }>;
        this.ui_presenter.renderTyping('', customEvent.detail.target);
        this.ui_presenter.renderCurrentRouteAndCity(this.game.current_route);
        this.updateProgressMarkerForTyping('', customEvent.detail.target);
    };

    private handleTypingProgress = (event: Event): void => {
        const customEvent = event as CustomEvent<{ typed: string; target: string }>;
        this.ui_presenter.renderTyping(customEvent.detail.typed, customEvent.detail.target);
        this.updateProgressMarkerForTyping(customEvent.detail.typed, customEvent.detail.target);
    };

    private initializeRouteSnappingData(routeId: string): void {
        const route = this.game.current_route;
        const geometry = this.routes_controller.getGeometryById(routeId);
        const metrics = buildRouteMetrics(geometry);

        if (!route || !metrics) {
            this.routeMetrics = null;
            this.snappedCityPoints = [];
            return;
        }

        this.routeMetrics = metrics;
        this.snappedCityPoints = route.cities.map((city) => projectPointOnRoute([city.lon, city.lat], metrics));
    }

    private getCurrentSnappedCityCoordinate(): [number, number] | null {
        const route = this.game.current_route;
        if (!route) return null;

        const snappedPoint = this.snappedCityPoints[this.game.current_city_index];
        if (snappedPoint) return snappedPoint.coordinate;

        const city = route.cities[this.game.current_city_index];
        if (!city) return null;

        if (!Number.isFinite(city.lon) || !Number.isFinite(city.lat)) return null;
        return [city.lon, city.lat];
    }

    private updateProgressMarkerForTyping(typed: string, target: string): void {
        const route = this.game.current_route;
        if (!route || route.cities.length === 0) {
            this.map_controller.hideProgressMarker();
            return;
        }

        const cities = route.cities;
        const currentIndex = this.game.current_city_index;
        const currentCity = cities[currentIndex];
        if (!currentCity) {
            this.map_controller.hideProgressMarker();
            return;
        }

        const currentSnapped = this.snappedCityPoints[currentIndex];
        const currentCoordinate: [number, number] = currentSnapped
            ? currentSnapped.coordinate
            : [currentCity.lon, currentCity.lat];

        // First city stays pinned; remaining cities move from previous to current.
        if (currentIndex === 0 || cities.length === 1) {
            this.map_controller.setProgressMarkerCoordinate(currentCoordinate, true);
            return;
        }

        const previousSnapped = this.snappedCityPoints[currentIndex - 1];
        if (!previousSnapped || !currentSnapped || !this.routeMetrics) {
            this.map_controller.setProgressMarkerCoordinate(currentCoordinate, true);
            return;
        }

        const ratioRaw = target.length > 0 ? typed.length / target.length : 0;
        const ratio = Math.max(0, Math.min(1, ratioRaw));

        const distanceAlongRoute = previousSnapped.distanceAlongRoute
            + (currentSnapped.distanceAlongRoute - previousSnapped.distanceAlongRoute) * ratio;

        const coordinateOnRoute = interpolateOnRoute(this.routeMetrics, distanceAlongRoute);
        this.map_controller.setProgressMarkerCoordinate(coordinateOnRoute, true);
    }

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
