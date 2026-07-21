import type { Geometry } from 'geojson';
import { Game } from '../Game';
import { GameState } from '../GameState';
import { MapController } from '../MapController';
import { RoutesController } from '../RoutesController';
import { Settings } from '../Settings';
import { GameUiPresenter } from '../ui/GameUiPresenter';
import { ModalController } from '../ui/ModalController';
import { UserStats } from '../UserStats';
import type { RouteMetrics, SnappedRoutePoint } from '../utils/GeometryUtils';
import { buildRouteMetrics, interpolateOnRoute, projectPointOnRoute } from '../utils/GeometryUtils';
import { UserStatsStorage } from './UserStatsStorage';

interface ActiveRunStats {
    routeId: string;
    startedAtMs: number;
    correctCharsTyped: number;
    mistakes: number;
    currentCombo: number;
    bestCombo: number;
    citiesCompleted: number;
    citiesRemaining: number;
    lastTypedLength: number;
}

class GameFlowCoordinator {
    private game: Game;
    private routes_controller: RoutesController;
    private map_controller: MapController;
    private ui_presenter: GameUiPresenter;
    private modal_controller: ModalController;
    private user_stats: UserStats;
    private user_stats_storage: UserStatsStorage;
    private routeMetrics: RouteMetrics | null;
    private snappedCityPoints: SnappedRoutePoint[];
    private activeRunStats: ActiveRunStats | null;
    private completedRouteForCurrentRunId: string | null;

    constructor(
        game: Game,
        routes_controller: RoutesController,
        map_controller: MapController,
        ui_presenter: GameUiPresenter,
        modal_controller: ModalController,
        user_stats: UserStats,
        user_stats_storage: UserStatsStorage
    ) {
        this.game = game;
        this.routes_controller = routes_controller;
        this.map_controller = map_controller;
        this.ui_presenter = ui_presenter;
        this.modal_controller = modal_controller;
        this.user_stats = user_stats;
        this.user_stats_storage = user_stats_storage;
        this.routeMetrics = null;
        this.snappedCityPoints = [];
        this.activeRunStats = null;
        this.completedRouteForCurrentRunId = null;
    }

    init(): void {
        this.ui_presenter.onStartRequested(this.handleStartRequested);
        this.ui_presenter.onCloseRequested(this.handleCloseRequested);
        this.map_controller.addEventListener('route-selected', this.handleRouteSelected as EventListener);

        this.game.addEventListener('city-visited', this.handleCityVisited as EventListener);
        this.game.addEventListener('route-complete', this.handleRouteComplete as EventListener);
        this.game.addEventListener('statechange', this.handleStateChange);

        this.game.typing_controller.addEventListener('target-set', this.handleTypingTargetSet as EventListener);
        this.game.typing_controller.addEventListener('progress', this.handleTypingProgress as EventListener);
        this.game.typing_controller.addEventListener('mistake', this.handleTypingMistake as EventListener);

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
        this.initializeRunStats(selectedRouteId);

        const firstCityCoordinate = this.getCurrentSnappedCityCoordinate();
        if (firstCityCoordinate) {
            this.map_controller.flyToCoordinate(firstCityCoordinate, Settings.routeSelection.flyToZoom);
        }

        this.game.start();

        if (firstCityCoordinate) {
            this.setProgressMarkerAndFollowCamera(firstCityCoordinate);
        }
    };

    private handleCityVisited = (event: Event): void => {
        const customEvent = event as CustomEvent<{ cityId: string }>;
        this.setCityVisited(customEvent.detail.cityId, true);

        if (this.activeRunStats) {
            this.activeRunStats.citiesCompleted += 1;
            this.activeRunStats.citiesRemaining = Math.max(0, this.activeRunStats.citiesRemaining - 1);
            const totalCities = this.activeRunStats.citiesCompleted + this.activeRunStats.citiesRemaining;
            this.ui_presenter.renderRunStats(
                this.activeRunStats.citiesCompleted,
                totalCities,
                this.activeRunStats.currentCombo,
                this.calculateCurrentWpm(this.activeRunStats)
            );
        }

        const changed = this.user_stats.markCityCompleted(customEvent.detail.cityId);
        if (changed) this.user_stats_storage.save(this.user_stats);
    };

