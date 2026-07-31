import type { GameStateValue } from '../GameState';
import { GameState } from '../GameState';
import type { Route } from '../Route';

interface MenuRouteRecord {
    bestCombo: number;
    bestGrossWpm: number | null;
    bestNetWpm: number | null;
    bestAccuracy: number | null;
    bestElapsedMs: number | null;
    fewestMistakes: number | null;
}

class GameUiPresenter {
    private game_menu_el: HTMLElement | null;
    private game_playing_el: HTMLElement | null;
    private game_playing_focus_input_el: HTMLInputElement | null;
    private readonly keyboardViewportOpenRatioThreshold: number;
    private readonly keyboardViewportMinDeltaPx: number;
    private menu_info_card_close_button_el: HTMLElement | null;

    private menu_info_card_el: HTMLElement | null;
    private menu_route_name_el: HTMLElement | null;
    private menu_route_number_el: HTMLElement | null;
    private menu_route_length_el: HTMLElement | null;
    private menu_route_description_el: HTMLElement | null;
    private menu_welcome_description_el: HTMLElement | null;
    private menu_route_record_combo_el: HTMLElement | null;
    private menu_route_record_gross_wpm_el: HTMLElement | null;
    private menu_route_record_net_wpm_el: HTMLElement | null;
    private menu_route_record_accuracy_el: HTMLElement | null;
    private menu_route_record_time_el: HTMLElement | null;
    private menu_route_record_mistakes_el: HTMLElement | null;
    private menu_route_image_container_el: HTMLElement | null;
    private menu_route_image_el: HTMLImageElement | null;
    private closeRequestedHandler: (() => void) | null;

    private start_button_el: HTMLElement | null;
    private typing_el: HTMLElement | null;
    private typing_prev_city_el: HTMLElement | null;
    private typing_next_city_el: HTMLElement | null;
    private typing_ok_el: HTMLElement | null;
    private typing_next_char_el: HTMLElement | null;
    private typing_rest_el: HTMLElement | null;
    private route_name_el: HTMLElement | null;
    private cities_completed_el: HTMLElement | null;
    private cities_remaining_el: HTMLElement | null;
    private combo_number_el: HTMLElement | null;
    private gross_wpm_number_el: HTMLElement | null;
    private net_wpm_number_el: HTMLElement | null;
    private accuracy_number_el: HTMLElement | null;
    private timer_number_el: HTMLElement | null;
    private timer_milliseconds_el: HTMLElement | null;
    private quit_button_el: HTMLElement | null;
    private quitRequestedHandler: (() => void) | null;
    private typingInputHandler: ((inputText: string) => void) | null;

    constructor() {
        this.game_menu_el = document.querySelector('.game-menu');
        this.game_playing_el = document.querySelector('.game-playing');
        this.game_playing_focus_input_el = document.querySelector('.game-playing__keyboard-focus-target');
        this.keyboardViewportOpenRatioThreshold = 0.78;
        this.keyboardViewportMinDeltaPx = 120;
        this.game_playing_el?.addEventListener('pointerdown', this.handlePlayingPointerDown);
        this.game_playing_focus_input_el?.addEventListener('input', this.handleKeyboardFocusInput);
        this.game_playing_focus_input_el?.addEventListener('focus', this.handleTypingInputFocus);
        this.game_playing_focus_input_el?.addEventListener('blur', this.handleTypingInputBlur);
        window.visualViewport?.addEventListener('resize', this.handleVisualViewportChange);
        window.visualViewport?.addEventListener('scroll', this.handleVisualViewportChange);

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
        this.menu_route_record_gross_wpm_el = document.querySelector('.game-menu__route-record-gross-wpm');
        this.menu_route_record_net_wpm_el = document.querySelector('.game-menu__route-record-net-wpm');
        this.menu_route_record_accuracy_el = document.querySelector('.game-menu__route-record-accuracy');
        this.menu_route_record_time_el = document.querySelector('.game-menu__route-record-time');
        this.menu_route_record_mistakes_el = document.querySelector('.game-menu__route-record-mistakes');
        this.menu_route_image_container_el = document.querySelector('.game-menu__info-card-image');
        this.menu_route_image_el = this.menu_route_image_container_el?.querySelector('img') ?? null;

        this.start_button_el = document.querySelector('.game-menu__button');
        this.typing_el = document.querySelector('.game-playing__typing');
        this.typing_prev_city_el = document.querySelector('.game-playing__typing-prev-city');
        this.typing_next_city_el = document.querySelector('.game-playing__typing-next-city');
        this.typing_ok_el = document.querySelector('.game-playing__typing-ok');
        this.typing_next_char_el = document.querySelector('.game-playing__typing-next-char');
        this.typing_rest_el = document.querySelector('.game-playing__typing-rest');
        this.route_name_el = document.querySelector('.game-playing__route-name');
        this.cities_completed_el = document.querySelector('.game-playing__cities-completed');
        this.cities_remaining_el = document.querySelector('.game-playing__cities-remaining');
        this.combo_number_el = document.querySelector('.game-playing__combo-number');
        this.gross_wpm_number_el = document.querySelector('.game-playing__gross-wpm-number');
        this.net_wpm_number_el = document.querySelector('.game-playing__net-wpm-number');
        this.accuracy_number_el = document.querySelector('.game-playing__accuracy-number');
        this.timer_number_el = document.querySelector('.game-playing__timer-number');
        this.timer_milliseconds_el = document.querySelector('.game-playing__timer-milliseconds');
        this.quit_button_el = document.querySelector('.game-playing__quit');
        this.quitRequestedHandler = null;
        this.quit_button_el?.addEventListener('click', this.handleQuitButtonClick);
        this.typingInputHandler = null;
        this.renderElapsedTime(0);
    }

