import type { GameStateValue } from '../GameState';
import { GameState } from '../GameState';
import type { Route } from '../Route';

interface MenuRouteRecord {
    bestCombo: number;
    bestWpm: number;
    bestElapsedMs: number | null;
    fewestMistakes: number | null;
}

class GameUiPresenter {
    private game_menu_el: HTMLElement | null;
    private game_playing_el: HTMLElement | null;
    private menu_info_card_close_button_el: HTMLElement | null;

    private menu_info_card_el: HTMLElement | null;
    private menu_route_name_el: HTMLElement | null;
    private menu_route_number_el: HTMLElement | null;
    private menu_route_length_el: HTMLElement | null;
    private menu_route_description_el: HTMLElement | null;
    private menu_welcome_description_el: HTMLElement | null;
    private menu_route_record_combo_el: HTMLElement | null;
    private menu_route_record_wpm_el: HTMLElement | null;
    private menu_route_record_time_el: HTMLElement | null;
    private menu_route_record_mistakes_el: HTMLElement | null;
    private menu_route_image_container_el: HTMLElement | null;
    private menu_route_image_el: HTMLImageElement | null;
    private closeRequestedHandler: (() => void) | null;

    private start_button_el: HTMLElement | null;
    private start_city_el: HTMLElement | null;
    private city_count_number_el: HTMLElement | null;
    private end_city_el: HTMLElement | null;
    private typing_ok_el: HTMLElement | null;
    private typing_caret_el: HTMLElement | null;
    private typing_next_char_el: HTMLElement | null;
    private typing_rest_el: HTMLElement | null;
    private route_name_el: HTMLElement | null;
    private cities_completed_el: HTMLElement | null;
    private cities_remaining_el: HTMLElement | null;
    private combo_number_el: HTMLElement | null;
    private wpm_number_el: HTMLElement | null;

    constructor() {
        this.game_menu_el = document.querySelector('.game-menu');
        this.game_playing_el = document.querySelector('.game-playing');

        this.menu_info_card_el = document.querySelector('.game-menu__info-card');
        this.menu_info_card_close_button_el = document.querySelector('.game-menu__info-card-close');
        this.closeRequestedHandler = null;
        this.menu_info_card_close_button_el?.addEventListener('click', this.handleCloseButtonClick);

        this.menu_route_name_el = document.querySelector('.game-menu__route-name');
        this.menu_route_number_el = document.querySelector('.game-menu__route-number');
        this.menu_route_length_el = document.querySelector('.game-menu__route-length');
        this.menu_route_description_el = document.querySelector('.game-menu__route-description');
        this.menu_welcome_description_el = document.querySelector('.game-menu__welcome-description');
        this.menu_route_record_combo_el = document.querySelector('.game-menu__route-record-combo');
        this.menu_route_record_wpm_el = document.querySelector('.game-menu__route-record-wpm');
        this.menu_route_record_time_el = document.querySelector('.game-menu__route-record-time');
        this.menu_route_record_mistakes_el = document.querySelector('.game-menu__route-record-mistakes');
        this.menu_route_image_container_el = document.querySelector('.game-menu__info-card-image');
        this.menu_route_image_el = this.menu_route_image_container_el?.querySelector('img') ?? null;

        this.start_button_el = document.querySelector('.game-menu__button');
        this.start_city_el = document.querySelector('.game-playing__start-city');
        this.city_count_number_el = document.querySelector('.game-playing__city-count-number');
        this.end_city_el = document.querySelector('.game-playing__end-city');
        this.typing_ok_el = document.querySelector('.game-playing__typing-ok');
        this.typing_caret_el = document.querySelector('.game-playing__typing-caret');
        this.typing_next_char_el = document.querySelector('.game-playing__typing-next-char');
        this.typing_rest_el = document.querySelector('.game-playing__typing-rest');
        this.route_name_el = document.querySelector('.game-playing__route-name');
        this.cities_completed_el = document.querySelector('.game-playing__cities-completed');
        this.cities_remaining_el = document.querySelector('.game-playing__cities-remaining');
        this.combo_number_el = document.querySelector('.game-playing__combo-number');
        this.wpm_number_el = document.querySelector('.game-playing__wpm-number');
    }

    onStartRequested(handler: () => void): void {
        this.start_button_el?.addEventListener('click', handler);
    }

    onCloseRequested(handler: () => void): void {
        this.closeRequestedHandler = handler;
    }

    private handleCloseButtonClick = (): void => {
        if (this.closeRequestedHandler) {
            this.closeRequestedHandler();
            return;
        }

        this.setMenuWelcomeState();
    };

