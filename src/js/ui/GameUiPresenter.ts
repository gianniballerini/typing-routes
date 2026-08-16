import { GsapManager } from '../app/GsapManager';
import type { GameStateValue } from '../GameState';
import { GameState } from '../GameState';
import type { Route } from '../Route';
import { renderStars } from './StarsView';

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
    private menu_route_stars_el: HTMLElement | null;
    private menu_route_image_container_el: HTMLElement | null;
    private menu_route_image_el: HTMLImageElement | null;
    private closeRequestedHandler: (() => void) | null;

    private start_button_el: HTMLElement | null;
    private menu_welcome_el: HTMLElement | null;
    private sign_button_els: HTMLElement[];
    private sign_button_how_to_play_el: HTMLElement | null;
    private sign_button_route_list_el: HTMLElement | null;
    private sign_button_achievements_el: HTMLElement | null;
    private sign_button_settings_el: HTMLElement | null;
    private last_rendered_state: GameStateValue | null;
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
    private countdown_el: HTMLElement | null;
    private countdown_value_el: HTMLElement | null;
    private quit_button_el: HTMLElement | null;
    private quitRequestedHandler: (() => void) | null;
    private typingInputHandler: ((inputText: string) => void) | null;
    private audio_toggle_el: HTMLElement | null;
    private audio_toggle_label_el: HTMLElement | null;
    private modalOpenPredicate: (() => boolean) | null;
    private mapCursorRequestedHandler: (() => void) | null;
    // Reported rather than acted on: the trophy rules that watch how the player
    // drives the menu live in `Achievements`, not here.
    private menuKeyboardStepHandler: (() => void) | null;
    private menuKeyboardActivationHandler: (() => void) | null;
    private pointerActivationHandler: (() => void) | null;
    private menuNavigationSuspended: boolean;
    private last_focused_menu_button_el: HTMLElement | null;
    private menu_signs_parked: boolean;

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
        this.menu_route_stars_el = document.querySelector('.game-menu__route-stars');
        this.menu_route_image_container_el = document.querySelector('.game-menu__info-card-image');
        this.menu_route_image_el = this.menu_route_image_container_el?.querySelector('img') ?? null;

        this.start_button_el = document.querySelector('.game-menu__button');
        this.menu_welcome_el = document.querySelector('.game-menu__welcome');
        this.sign_button_els = Array.from(document.querySelectorAll('.game-menu__sign-button'));
        this.last_rendered_state = null;
        this.sign_button_how_to_play_el = document.querySelector('.game-menu__sign-button--how-to-play');
        this.sign_button_route_list_el = document.querySelector('.game-menu__sign-button--route-list');
        this.sign_button_achievements_el = document.querySelector('.game-menu__sign-button--achievements');
        this.sign_button_settings_el = document.querySelector('.game-menu__sign-button--settings');
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
        this.countdown_el = document.querySelector('.game-playing__countdown');
        this.countdown_value_el = document.querySelector('.game-playing__countdown-value');
        this.quit_button_el = document.querySelector('.game-playing__quit');
        this.quitRequestedHandler = null;
        this.quit_button_el?.addEventListener('click', this.handleQuitButtonClick);
        this.typingInputHandler = null;
        this.audio_toggle_el = document.querySelector('.audio-toggle');
        this.audio_toggle_label_el = document.querySelector('.audio-toggle__label');
        this.modalOpenPredicate = null;
        this.mapCursorRequestedHandler = null;
        this.menuKeyboardStepHandler = null;
        this.menuKeyboardActivationHandler = null;
        this.pointerActivationHandler = null;
        this.menuNavigationSuspended = false;
        this.last_focused_menu_button_el = null;
        this.menu_signs_parked = false;
        this.renderElapsedTime(0);

        window.addEventListener('keydown', this.handleMenuNavigationKeydown);
    }

    // The presenter is built before ModalController exists, so the menu learns
    // about open modals through a predicate wired up afterwards.
    setModalOpenPredicate(predicate: () => boolean): void {
        this.modalOpenPredicate = predicate;
    }

    /**
     * The menu column is the vertical half of the two-zone arrow model: up and
     * down walk the menu signs and, once a route is picked, Empezar, while right
     * hands the arrows over to the map. Bound on the window so the first arrow
     * press can pull focus into the menu from nowhere; an open modal parks this
     * handler until it closes, and so does the map cursor while it is active.
     */
    private handleMenuNavigationKeydown = (event: KeyboardEvent): void => {
        const menuEl = this.game_menu_el;
        if (this.last_rendered_state !== GameState.MENU) return;
        if (!menuEl || menuEl.classList.contains('hidden')) return;
        // Clicking a modal's own non-focusable chrome drops focus back to the
        // body, so focus alone cannot tell "nothing focused" from "modal open".
        if (this.modalOpenPredicate?.()) return;
        if (this.menuNavigationSuspended) return;

        const activeEl = document.activeElement;
        const focusIsInMenu = activeEl instanceof HTMLElement && menuEl.contains(activeEl);
        // Focus sits somewhere else entirely: leave those keys alone. The map
        // canvas is the exception — it takes focus on any click, and having
        // clicked the map is the same starting point as having focused nothing.
        if (!focusIsInMenu && !this.isLooseFocus(activeEl)) return;

        // Works from a focused sign and from nothing focused alike, so reaching
        // the map never takes a detour through the menu first.
        if (event.key === 'ArrowRight') {
            event.preventDefault();
            if (focusIsInMenu && activeEl instanceof HTMLElement) activeEl.blur();
            this.mapCursorRequestedHandler?.();
            return;
        }

        const step = this.getMenuNavigationStep(event.key);
        if (step === 0) return;

        const buttons = this.getNavigableMenuButtons();
        if (buttons.length === 0) return;

        event.preventDefault();

        const currentIndex = activeEl instanceof HTMLElement ? buttons.indexOf(activeEl) : -1;
        const nextIndex = currentIndex === -1
            ? 0
            : (currentIndex + step + buttons.length) % buttons.length;

        this.focusMenuButton(buttons[nextIndex]);
        this.menuKeyboardStepHandler?.();
    };

    private getMenuNavigationStep(key: string): number {
        if (key === 'ArrowDown') return 1;
        if (key === 'ArrowUp') return -1;
        return 0;
    }

    private isLooseFocus(activeEl: Element | null): boolean {
        if (activeEl === null || activeEl === document.body) return true;
        return activeEl.classList.contains('maplibregl-canvas');
    }

    private focusMenuButton(el: HTMLElement): void {
        this.last_focused_menu_button_el = el;
        el.focus();
    }

    onMapCursorRequested(handler: () => void): void {
        this.mapCursorRequestedHandler = handler;
    }

    // Set while the map cursor owns the arrow keys, so both zones never move at once.
    setMenuNavigationSuspended(suspended: boolean): void {
        this.menuNavigationSuspended = suspended;
    }

    // Coming back from the map: the ring returns to the sign it left, or to the
    // top of the column when that one is gone (the signs park while a card is open).
    focusMenuColumn(): void {
        const buttons = this.getNavigableMenuButtons();
        if (buttons.length === 0) return;

        const lastFocused = this.last_focused_menu_button_el;
        const target = lastFocused && buttons.includes(lastFocused) ? lastFocused : buttons[0];

        this.focusMenuButton(target);
    }

    // Empezar lives inside the route card, so it only joins the walk once a route
    // is selected and the card is on screen.
    private getNavigableMenuButtons(): HTMLElement[] {
        const candidates = [...this.sign_button_els, this.start_button_el];
        return candidates.filter((el): el is HTMLElement => el !== null && this.isVisible(el));
    }

    // The closed route card keeps its box so the lift animation has somewhere to
    // play, and is hidden with `visibility` — which offsetParent does not catch.
    private isVisible(el: HTMLElement): boolean {
        return el.offsetParent !== null && window.getComputedStyle(el).visibility !== 'hidden';
    }

    onStartRequested(handler: () => void): void {
        this.bindActivation(this.start_button_el, handler);
    }

    onHowToPlayRequested(handler: () => void): void {
        this.bindActivation(this.sign_button_how_to_play_el, handler);
    }

    onRouteListRequested(handler: () => void): void {
        this.bindActivation(this.sign_button_route_list_el, handler);
    }

    onAchievementsRequested(handler: () => void): void {
        this.bindActivation(this.sign_button_achievements_el, handler);
    }

    onSettingsRequested(handler: () => void): void {
        this.bindActivation(this.sign_button_settings_el, handler);
    }

    onAudioToggleRequested(handler: () => void): void {
        this.bindActivation(this.audio_toggle_el, handler);
    }

    renderAudioMuted(muted: boolean): void {
        this.audio_toggle_el?.classList.toggle('audio-toggle--muted', muted);
        this.audio_toggle_el?.setAttribute('aria-pressed', String(muted));
        this.audio_toggle_el?.setAttribute('aria-label', muted ? 'Activar sonido' : 'Silenciar');

        if (this.audio_toggle_label_el) {
            this.audio_toggle_label_el.textContent = muted ? 'Sonido apagado' : 'Sonido encendido';
        }
    }

    // The menu buttons are divs, so Enter and Space have to be wired by hand for
    // the whole menu to be reachable without a mouse.
    private bindActivation(el: HTMLElement | null, handler: () => void): void {
        el?.addEventListener('click', (event: MouseEvent) => {
            // `click` also fires for a keyboard-activated element in some paths, so
            // only a real pointer counts as having reached for the mouse. A synthetic
            // click reports detail 0.
            if (event.detail > 0) this.pointerActivationHandler?.();
            handler();
        });
        el?.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.key !== 'Enter' && event.key !== ' ') return;

            event.preventDefault();
            // Empezar flips the game into COUNTDOWN synchronously; without this the
            // same keystroke would reach KeyboardInputCoordinator, where Enter/Space
            // skips the countdown.
            event.stopPropagation();
            // The audio toggle also goes through here and is not part of the menu
            // walk, so only the signs and Empezar count as "chose an option".
            if (el && this.getNavigableMenuButtons().includes(el)) this.menuKeyboardActivationHandler?.();
            handler();
        });
    }

    // The three menu-input reports behind the "¿Qué es un mouse?" trophy. They
    // carry no meaning here — `Achievements` decides what a run of them adds up to.

    onMenuKeyboardStep(handler: () => void): void {
        this.menuKeyboardStepHandler = handler;
    }

    onMenuKeyboardActivation(handler: () => void): void {
        this.menuKeyboardActivationHandler = handler;
    }

    onPointerActivation(handler: () => void): void {
        this.pointerActivationHandler = handler;
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
        // Only a real move back into the menu earns the drop-in: the very first
        // render is the app booting straight into it, not a view change.
        const isReturningToMenu = showMenu
            && this.last_rendered_state !== null
            && this.last_rendered_state !== GameState.MENU;
        this.last_rendered_state = state;

        this.game_menu_el?.classList.toggle('hidden', !showMenu);
        this.game_playing_el?.classList.toggle('hidden', showMenu);

        if (showMenu) {
            this.renderTyping('', '');
            this.clearPlayingPanel();
            this.clearKeyboardOpenState();
            if (isReturningToMenu) this.playMenuSignsDropAnimation();
        }
    }

    // Hides the signs behind the welcome block ahead of time. Needed when the
    // menu is uncovered by something outside this class — the loading screen —
    // since the plates would otherwise be caught sitting in their slots for a
    // frame before the drop takes them back up.
    prepareMenuSignsDrop(): void {
        if (!this.sign_button_els.length) return;

        this.menu_signs_parked = true;

        for (const sign of this.sign_button_els) {
            sign.classList.add('game-menu__sign-button--dropping');
        }

        GsapManager.parkMenuSigns({ signs: this.sign_button_els, hideBehind: this.menu_welcome_el });
    }

    // Measured against the live layout, so it has to run once the menu is
    // actually on screen — after the un-hide above, or after the loading screen
    // has lifted away.
    playMenuSignsDropAnimation(): void {
        if (!this.sign_button_els.length) return;

        this.menu_signs_parked = false;

        for (const sign of this.sign_button_els) {
            sign.classList.remove('game-menu__sign-button--parked');
            sign.classList.add('game-menu__sign-button--dropping');
        }

        GsapManager.playMenuSignsDrop(
            { signs: this.sign_button_els, hideBehind: this.menu_welcome_el },
            () => {
                for (const sign of this.sign_button_els) {
                    sign.classList.remove('game-menu__sign-button--dropping');
                }
            }
        );
    }

    // The route card takes the screen for itself: the plates go back up behind the
    // logo and stay there until the card is closed.
    private liftMenuSigns(): void {
        if (this.menu_signs_parked || !this.sign_button_els.length) return;

        this.menu_signs_parked = true;

        for (const sign of this.sign_button_els) {
            sign.classList.add('game-menu__sign-button--dropping');
        }

        GsapManager.playMenuSignsLift(
            { signs: this.sign_button_els, hideBehind: this.menu_welcome_el },
            () => {
                for (const sign of this.sign_button_els) {
                    sign.classList.remove('game-menu__sign-button--dropping');
                    // `isVisible` reads `visibility`, so parking also takes the
                    // plates out of the arrow-key walk.
                    sign.classList.add('game-menu__sign-button--parked');
                }
            }
        );
    }

    private dropMenuSigns(): void {
        if (!this.menu_signs_parked) return;
        // The parked pose is measured against the live layout. Ending a run
        // deselects the route while the menu is still hidden, so the drop
        // `renderState` plays on the way back in is the one that can measure.
        if (!this.game_menu_el || this.game_menu_el.classList.contains('hidden')) return;

        this.playMenuSignsDropAnimation();
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

    setMenuRoutePreview(route: Route, record: MenuRouteRecord | null = null, stars: number | null = null): void {
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

        renderStars(this.menu_route_stars_el, stars);
        this.renderMenuRouteRecord(record);

        this.menu_info_card_el?.classList.remove('hidden');

        this.liftMenuSigns();
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
        this.dropMenuSigns();

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
        renderStars(this.menu_route_stars_el, null);
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

    // One tick of the pre-run countdown. `isGo` marks the final beat, which gets
    // its own colour instead of the plain number treatment.
    renderCountdown(label: string, isGo: boolean = false): void {
        const el = this.countdown_el;
        if (!el) return;

        if (this.countdown_value_el) this.countdown_value_el.textContent = label;

        el.classList.remove('hidden');
        el.classList.toggle('game-playing__countdown--go', isGo);

        el.classList.remove('game-playing__countdown--tick');
        // Forces a reflow so the pop replays on every number instead of only
        // playing the first time the class lands. The class is dropped here on the
        // next tick rather than on `animationend`: the number animation ends
        // faded out, and removing it any earlier would snap the old digit back to
        // full opacity in the gap before the next one.
        void el.offsetWidth;
        el.classList.add('game-playing__countdown--tick');
    }

    hideCountdown(): void {
        if (!this.countdown_el) return;

        this.countdown_el.classList.add('hidden');
        this.countdown_el.classList.remove('game-playing__countdown--tick', 'game-playing__countdown--go');
        if (this.countdown_value_el) this.countdown_value_el.textContent = '';
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
        this.hideCountdown();
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