    onStartRequested(handler: () => void): void {
        this.start_button_el?.addEventListener('click', handler);
    }

    onCloseRequested(handler: () => void): void {
        this.closeRequestedHandler = handler;
    }

    onQuitRequested(handler: () => void): void {
        this.quitRequestedHandler = handler;
    }

    onTypingInput(handler: (inputText: string) => void): void {
        this.typingInputHandler = handler;
    }

    focusTypingInput(): void {
        if (!this.game_playing_focus_input_el) return;
        this.game_playing_focus_input_el.focus({ preventScroll: true });
        this.updateKeyboardViewportState();
    }

    blurTypingInput(): void {
        if (!this.game_playing_focus_input_el) return;
        this.game_playing_focus_input_el.value = '';
        this.game_playing_focus_input_el.blur();
        this.clearKeyboardOpenState();
    }

    private handlePlayingPointerDown = (event: PointerEvent): void => {
        if (this.game_playing_el?.classList.contains('hidden')) return;

        // The quit button leaves the run: refocusing here would reopen the mobile keyboard.
        const target = event.target;
        if (target instanceof Element && target.closest('.game-playing__quit')) return;

        this.focusTypingInput();
    };

    private handleQuitButtonClick = (): void => {
        this.quitRequestedHandler?.();
    };

    private handleTypingInputFocus = (): void => {
        this.updateKeyboardViewportState();
    };

    private handleTypingInputBlur = (): void => {
        this.clearKeyboardOpenState();
    };

    private handleVisualViewportChange = (): void => {
        this.updateKeyboardViewportState();
    };