    renderState(state: GameStateValue): void {
        const showMenu = state === GameState.MENU;
        this.game_menu_el?.classList.toggle('hidden', !showMenu);
        this.game_playing_el?.classList.toggle('hidden', showMenu);

        if (showMenu) {
            this.renderTyping('', '');
            this.clearPlayingPanel();
        }
    }

    setMenuRoutePreview(route: Route, record: MenuRouteRecord | null = null): void {
        const routeNumber = this.sanitizeRouteNumber(route.route_number);
        this.renderMenuRouteImage(route.image_url);

        if (this.menu_route_name_el) {
            this.menu_route_name_el.textContent = route.full_name || route.route_name || `Ruta ${routeNumber}`;
        }

        if (this.menu_route_number_el) {
            this.menu_route_number_el.textContent = `RN ${routeNumber}`;
        }

        if (this.menu_route_length_el) {
            this.menu_route_length_el.textContent = `${Math.round(route.length_km)} km`;
        }

        if (this.menu_route_description_el) {
            this.menu_route_description_el.textContent = route.description ?? '';
        }

        this.menu_welcome_description_el?.classList.add('hidden');

        this.renderMenuRouteRecord(record);

        this.menu_info_card_el?.classList.remove('hidden');
    }

    setMenuWelcomeState(): void {
        if (this.menu_route_name_el) this.menu_route_name_el.textContent = '';
        if (this.menu_route_number_el) this.menu_route_number_el.textContent = '';
        if (this.menu_route_length_el) this.menu_route_length_el.textContent = '';
        if (this.menu_route_description_el) this.menu_route_description_el.textContent = '';
        if (this.menu_route_record_combo_el) this.menu_route_record_combo_el.textContent = '--';
        if (this.menu_route_record_wpm_el) this.menu_route_record_wpm_el.textContent = '--';
        if (this.menu_route_record_time_el) this.menu_route_record_time_el.textContent = '--:--';
        if (this.menu_route_record_mistakes_el) this.menu_route_record_mistakes_el.textContent = '--';
        if (this.menu_route_image_el) {
            this.menu_route_image_container_el?.classList.add('hidden');
            this.menu_route_image_el?.removeAttribute('src');
        }

        this.menu_welcome_description_el?.classList.remove('hidden');

        this.menu_info_card_el?.classList.add('hidden');
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

    renderRunStats(citiesCompleted: number, citiesRemaining: number, combo: number, wpm: number): void {
        if (this.cities_completed_el) this.cities_completed_el.textContent = `${Math.max(0, citiesCompleted)}`;
        if (this.cities_remaining_el) this.cities_remaining_el.textContent = `${Math.max(0, citiesRemaining)}`;
        if (this.combo_number_el) this.combo_number_el.textContent = `${Math.max(0, Math.round(combo))}`;
        if (this.wpm_number_el) this.wpm_number_el.textContent = `${Math.max(0, Math.round(wpm))}`;
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
        this.renderRunStats(0, 0, 0, 0);
    }

    private renderMenuRouteRecord(record: MenuRouteRecord | null): void {
        if (this.menu_route_record_combo_el) {
            this.menu_route_record_combo_el.textContent = record ? `${Math.max(0, Math.round(record.bestCombo))}` : '--';
        }

        if (this.menu_route_record_wpm_el) {
            this.menu_route_record_wpm_el.textContent = record ? `${Math.max(0, Math.round(record.bestWpm))}` : '--';
        }

        if (this.menu_route_record_time_el) {
            this.menu_route_record_time_el.textContent = record?.bestElapsedMs == null
                ? '--:--'
                : this.formatElapsedTime(record.bestElapsedMs);
        }

        if (this.menu_route_record_mistakes_el) {
            this.menu_route_record_mistakes_el.textContent = record?.fewestMistakes == null
                ? '--'
                : `${Math.max(0, Math.round(record.fewestMistakes))}`;
        }
    }

    private formatElapsedTime(elapsedMs: number): string {
        const safeElapsedMs = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;
        const totalSeconds = Math.floor(safeElapsedMs / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    private renderMenuRouteImage(imageUrl: string | null): void {
        if (!this.menu_route_image_el) return;

        if (!imageUrl) {
            this.menu_route_image_container_el?.classList.add('hidden');
            this.menu_route_image_el?.removeAttribute('src');
            return;
        }

        this.menu_route_image_el.src = imageUrl;
        this.menu_route_image_container_el?.classList.remove('hidden');
    }
}

export { GameUiPresenter };
export type { MenuRouteRecord };