    private handleRouteComplete = (event: Event): void => {
        const customEvent = event as CustomEvent<{ routeId: string }>;
        this.setRouteVisited(customEvent.detail.routeId, true);
        this.completedRouteForCurrentRunId = customEvent.detail.routeId;

        const changed = this.user_stats.markRouteCompleted(customEvent.detail.routeId);
        if (changed) this.user_stats_storage.save(this.user_stats);

        this.map_controller.selectRoute(null);
        console.log(`Route complete: ${customEvent.detail.routeId}`);
    };

    private handleRouteSelected = (event: Event): void => {
        const customEvent = event as CustomEvent<{ routeId: string | null }>;
        const routeId = customEvent.detail.routeId;
        const selectedRoute = routeId ? this.routes_controller.routes[routeId] ?? null : null;

        if (selectedRoute && routeId) {
            const routeRecord = this.user_stats.getRouteRecord(routeId);
            this.ui_presenter.setMenuRoutePreview(selectedRoute, routeRecord);

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
        this.map_controller.resetToCountryView();
        this.routeMetrics = null;
        this.snappedCityPoints = [];
        this.map_controller.hideProgressMarker();
    };

    private handleCloseRequested = (): void => {
        this.map_controller.selectRoute(null);
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

    private handleStateChange = (event: Event): void => {
        const customEvent = event as CustomEvent<{ from: string; to: string }>;
        const leavingPlaying = customEvent.detail.from === GameState.PLAYING && customEvent.detail.to === GameState.MENU;
        if (leavingPlaying) {
            this.finalizeRunStats();
        }

        this.ui_presenter.renderState(this.game.state);
    };

    private handleTypingTargetSet = (event: Event): void => {
        const customEvent = event as CustomEvent<{ target: string }>;
        if (this.activeRunStats) this.activeRunStats.lastTypedLength = 0;

        this.ui_presenter.renderTyping('', customEvent.detail.target);
        this.ui_presenter.renderCurrentRouteAndCity(this.game.current_route);
        this.updateProgressMarkerForTyping('', customEvent.detail.target);
    };

    private handleTypingProgress = (event: Event): void => {
        const customEvent = event as CustomEvent<{ typed: string; target: string }>;

        if (this.activeRunStats) {
            const typedLength = customEvent.detail.typed.length;
            const delta = Math.max(0, typedLength - this.activeRunStats.lastTypedLength);

            if (delta > 0) {
                this.activeRunStats.correctCharsTyped += delta;
                this.activeRunStats.currentCombo += delta;
                this.activeRunStats.bestCombo = Math.max(this.activeRunStats.bestCombo, this.activeRunStats.currentCombo);
            }

            this.activeRunStats.lastTypedLength = typedLength;
            const totalCities = this.activeRunStats.citiesCompleted + this.activeRunStats.citiesRemaining;
            this.ui_presenter.renderRunStats(
                this.activeRunStats.citiesCompleted,
                totalCities,
                this.activeRunStats.currentCombo,
                this.calculateCurrentWpm(this.activeRunStats)
            );
        }

        this.ui_presenter.renderTyping(customEvent.detail.typed, customEvent.detail.target);
        this.updateProgressMarkerForTyping(customEvent.detail.typed, customEvent.detail.target);
    };

    private handleTypingMistake = (): void => {
        if (!this.activeRunStats) return;

        this.activeRunStats.mistakes += 1;
        this.activeRunStats.currentCombo = 0;
        const totalCities = this.activeRunStats.citiesCompleted + this.activeRunStats.citiesRemaining;
        this.ui_presenter.renderRunStats(
            this.activeRunStats.citiesCompleted,
            totalCities,
            this.activeRunStats.currentCombo,
            this.calculateCurrentWpm(this.activeRunStats)
        );
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
            this.setProgressMarkerAndFollowCamera(currentCoordinate);
            return;
        }

        const previousSnapped = this.snappedCityPoints[currentIndex - 1];
        if (!previousSnapped || !currentSnapped || !this.routeMetrics) {
            this.setProgressMarkerAndFollowCamera(currentCoordinate);
            return;
        }

        const ratioRaw = target.length > 0 ? typed.length / target.length : 0;
        const ratio = Math.max(0, Math.min(1, ratioRaw));

        const distanceAlongRoute = previousSnapped.distanceAlongRoute
            + (currentSnapped.distanceAlongRoute - previousSnapped.distanceAlongRoute) * ratio;

        const coordinateOnRoute = interpolateOnRoute(this.routeMetrics, distanceAlongRoute);
        this.setProgressMarkerAndFollowCamera(coordinateOnRoute);
    }

    private setProgressMarkerAndFollowCamera(coordinate: [number, number]): void {
        this.map_controller.setProgressMarkerCoordinate(coordinate, true);
        this.map_controller.jumpToCoordinate(coordinate);
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

        if (selectedRoute && selectedRouteId) {
            const routeRecord = this.user_stats.getRouteRecord(selectedRouteId);
            this.ui_presenter.setMenuRoutePreview(selectedRoute, routeRecord);
            return;
        }

        this.ui_presenter.setMenuWelcomeState();
    }

    private initializeRunStats(routeId: string): void {
        const route = this.game.current_route;
        const totalCities = route?.cities.length ?? 0;

        this.activeRunStats = {
            routeId,
            startedAtMs: Date.now(),
            correctCharsTyped: 0,
            mistakes: 0,
            currentCombo: 0,
            bestCombo: 0,
            citiesCompleted: 0,
            citiesRemaining: totalCities,
            lastTypedLength: 0
        };

        this.ui_presenter.renderRunStats(0, totalCities, 0, 0);
    }

    private finalizeRunStats(): void {
        const runStats = this.activeRunStats;
        if (!runStats) return;

        const elapsedMs = Math.max(0, Date.now() - runStats.startedAtMs);
        const bestWpmForRun = this.calculateCurrentWpm(runStats);
        const previousRecord = this.user_stats.getRouteRecord(runStats.routeId);
        const isNewComboRecord = runStats.bestCombo > (previousRecord?.bestCombo ?? 0);
        const isNewWpmRecord = bestWpmForRun > (previousRecord?.bestWpm ?? 0);
        const changed = this.user_stats.updateRouteRecord(
            runStats.routeId,
            runStats.bestCombo,
            bestWpmForRun,
            elapsedMs,
            runStats.mistakes
        );
        if (changed) this.user_stats_storage.save(this.user_stats);

        if (this.completedRouteForCurrentRunId === runStats.routeId) {
            const route = this.routes_controller.routes[runStats.routeId];
            const totalCities = runStats.citiesCompleted + runStats.citiesRemaining;

            this.modal_controller.showRouteComplete({
                routeTitle: this.buildRouteTitle(route?.full_name, route?.route_name, route?.route_number),
                combo: runStats.bestCombo,
                wpm: bestWpmForRun,
                isNewComboRecord,
                isNewWpmRecord,
                elapsedMs,
                citiesCompleted: runStats.citiesCompleted,
                citiesTotal: totalCities,
                mistakes: runStats.mistakes
            });
        }

        this.activeRunStats = null;
        this.completedRouteForCurrentRunId = null;
    }

    private calculateCurrentWpm(runStats: ActiveRunStats): number {
        const elapsedMinutes = (Date.now() - runStats.startedAtMs) / 60000;
        if (elapsedMinutes <= 0) return 0;
        return (runStats.correctCharsTyped / 5) / elapsedMinutes;
    }

    private buildRouteTitle(fullName?: string, routeName?: string, routeNumber?: string): string {
        if (fullName && fullName.trim().length > 0) return fullName;
        if (routeName && routeName.trim().length > 0) return routeName;
        if (routeNumber && routeNumber.trim().length > 0) {
            const normalizedRouteNumber = routeNumber.trim().replace(/^0+(?!$)/, '');
            return `Ruta ${normalizedRouteNumber}`;
        }

        return 'Ruta';
    }
}

export { GameFlowCoordinator };