    private handleKeyboardFocusInput = (event: Event): void => {
        const inputEl = this.game_playing_focus_input_el;
        if (!inputEl) return;

        const inputEvent = event as InputEvent;
        const inputText = typeof inputEvent.data === 'string' && inputEvent.data.length > 0
            ? inputEvent.data
            : inputEl.value;

        try {
            if (inputText && this.typingInputHandler) {
                this.typingInputHandler(inputText);
            }
        } finally {
            inputEl.value = '';
        }
    };

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
            this.clearKeyboardOpenState();
        }
    }

    private isTypingInputFocused(): boolean {
        return document.activeElement === this.game_playing_focus_input_el;
    }

    private isPlayingVisible(): boolean {
        return !!this.game_playing_el && !this.game_playing_el.classList.contains('hidden');
    }

    private updateKeyboardViewportState(): void {
        if (!this.isPlayingVisible() || !this.isTypingInputFocused()) {
            this.clearKeyboardOpenState();
            return;
        }

        const visualViewport = window.visualViewport;
        if (!visualViewport || !this.game_playing_el) return;

        const layoutViewportHeight = Math.max(window.innerHeight, document.documentElement.clientHeight);
        const keyboardDeltaPx = Math.max(0, layoutViewportHeight - visualViewport.height);
        const viewportRatio = visualViewport.height / Math.max(1, layoutViewportHeight);

        const keyboardIsOpen = keyboardDeltaPx >= this.keyboardViewportMinDeltaPx
            && viewportRatio <= this.keyboardViewportOpenRatioThreshold;

        if (!keyboardIsOpen) {
            this.clearKeyboardOpenState();
            return;
        }

        this.game_playing_el.classList.add('keyboard-open');
        this.game_playing_el.style.height = `${Math.max(0, Math.round(visualViewport.height))}px`;
    }

    private clearKeyboardOpenState(): void {
        if (!this.game_playing_el) return;
        this.game_playing_el.classList.remove('keyboard-open');
        this.game_playing_el.style.removeProperty('height');
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

        this.playMenuInfoCardAnimation('game-menu__info-card--slap');
    }

    // The card lands with `--slap` and is picked back up with `--lift`; both are
    // one-shot classes, and starting either one cancels the other.
    private playMenuInfoCardAnimation(modifierClass: string, onEnd?: () => void): void {
        const el = this.menu_info_card_el;
        if (!el) return;

        el.classList.remove('game-menu__info-card--slap', 'game-menu__info-card--lift');
        // Forces a reflow so the animation restarts on every open and close
        // instead of only playing the first time the class lands.
        void el.offsetWidth;
        el.classList.add(modifierClass);

        el.addEventListener(
            'animationend',
            () => {
                el.classList.remove(modifierClass);
                onEnd?.();
            },
            { once: true }
        );
    }

    setMenuWelcomeState(): void {
        this.menu_welcome_description_el?.classList.remove('hidden');

        // Nothing to lift if the card was already closed — otherwise the
        // animation would flash it back into view on its way out.
        const cardWasVisible = this.menu_info_card_el?.classList.contains('hidden') === false;

        this.menu_info_card_el?.classList.add('hidden');

        if (!cardWasVisible) {
            this.menu_info_card_el?.classList.remove('game-menu__info-card--slap');
            this.clearMenuRoutePreview();
            return;
        }

        // The sheet keeps its content until it is off the screen, so it doesn't
        // blank out halfway through being picked up.
        this.playMenuInfoCardAnimation(
            'game-menu__info-card--lift',
            () => this.clearMenuRoutePreview()
        );
    }

    private clearMenuRoutePreview(): void {
        if (this.menu_route_name_el) this.menu_route_name_el.textContent = '';
        if (this.menu_route_number_el) this.menu_route_number_el.textContent = '';
        if (this.menu_route_length_el) this.menu_route_length_el.textContent = '';
        if (this.menu_route_description_el) this.menu_route_description_el.textContent = '';
        if (this.menu_route_record_combo_el) this.menu_route_record_combo_el.textContent = '--';
        if (this.menu_route_record_gross_wpm_el) this.menu_route_record_gross_wpm_el.textContent = '--';
        if (this.menu_route_record_net_wpm_el) this.menu_route_record_net_wpm_el.textContent = '--';
        if (this.menu_route_record_accuracy_el) this.menu_route_record_accuracy_el.textContent = '--';
        if (this.menu_route_record_time_el) this.menu_route_record_time_el.textContent = '--:--';
        if (this.menu_route_record_mistakes_el) this.menu_route_record_mistakes_el.textContent = '--';
        if (this.menu_route_image_el) {
            this.menu_route_image_container_el?.classList.add('hidden');
            this.menu_route_image_el?.removeAttribute('src');
        }
    }

    renderTyping(typed: string, target: string): void {
        const displayTarget = this.formatCityDisplayName(target);
        const displayTyped = displayTarget.slice(0, typed.length);
        const hasNextChar = displayTyped.length < displayTarget.length;
        const nextChar = hasNextChar ? displayTarget.charAt(displayTyped.length) : '';
        const restText = hasNextChar ? displayTarget.slice(displayTyped.length + 1) : '';

        if (this.typing_ok_el) this.typing_ok_el.textContent = this.toTypingDisplayText(displayTyped);
        if (this.typing_next_char_el) this.typing_next_char_el.textContent = this.toTypingDisplayText(nextChar);
        if (this.typing_rest_el) this.typing_rest_el.textContent = this.toTypingDisplayText(restText);
    }

    renderCurrentRouteAndCity(route: Route | null, cityIndex: number): void {
        if (this.route_name_el) {
            this.route_name_el.textContent = route ? `Ruta ${this.sanitizeRouteNumber(route.route_number)}` : '';
        }

        // Empty at the ends of the route: no previous city on the first, none after the last.
        this.renderCityLabel(this.typing_prev_city_el, route?.cities[cityIndex - 1]?.name ?? '');
        this.renderCityLabel(this.typing_next_city_el, route?.cities[cityIndex + 1]?.name ?? '');

        this.playTypingEnterAnimation();
    }

    private playTypingEnterAnimation(): void {
        const el = this.typing_el;
        if (!el) return;

        el.classList.remove('game-playing__typing--enter');
        // Forces a reflow so the animation restarts on every city instead of
        // only playing the first time the class lands.
        void el.offsetWidth;
        el.classList.add('game-playing__typing--enter');

        el.addEventListener(
            'animationend',
            () => el.classList.remove('game-playing__typing--enter'),
            { once: true }
        );
    }

    renderRunStats(
        citiesCompleted: number,
        citiesTotal: number,
        combo: number,
        grossWpm: number,
        netWpm: number,
        accuracy: number
    ): void {
        if (this.cities_completed_el) this.cities_completed_el.textContent = `${Math.max(0, citiesCompleted)}`;
        if (this.cities_remaining_el) this.cities_remaining_el.textContent = `${Math.max(0, citiesTotal)}`;
        if (this.combo_number_el) this.combo_number_el.textContent = `${Math.max(0, Math.round(combo))}`;
        if (this.gross_wpm_number_el) this.gross_wpm_number_el.textContent = this.formatOneDecimal(grossWpm);
        if (this.net_wpm_number_el) this.net_wpm_number_el.textContent = this.formatOneDecimal(netWpm);
        if (this.accuracy_number_el) this.accuracy_number_el.textContent = `${this.formatOneDecimal(accuracy)}%`;
    }

    renderElapsedTime(elapsedMs: number): void {
        const safeElapsedMs = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;

        if (this.timer_number_el) {
            this.timer_number_el.textContent = this.formatElapsedTime(safeElapsedMs);
        }

        if (this.timer_milliseconds_el) {
            const centiseconds = Math.floor((safeElapsedMs % 1000) / 10);
            this.timer_milliseconds_el.textContent = String(centiseconds).padStart(2, '0');
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

    private renderCityLabel(el: HTMLElement | null, name: string): void {
        if (!el) return;

        const full_name = this.formatCityDisplayName(name);
        const display_name = this.truncateCityDisplayName(full_name);

        el.textContent = display_name;

        // tooltip only when the name is actually cut off
        if (display_name === full_name) {
            el.removeAttribute('title');
        } else {
            el.setAttribute('title', full_name);
        }
    }

    private truncateCityDisplayName(name: string, max_characters: number = 15): string {
        const normalized = String(name ?? '');
        if (normalized.length <= max_characters) return normalized;
        return `${normalized.slice(0, max_characters).trimEnd()}…`;
    }

    private toTypingDisplayText(text: string): string {
        return text.replace(/ /g, '\u00A0');
    }

    private clearPlayingPanel(): void {
        this.renderCityLabel(this.typing_prev_city_el, '');
        this.renderCityLabel(this.typing_next_city_el, '');
        if (this.route_name_el) this.route_name_el.textContent = '';
        this.renderRunStats(0, 0, 0, 0, 0, 100);
        this.renderElapsedTime(0);
    }

    private renderMenuRouteRecord(record: MenuRouteRecord | null): void {
        if (this.menu_route_record_combo_el) {
            this.menu_route_record_combo_el.textContent = record ? `${Math.max(0, Math.round(record.bestCombo))}` : '--';
        }

        if (this.menu_route_record_gross_wpm_el) {
            this.menu_route_record_gross_wpm_el.textContent = this.formatOptionalOneDecimal(record?.bestGrossWpm);
        }

        if (this.menu_route_record_net_wpm_el) {
            this.menu_route_record_net_wpm_el.textContent = this.formatOptionalOneDecimal(record?.bestNetWpm);
        }

        if (this.menu_route_record_accuracy_el) {
            const formattedAccuracy = this.formatOptionalOneDecimal(record?.bestAccuracy);
            this.menu_route_record_accuracy_el.textContent = formattedAccuracy === '--' ? '--' : `${formattedAccuracy}%`;
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

    private formatOneDecimal(value: number): string {
        const safeValue = Number.isFinite(value) ? Math.max(0, value) : 0;
        return safeValue.toFixed(1);
    }

    private formatOptionalOneDecimal(value: number | null | undefined): string {
        if (value == null) return '--';
        return this.formatOneDecimal(value);
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

