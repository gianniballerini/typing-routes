import { GameState, ALLOWED_TRANSITIONS } from './GameState';
import type { GameStateValue } from './GameState';
import { RoutesController } from './RoutesController';
import { MapController } from './MapController';
import { TypingController } from './TypingController';
import { Route } from './Route';

class Game extends EventTarget {
    state: GameStateValue;
    routes_controller: RoutesController;
    map_controller: MapController;
    typing_controller: TypingController;
    current_route: Route | null;
    current_city_index: number;

    constructor(routes_controller: RoutesController, map_controller: MapController) {
        super();
        this.state = GameState.MENU;
        this.routes_controller = routes_controller;
        this.map_controller = map_controller;
        this.typing_controller = new TypingController();
        this.current_route = null;
        this.current_city_index = 0;

        // One-way integration: TypingController reports completion, Game advances flow.
        this.typing_controller.addEventListener('city-complete', () => this.advanceCity());
    }

    setState(next: GameStateValue): boolean {
        if (!ALLOWED_TRANSITIONS[this.state].includes(next)) {
            console.warn(`Invalid transition: ${this.state} -> ${next}`);
            return false;
        }

        const previous = this.state;
        this.state = next;
        this.dispatchEvent(new CustomEvent('statechange', { detail: { from: previous, to: next } }));
        return true;
    }

    selectRoute(routeId: string): void {
        this.current_route = this.routes_controller.routes[routeId] ?? null;
        this.current_city_index = 0;
    }

    // Shows the run before it counts: the first city target is loaded here so the
    // panel renders it while the countdown plays. Nothing can be typed yet — every
    // input path is gated on PLAYING.
    startCountdown(): void {
        if (!this.current_route) {
            console.warn('Cannot start: no route selected');
            return;
        }

        if (!this.setState(GameState.COUNTDOWN)) return;
        this.loadCurrentCityTarget();
    }

    start(): void {
        if (!this.current_route) {
            console.warn('Cannot start: no route selected');
            return;
        }

        if (!this.setState(GameState.PLAYING)) return;
        // Already loaded by the countdown; reloading would replay the card's
        // enter animation on the very first city.
        if (!this.typing_controller.active) this.loadCurrentCityTarget();
    }

    pause(): void {
        this.setState(GameState.PAUSED);
    }

    resume(): void {
        this.setState(GameState.PLAYING);
    }

    returnToMenu(): void {
        this.setState(GameState.MENU);
        this.current_route = null;
        this.current_city_index = 0;
        this.typing_controller.reset();
    }

    private loadCurrentCityTarget(): void {
        const city = this.current_route?.cities[this.current_city_index];
        if (city) this.typing_controller.setTarget(city.typing);
    }

    private advanceCity(): void {
        if (!this.current_route) return;

        const city = this.current_route.cities[this.current_city_index];
        if (city) {
            this.dispatchEvent(new CustomEvent('city-visited', { detail: { cityId: city.id } }));
            // If tighter coupling is ever acceptable, this existing pattern works:
            // const citiesFc = this.routes_controller.getCitiesFeatureCollection();
            // this.map_controller.updateCities(citiesFc);
        }

        this.current_city_index += 1;

        if (this.current_city_index >= this.current_route.cities.length) {
            this.dispatchEvent(new CustomEvent('route-complete', { detail: { routeId: this.current_route.route_id } }));
            this.returnToMenu();
            return;
        }

        this.loadCurrentCityTarget();
    }
}

export { Game };
