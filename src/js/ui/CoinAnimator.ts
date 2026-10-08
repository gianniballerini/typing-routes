// Drives the header coins' motion: a coin spinning down on a table. The
// keyframes live in `_header_icon_button.scss`; this class only toggles the
// classes that start them.
//
//   coin--nudge   hover: a small, short precession wobble (on the spinner)
//   coin--settle  click: a big precession that accelerates into a dead stop
//   coin--toss    click: the quick half/full turn to the new face (on the flipper)
//
// A hover never interrupts a settle; a click always restarts it, even mid-nudge.
const ANIMATION_CLASSES = ['coin--nudge', 'coin--settle', 'coin--toss'];
const ANIMATION_NAMES: Record<string, string> = {
    'coin-nudge': 'coin--nudge',
    'coin-settle': 'coin--settle',
    'coin-toss': 'coin--toss',
};

class CoinAnimator {
    // Fired on a real pointer entering the coin (not on keyboard focus), so the
    // owner can voice the hover.
    onPointerHover: (() => void) | null = null;

    private readonly el: HTMLElement;
    private readonly reducedMotion: MediaQueryList;

    constructor(el: HTMLElement) {
        this.el = el;
        this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

        el.addEventListener('pointerenter', this.handlePointerEnter);
        el.addEventListener('focus', this.handleFocus);
        el.addEventListener('animationend', this.handleAnimationEnd);
    }

    // Toss to the new face, then settle. The class set is restarted from scratch,
    // so a click during a nudge or an earlier settle replays the full click motion.
    click(): void {
        if (this.reducedMotion.matches) return;

        this.restart('coin--nudge', false);
        this.restart('coin--toss', true);
        this.restart('coin--settle', true);
    }

    private nudge(): void {
        if (this.reducedMotion.matches) return;
        // Hovering again while settling (or already nudging) must not interrupt.
        if (ANIMATION_CLASSES.some((name) => this.el.classList.contains(name) && name !== 'coin--toss')) return;

        this.restart('coin--nudge', true);
    }

    private restart(className: string, add: boolean): void {
        this.el.classList.remove(className);
        if (!add) return;

        void this.el.offsetWidth;
        this.el.classList.add(className);
    }

    private handlePointerEnter = (event: PointerEvent): void => {
        // Touch fires `pointerenter` on tap, right before the click it belongs to.
        if (event.pointerType === 'touch') return;

        this.onPointerHover?.();
        this.nudge();
    };

    private handleFocus = (): void => {
        if (this.el.matches(':focus-visible')) this.nudge();
    };

    private handleAnimationEnd = (event: AnimationEvent): void => {
        // The contact shadow's animation ends alongside the spinner's; only the
        // named coin animations on the coin's own layers count.
        const className = ANIMATION_NAMES[event.animationName];
        if (className) this.el.classList.remove(className);
    };
}

export { CoinAnimator };
