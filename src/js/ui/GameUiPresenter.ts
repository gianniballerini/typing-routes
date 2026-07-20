import type { GameStateValue } from '../GameState';
import { GameState } from '../GameState';
import type { Route } from '../Route';

class GameUiPresenter {
    private game_menu_el: HTMLElement | null;
    private game_playing_el: HTMLElement | null;
    private start_button_el: HTMLElement | null;
    private start_city_el: HTMLElement | null;
    private city_count_number_el: HTMLElement | null;
    private end_city_el: HTMLElement | null;
    private typing_ok_el: HTMLElement | null;
    private typing_caret_el: HTMLElement | null;
    private typing_next_char_el: HTMLElement | null;
    private typing_rest_el: HTMLElement | null;
    private route_name_el: HTMLElement | null;

    constructor() {
        this.game_menu_el = document.querySelector('.game-menu');
        this.game_playing_el = document.querySelector('.game-playing');
        this.start_button_el = document.querySelector('.game-menu__button');
        this.start_city_el = document.querySelector('.game-playing__start-city');
        this.city_count_number_el = document.querySelector('.game-playing__city-count-number');
        this.end_city_el = document.querySelector('.game-playing__end-city');
        this.typing_ok_el = document.querySelector('.game-playing__typing-ok');
        this.typing_caret_el = document.querySelector('.game-playing__typing-caret');
        this.typing_next_char_el = document.querySelector('.game-playing__typing-next-char');
        this.typing_rest_el = document.querySelector('.game-playing__typing-rest');
        this.route_name_el = document.querySelector('.game-playing__route-name');
    }

    onStartRequested(handler: () => void): void {
        this.start_button_el?.addEventListener('click', handler);
    }

    renderState(state: GameStateValue): void {
        const showMenu = state === GameState.MENU;
        this.game_menu_el?.classList.toggle('hidden', !showMenu);
        this.game_playing_el?.classList.toggle('hidden', showMenu);

        if (showMenu) {
            this.renderTyping('', '');
            this.clearPlayingPanel();
        }
    }

    renderTyping(typed: string, target: string): void {
        const displayTarget = this.formatCityDisplayName(target);
        const displayTyped = displayTarget.slice(0, typed.length);
        const hasNextChar = displayTyped.length < displayTarget.length;

        if (this.typing_ok_el) this.typing_ok_el.textContent = displayTyped;
        if (this.typing_caret_el) this.typing_caret_el.textContent = '|';
        if (this.typing_next_char_el) this.typing_next_char_el.textContent = hasNextChar ? displayTarget.charAt(displayTyped.length) : '';
        if (this.typing_rest_el) this.typing_rest_el.textContent = hasNextChar ? displayTarget.slice(displayTyped.length + 1) : '';
    }

    renderCurrentRouteAndCity(route: Route | null): void {
        const totalCities = route?.cities.length ?? 0;
        const startCity = totalCities > 0 ? route?.cities[0] ?? null : null;
        const endCity = totalCities > 0 ? route?.cities[totalCities - 1] ?? null : null;

        if (this.route_name_el) {
            this.route_name_el.textContent = route ? `Ruta ${this.sanitizeRouteNumber(route.route_number)}` : '';
        }

        if (this.start_city_el) {
            this.start_city_el.textContent = this.formatCityDisplayName(startCity?.name ?? '');
        }

        if (this.city_count_number_el) {
            this.city_count_number_el.textContent = totalCities > 0 ? `${totalCities} Ciudades` : '';
        }

        if (this.end_city_el) {
            this.end_city_el.textContent = this.formatCityDisplayName(endCity?.name ?? '');
        }
    }

    private sanitizeRouteNumber(routeNumber: string): string {
        const normalized = String(routeNumber ?? '').trim();
        return normalized.replace(/^0+(?!$)/, '');
    }

    private formatCityDisplayName(name: string): string {
        return String(name ?? '')
            .split(/(\s+|-)/)
            .map((chunk) => {
                if (!chunk || /^\s+$/.test(chunk) || chunk === '-') return chunk;
                return chunk.charAt(0).toLocaleUpperCase() + chunk.slice(1).toLocaleLowerCase();
            })
            .join('');
    }

    private clearPlayingPanel(): void {
        if (this.start_city_el) this.start_city_el.textContent = '';
        if (this.city_count_number_el) this.city_count_number_el.textContent = '';
        if (this.end_city_el) this.end_city_el.textContent = '';
        if (this.route_name_el) this.route_name_el.textContent = '';
    }
}

export { GameUiPresenter };
