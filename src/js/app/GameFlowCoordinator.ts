import type { Geometry } from 'geojson';
import { Game } from '../Game';
import { GameState } from '../GameState';
import { MapController } from '../MapController';
import { RoutesController } from '../RoutesController';
import { Settings } from '../Settings';
import { GameUiPresenter } from '../ui/GameUiPresenter';
import type { RouteListRow } from '../ui/modals/RouteListModal';
import { ModalController, ModalState } from '../ui/ModalController';
import { UserStats } from '../UserStats';
import type { RouteMetrics, SnappedRoutePoint } from '../utils/GeometryUtils';
import { bearingOnRoute, buildRouteMetrics, interpolateOnRoute, projectPointOnRoute } from '../utils/GeometryUtils';
import { calculateStarRating } from '../utils/StarRating';
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

interface CalculatedRunMetrics {
    elapsedMs: number;
    grossWpm: number;
    netWpm: number;
    accuracy: number;
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
    private timerFrameHandle: number | null;
    private countdownTimeoutHandle: number | null;
    private countdownHideTimeoutHandle: number | null;
    private countdownRemaining: number;
    private pendingRunRouteId: string | null;

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
        this.timerFrameHandle = null;
        this.countdownTimeoutHandle = null;
        this.countdownHideTimeoutHandle = null;
        this.countdownRemaining = 0;
        this.pendingRunRouteId = null;
    }

    init(): void {
        this.ui_presenter.onStartRequested(this.handleStartRequested);
        this.ui_presenter.onCloseRequested(this.handleCloseRequested);
        this.ui_presenter.onQuitRequested(this.handleQuitRequested);
        this.ui_presenter.onTypingInput(this.handleTypingInput);
        this.ui_presenter.onHowToPlayRequested(this.handleHowToPlayRequested);
        this.ui_presenter.onRouteListRequested(this.handleRouteListRequested);
        this.ui_presenter.onAchievementsRequested(this.handleAchievementsRequested);
        this.modal_controller.routeListModal.onRouteActivated(this.handleRouteListActivated);
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

        this.startRunForRoute(selectedRouteId);
    };

    private startRunForRoute(routeId: string): void {
        if (this.game.state !== GameState.MENU) return;

        const selectedRoute = this.routes_controller.routes[routeId] ?? null;

        this.game.selectRoute(routeId);
        this.initializeRouteSnappingData(routeId);
        this.pendingRunRouteId = routeId;
        this.resetRunStatsDisplay();

        const initialRunCoordinate = this.getInitialRunCoordinate();
        if (initialRunCoordinate) {
            this.map_controller.flyToCoordinate(
                initialRunCoordinate,
                this.getRouteSelectionZoom(selectedRoute?.length_km)
            );
        }

        // Shows the panel with the first city while the camera settles; the clock
        // and the stats only start once the countdown lands on "go".
        this.game.startCountdown();

        if (initialRunCoordinate) {
            this.setProgressMarkerAndFollowCamera(initialRunCoordinate);
        }

        this.startCountdown();
    }

    private startCountdown(): void {
        this.clearCountdownTimers();

        this.countdownRemaining = Math.max(1, Math.round(Settings.runCountdown.seconds));
        this.ui_presenter.renderCountdown(`${this.countdownRemaining}`);
        this.countdownTimeoutHandle = window.setTimeout(this.handleCountdownTick, 1000);
    }

    private handleCountdownTick = (): void => {
        this.countdownTimeoutHandle = null;
        if (this.game.state !== GameState.COUNTDOWN) return;

        this.countdownRemaining -= 1;

        if (this.countdownRemaining <= 0) {
            this.finishCountdown();
            return;
        }

        this.ui_presenter.renderCountdown(`${this.countdownRemaining}`);
        this.countdownTimeoutHandle = window.setTimeout(this.handleCountdownTick, 1000);
    };

    // Enter / space during the countdown: jumps straight to "go".
    skipCountdown(): void {
        if (this.game.state !== GameState.COUNTDOWN) return;
        this.finishCountdown();
    }

    private finishCountdown(): void {
        this.clearCountdownTimers();

        this.ui_presenter.renderCountdown(Settings.runCountdown.goLabel, true);
        this.countdownHideTimeoutHandle = window.setTimeout(() => {
            this.countdownHideTimeoutHandle = null;
            this.ui_presenter.hideCountdown();
        }, Math.max(0, Settings.runCountdown.goHoldMs));

        // Stats start here, so the elapsed clock measures typing and nothing else.
        const routeId = this.pendingRunRouteId;
        this.pendingRunRouteId = null;
        if (routeId) this.initializeRunStats(routeId);

        this.game.start();
        this.ui_presenter.focusTypingInput();
    }

    private cancelCountdown(): void {
        this.clearCountdownTimers();
        this.ui_presenter.hideCountdown();
    }

    private clearCountdownTimers(): void {
        if (this.countdownTimeoutHandle !== null) {
            window.clearTimeout(this.countdownTimeoutHandle);
            this.countdownTimeoutHandle = null;
        }

        if (this.countdownHideTimeoutHandle !== null) {
            window.clearTimeout(this.countdownHideTimeoutHandle);
            this.countdownHideTimeoutHandle = null;
        }
    }

    private handleQuitRequested = (): void => {
        this.quitActiveRun();
    };

    private handleHowToPlayRequested = (): void => {
        this.modal_controller.show(ModalState.HOW_TO_PLAY);
    };

    private handleRouteListRequested = (): void => {
        this.modal_controller.routeListModal.render(
            this.buildRouteListRows(),
            this.map_controller.getSelectedRouteId()
        );
        this.modal_controller.show(ModalState.ROUTE_LIST);
    };

    // Picking a course starts the run right away. Selecting on the map first keeps
    // the highlight, the menu card and the camera on the same path the map click
    // takes; its fly-to is immediately superseded by the one in startRunForRoute.
    private handleRouteListActivated = (routeId: string): void => {
        if (this.game.state !== GameState.MENU) return;

        this.modal_controller.hide();
        this.map_controller.selectRoute(routeId);
        this.startRunForRoute(routeId);
    };

    private buildRouteListRows(): RouteListRow[] {
        return Object.values(this.routes_controller.routes)
            // A route with no cities has nothing to type, and Enter here starts the
            // run straight away, so it never belongs in the picker.
            .filter((route) => route.cities.length > 0)
            .sort((a, b) => this.toRouteNumber(a.route_number) - this.toRouteNumber(b.route_number))
            .map((route) => {
                const record = this.user_stats.getRouteRecord(route.route_id);
                const completed = this.user_stats.hasCompletedRoute(route.route_id);

                return {
                    routeId: route.route_id,
                    routeLabel: `RN ${route.route_number.trim().replace(/^0+(?!$)/, '')}`,
                    routeName: this.buildRouteTitle(route.full_name, route.route_name, route.route_number),
                    citiesCount: route.cities.length,
                    lengthKm: route.length_km,
                    imageUrl: route.image_url,
                    completed,
                    stars: calculateStarRating(record, completed)?.stars ?? null,
                    record
                };
            });
    }

    private toRouteNumber(routeNumber: string): number {
        const parsed = Number.parseInt(routeNumber, 10);
        return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
    }

    private handleAchievementsRequested = (): void => {
        this.modal_controller.show(ModalState.ACHIEVEMENTS);
    };

    /**
     * Abandons the current run and returns to the map. Mirrors the route-complete
     * teardown ordering (deselect first, then leave PLAYING), but leaves
     * `completedRouteForCurrentRunId` null so no record is stored and no modal shows.
     * Also covers COUNTDOWN, where the run is on screen but has not started yet.
     */
    quitActiveRun(): void {
        if (this.game.state !== GameState.PLAYING && this.game.state !== GameState.COUNTDOWN) return;

        this.cancelCountdown();
        this.map_controller.selectRoute(null);
        this.game.returnToMenu();
    }

    private handleCityVisited = (event: Event): void => {
        const customEvent = event as CustomEvent<{ cityId: string }>;
        this.setCityVisited(customEvent.detail.cityId, true);

        if (this.activeRunStats) {
            this.activeRunStats.citiesCompleted += 1;
            this.activeRunStats.citiesRemaining = Math.max(0, this.activeRunStats.citiesRemaining - 1);
            this.renderActiveRunStats(this.activeRunStats);
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
            this.ui_presenter.setMenuRoutePreview(selectedRoute, routeRecord, this.getRouteStars(routeId));

            const geometry = this.routes_controller.getGeometryById(routeId);
            const routeStartCoordinate = this.getRouteStartCoordinate(geometry);
            if (routeStartCoordinate) {
                this.map_controller.flyToCoordinate(
                    routeStartCoordinate,
                    this.getRouteSelectionZoom(selectedRoute.length_km)
                );
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

    private handleTypingInput = (inputText: string): void => {
        if (this.game.state !== GameState.PLAYING) return;

        for (const char of inputText) {
            if (char === '\n' || char === '\r') continue;
            this.game.typing_controller.handleInput(char);
        }
    };

    private getRouteSelectionZoom(routeLengthKm: number | undefined): number {
        const defaultZoom = Settings.routeSelection.flyToZoom;
        if (typeof routeLengthKm !== 'number' || !Number.isFinite(routeLengthKm)) return defaultZoom;

        return routeLengthKm <= Settings.routeSelection.veryShortRouteThresholdKm
            ? Math.min(Settings.maxZoom, Settings.routeSelection.veryShortRouteZoom)
            : defaultZoom;
    }

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
        // Focus lands on the countdown so the mobile keyboard is already up by the
        // time the run actually starts.
        const enteringRun = customEvent.detail.from === GameState.MENU
            && customEvent.detail.to === GameState.COUNTDOWN;
        const returningToMenu = customEvent.detail.to === GameState.MENU;

        if (enteringRun) {
            this.ui_presenter.focusTypingInput();
        }

        if (returningToMenu) {
            this.cancelCountdown();
            this.ui_presenter.blurTypingInput();
            // No-op when the run was abandoned mid-countdown: there are no stats yet.
            this.finalizeRunStats();
        }

        this.ui_presenter.renderState(this.game.state);
    };

    private handleTypingTargetSet = (event: Event): void => {
        const customEvent = event as CustomEvent<{ target: string }>;
        if (this.activeRunStats) this.activeRunStats.lastTypedLength = 0;

        this.ui_presenter.renderTyping('', customEvent.detail.target);
        this.ui_presenter.renderCurrentRouteAndCity(this.game.current_route, this.game.current_city_index);
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
            this.renderActiveRunStats(this.activeRunStats);
        }

        this.ui_presenter.renderTyping(customEvent.detail.typed, customEvent.detail.target);
        this.updateProgressMarkerForTyping(customEvent.detail.typed, customEvent.detail.target);
    };

    private handleTypingMistake = (): void => {
        if (!this.activeRunStats) return;

        this.activeRunStats.mistakes += 1;
        this.activeRunStats.currentCombo = 0;
        this.renderActiveRunStats(this.activeRunStats);
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

    private getInitialRunCoordinate(): [number, number] | null {
        if (this.routeMetrics) return this.routeMetrics.fallbackPoint;
        return this.getCurrentSnappedCityCoordinate();
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

        if (!currentSnapped || !this.routeMetrics) {
            this.setProgressMarkerAndFollowCamera(currentCoordinate);
            return;
        }

        const ratioRaw = target.length > 0 ? typed.length / target.length : 0;
        const ratio = Math.max(0, Math.min(1, ratioRaw));

        const segmentStartDistance = currentIndex === 0
            ? 0
            : this.snappedCityPoints[currentIndex - 1]?.distanceAlongRoute;

        if (segmentStartDistance === undefined) {
            this.setProgressMarkerAndFollowCamera(currentCoordinate);
            return;
        }

        const distanceAlongRoute = segmentStartDistance
            + (currentSnapped.distanceAlongRoute - segmentStartDistance) * ratio;

        const coordinateOnRoute = interpolateOnRoute(this.routeMetrics, distanceAlongRoute);
        const headingOnRoute = bearingOnRoute(this.routeMetrics, distanceAlongRoute);
        this.setProgressMarkerAndFollowCamera(coordinateOnRoute, headingOnRoute ?? undefined);
    }

    private setProgressMarkerAndFollowCamera(coordinate: [number, number], bearing?: number): void {
        this.map_controller.setProgressMarkerCoordinate(coordinate, true, bearing);
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
            this.ui_presenter.setMenuRoutePreview(selectedRoute, routeRecord, this.getRouteStars(selectedRouteId));
            return;
        }

        this.ui_presenter.setMenuWelcomeState();
    }

    private getRouteStars(routeId: string): number | null {
        return calculateStarRating(
            this.user_stats.getRouteRecord(routeId),
            this.user_stats.hasCompletedRoute(routeId)
        )?.stars ?? null;
    }

    // Zeroed readouts for the countdown: the panel already shows the route's city
    // count and a stopped clock before the run is live.
    private resetRunStatsDisplay(): void {
        const totalCities = this.game.current_route?.cities.length ?? 0;

        this.ui_presenter.renderRunStats(0, totalCities, 0, 0, 0, 100);
        this.ui_presenter.renderElapsedTime(0);
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

        this.resetRunStatsDisplay();
        this.startRunTimer();
    }

    private startRunTimer(): void {
        this.stopRunTimer();
        this.timerFrameHandle = requestAnimationFrame(this.handleTimerFrame);
    }

    private stopRunTimer(): void {
        if (this.timerFrameHandle === null) return;

        cancelAnimationFrame(this.timerFrameHandle);
        this.timerFrameHandle = null;
    }

    private handleTimerFrame = (): void => {
        const runStats = this.activeRunStats;
        if (!runStats) {
            this.timerFrameHandle = null;
            return;
        }

        this.ui_presenter.renderElapsedTime(Date.now() - runStats.startedAtMs);
        this.timerFrameHandle = requestAnimationFrame(this.handleTimerFrame);
    };

    private finalizeRunStats(): void {
        const runStats = this.activeRunStats;
        const completedRouteId = this.completedRouteForCurrentRunId;

        this.stopRunTimer();
        this.activeRunStats = null;
        this.completedRouteForCurrentRunId = null;

        if (!runStats) return;
        // Abandoned run: no record is stored (a partial run would set a bogus best time)
        // and no completion modal is shown.
        if (completedRouteId !== runStats.routeId) return;

        const calculatedMetrics = this.calculateRunMetrics(runStats);
        const previousRecord = this.user_stats.getRouteRecord(runStats.routeId);
        const isNewComboRecord = runStats.bestCombo > (previousRecord?.bestCombo ?? 0);
        const isNewGrossWpmRecord = this.isNewOptionalMetricRecord(calculatedMetrics.grossWpm, previousRecord?.bestGrossWpm);
        const isNewNetWpmRecord = this.isNewOptionalMetricRecord(calculatedMetrics.netWpm, previousRecord?.bestNetWpm);
        const isNewAccuracyRecord = this.isNewOptionalMetricRecord(calculatedMetrics.accuracy, previousRecord?.bestAccuracy);
        const isNewTimeRecord = this.isNewLowerIsBetterRecord(calculatedMetrics.elapsedMs, previousRecord?.bestElapsedMs);
        const changed = this.user_stats.updateRouteRecord(
            runStats.routeId,
            runStats.bestCombo,
            calculatedMetrics.grossWpm,
            calculatedMetrics.netWpm,
            calculatedMetrics.accuracy,
            calculatedMetrics.elapsedMs,
            runStats.mistakes
        );
        if (changed) this.user_stats_storage.save(this.user_stats);

        const route = this.routes_controller.routes[runStats.routeId];
        const totalCities = runStats.citiesCompleted + runStats.citiesRemaining;

        // Rated off the stored best, not this run, so a slower replay never looks
        // like it took stars away.
        const stars = this.getRouteStars(runStats.routeId) ?? 0;

        if (route) route.stars = stars;
        this.setRouteVisited(runStats.routeId, true);

        this.modal_controller.routeCompleteModal.render({
            routeTitle: this.buildRouteTitle(route?.full_name, route?.route_name, route?.route_number),
            stars,
            combo: runStats.bestCombo,
            grossWpm: calculatedMetrics.grossWpm,
            netWpm: calculatedMetrics.netWpm,
            accuracy: calculatedMetrics.accuracy,
            isNewComboRecord,
            isNewGrossWpmRecord,
            isNewNetWpmRecord,
            isNewAccuracyRecord,
            isNewTimeRecord,
            elapsedMs: calculatedMetrics.elapsedMs,
            citiesCompleted: runStats.citiesCompleted,
            citiesTotal: totalCities,
            mistakes: runStats.mistakes
        });
        this.modal_controller.show(ModalState.ROUTE_COMPLETE);
    }

    private renderActiveRunStats(runStats: ActiveRunStats): void {
        const calculatedMetrics = this.calculateRunMetrics(runStats);
        const totalCities = runStats.citiesCompleted + runStats.citiesRemaining;

        this.ui_presenter.renderRunStats(
            runStats.citiesCompleted,
            totalCities,
            runStats.currentCombo,
            calculatedMetrics.grossWpm,
            calculatedMetrics.netWpm,
            calculatedMetrics.accuracy
        );
    }

    private calculateRunMetrics(runStats: ActiveRunStats): CalculatedRunMetrics {
        const elapsedMs = Math.max(0, Date.now() - runStats.startedAtMs);
        return {
            elapsedMs,
            grossWpm: this.calculateGrossWpm(runStats, elapsedMs),
            netWpm: this.calculateNetWpm(runStats, elapsedMs),
            accuracy: this.calculateAccuracy(runStats)
        };
    }

    private calculateGrossWpm(runStats: ActiveRunStats, elapsedMs: number): number {
        const elapsedMinutes = elapsedMs / 60000;
        if (elapsedMinutes <= 0) return 0;

        const totalCharsAttempted = runStats.correctCharsTyped + runStats.mistakes;
        return (totalCharsAttempted / 5) / elapsedMinutes;
    }

    private calculateNetWpm(runStats: ActiveRunStats, elapsedMs: number): number {
        const elapsedMinutes = elapsedMs / 60000;
        if (elapsedMinutes <= 0) return 0;

        const correctWords = runStats.correctCharsTyped / 5;
        const errorPenaltyWords = runStats.mistakes / 5;
        const netWords = Math.max(0, correctWords - errorPenaltyWords);
        return netWords / elapsedMinutes;
    }

    private calculateAccuracy(runStats: ActiveRunStats): number {
        const totalKeystrokes = runStats.correctCharsTyped + runStats.mistakes;
        if (totalKeystrokes === 0) return 100;

        return (runStats.correctCharsTyped / totalKeystrokes) * 100;
    }

    private isNewOptionalMetricRecord(value: number, previousValue: number | null | undefined): boolean {
        if (previousValue == null) return true;
        return value > previousValue;
    }

    private isNewLowerIsBetterRecord(value: number, previousValue: number | null | undefined): boolean {
        if (previousValue == null) return true;
        return value < previousValue;
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
