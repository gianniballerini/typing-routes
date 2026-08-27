import { Settings } from '../Settings';
import type { AudioManager } from './AudioManager';

// Every interactive element in the Pug views already carries a shared `.button`
// class, and the route grid's tiles and the trophy rows are the exceptions worth
// naming. One set of delegated listeners therefore covers the whole UI — menu
// signs, modal closes, list filters, quit, share, the audio toggle — without
// threading an `AudioManager` through `GameUiPresenter` and every modal.
//
// Anything a cursor can come to rest on, whether it got there by pointer or by
// arrow key.
const UI_HOVER_SELECTOR = '.button, .route-list-modal__tile, .achievements-modal__row';

// Only what actually does something when pressed. Trophy rows are a cursor
// target and nothing more — there is no trophy to open — so they take the hover
// voice but never the click, which would otherwise announce a no-op.
const UI_ACTIVATE_SELECTOR = '.button, .route-list-modal__tile';

// Keys that walk the UI rather than activate it. Every navigation path — the
// menu signs in `GameUiPresenter`, the route grid in `RouteListModal`, the
// trophy list in `AchievementsModal` — ends in `.focus()` on an element matching
// `UI_HOVER_SELECTOR`, so listening for the focus move covers them all without
// any of them knowing about audio.
const NAVIGATION_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End', 'PageUp', 'PageDown']);

// A pointer-driven or programmatic focus lands nowhere near a navigation key, so
// this window is what separates "the player walked here" from "focus was moved
// for them" — for instance a modal focusing its close button as it opens.
const NAVIGATION_FOCUS_WINDOW_MS = 100;

// Clicks and hovers on UI chrome, voiced by the UI sound pack. Typing during a
// run is not this class's business: that goes through `AudioManager`'s keyboard
// pack instead.
class UiSoundController {
    private readonly audioManager: AudioManager;
    private lastHoverAt = -Infinity;
    private lastNavigationKeyAt = -Infinity;

    constructor(audioManager: AudioManager) {
        this.audioManager = audioManager;
    }

    init(): void {
        // Capture phase throughout: the menu buttons stop propagation on their own
        // activation handlers, so a bubbling listener would never see them.
        document.addEventListener('pointerdown', this.handlePointerDown, true);
        document.addEventListener('pointerover', this.handlePointerOver, true);
        document.addEventListener('keydown', this.handleKeydown, true);
        document.addEventListener('focusin', this.handleFocusIn, true);
    }

    destroy(): void {
        document.removeEventListener('pointerdown', this.handlePointerDown, true);
        document.removeEventListener('pointerover', this.handlePointerOver, true);
        document.removeEventListener('keydown', this.handleKeydown, true);
        document.removeEventListener('focusin', this.handleFocusIn, true);
    }

    private handlePointerDown = (event: PointerEvent): void => {
        if (!this.targetElement(event.target, UI_ACTIVATE_SELECTOR)) return;

        this.audioManager.playUiClick();
    };

    private handlePointerOver = (event: PointerEvent): void => {
        const element = this.targetElement(event.target, UI_HOVER_SELECTOR);
        if (!element) return;

        // `pointerover` fires again for every child crossed inside the same
        // button; only the entry into the button itself is a hover.
        const from = event.relatedTarget;
        if (from instanceof Node && element.contains(from)) return;

        this.playHover();
    };

    private handleKeydown = (event: KeyboardEvent): void => {
        // Enter, Space and the arrows are all live during a run — Enter and Space
        // skip the countdown — where the typing pack owns the keystroke. One press
        // must not fire both sprites.
        if (this.audioManager.areKeySoundsEnabled()) return;

        // Held arrows walk the route grid tile by tile, so repeats count here even
        // though a held Enter is not a second press.
        if (NAVIGATION_KEYS.has(event.key)) {
            this.lastNavigationKeyAt = performance.now();
            return;
        }

        if (event.repeat) return;
        if (event.key !== 'Enter' && event.key !== ' ') return;
        if (!this.targetElement(document.activeElement, UI_ACTIVATE_SELECTOR)) return;

        this.audioManager.playUiClick();
    };

    // Walking the menu signs or the route grid with the arrows reads as moving a
    // cursor over the options, so it gets the hover voice; Enter then lands the
    // full click.
    private handleFocusIn = (event: FocusEvent): void => {
        if (performance.now() - this.lastNavigationKeyAt > NAVIGATION_FOCUS_WINDOW_MS) return;
        if (!this.targetElement(event.target, UI_HOVER_SELECTOR)) return;

        this.playHover();
    };

    // Sweeping the pointer across the route grid crosses a tile every few
    // milliseconds, and a held arrow key walks it nearly as fast; either would
    // rattle rather than click.
    private playHover(): void {
        const now = performance.now();
        if (now - this.lastHoverAt < Settings.audio.ui.hoverThrottleMs) return;

        this.lastHoverAt = now;
        this.audioManager.playUiHover();
    }

    private targetElement(target: EventTarget | null, selector: string): HTMLElement | null {
        return target instanceof Element
            ? target.closest<HTMLElement>(selector)
            : null;
    }
}

export { UiSoundController };
