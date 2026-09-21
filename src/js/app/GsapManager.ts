import gsap from 'gsap';
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin';
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(MorphSVGPlugin);
gsap.registerPlugin(SplitText);

interface LoadingExitElements {
    content: HTMLElement | null;
    transitionPath: SVGPathElement | null;
    transitionBase: SVGPathElement | null;
}

interface LoadingIntroElements {
    title: HTMLElement | null;
    welcome: HTMLElement | null;
}

interface MenuKeysTipElements {
    container: HTMLElement;
    note: HTMLElement | null;
    // Shaft first, then the head, so the arrow is drawn in the order a hand would.
    arrowLines: SVGPathElement[];
    keys: SVGGElement[];
}

interface ModalElements {
    overlay: HTMLElement | null;
    panel: HTMLElement | null;
}

interface MenuSignsDropElements {
    signs: HTMLElement[];
    hideBehind: HTMLElement | null;
}

// Every GSAP call in the app lives here: modules describe *what* they want
// animated and this manager owns the tweens, timelines and plugin registration.
class GsapManager {

    // Three states of the same curve, sharing a command structure so MorphSVG maps
    // point-to-point: full cover -> sagging bulge -> collapsed against the top edge.
    readonly loadingPathCovered = 'M 0 0 V 100 Q 50 100 100 100 V 0 z';
    private readonly loadingPathBulge = 'M 0 0 V 50 Q 50 100 100 50 V 0 z';
    private readonly loadingPathGone = 'M 0 0 V 0 Q 50 0 100 0 V 0 z';

    private loadingProgressTween: gsap.core.Tween | null = null;
    private loadingIntroTimeline: gsap.core.Timeline | null = null;
    private loadingExitTimeline: gsap.core.Timeline | null = null;
    private menuSignsTimeline: gsap.core.Timeline | null = null;
    private modalTimeline: gsap.core.Timeline | null = null;
    private menuKeysTipTimeline: gsap.core.Timeline | null = null;

    disappearWithSwell(el: HTMLElement): void {
        gsap.timeline()
            .to(el, {
                scale: 1.08,
                duration: 0.12,
                ease: 'power1.out'
            })
            .to(el, {
                scale: 0,
                opacity: 0,
                duration: 0.32,
                ease: 'power2.in'
            });
    }

    // Loading screen

    // The entrance reads top-down: the blue sheet is already there, the title snaps
    // in per character, and the welcome copy starts flowing in before the title has
    // finished so the two beats overlap instead of queueing.
    playLoadingIntro(elements: LoadingIntroElements, onComplete: () => void): void {
        this.loadingIntroTimeline?.kill();

        const titleChars = elements.title ? new SplitText(elements.title, { type: 'chars' }).chars : [];
        const welcomeWords = elements.welcome ? new SplitText(elements.welcome, { type: 'words' }).words : [];

        this.loadingIntroTimeline = gsap.timeline({ onComplete });

        this.loadingIntroTimeline
            // The markup hides both blocks up front so nothing flashes before the
            // split runs; the timeline hands visibility back to the char/word tweens.
            .set([elements.title, elements.welcome].filter(Boolean), { autoAlpha: 1 }, 0)
            .fromTo(titleChars,
                { opacity: 0, y: 18, scale: 0.9 },
                {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    duration: 0.35,
                    ease: 'back.out(1.8)',
                    stagger: 0.035,
                },
                0.25
            )
            .fromTo(welcomeWords,
                { opacity: 0, y: 8 },
                {
                    opacity: 1,
                    y: 0,
                    duration: 0.3,
                    ease: 'power2.out',
                    stagger: 0.045,
                },
                0.6
            );
    }

    // How much of the intro is still to play, so the progress counter can be paced
    // to land with it instead of racing ahead of the text.
    getLoadingIntroRemaining(): number {
        if (!this.loadingIntroTimeline) return 0;
        return Math.max(0, this.loadingIntroTimeline.duration() - this.loadingIntroTimeline.time());
    }

    tweenLoadingProgress(
        progress: { value: number },
        value: number,
        duration: number,
        onUpdate: () => void,
        onComplete?: () => void
    ): void {
        this.killLoadingProgress();
        this.loadingProgressTween = gsap.to(progress, {
            value,
            duration,
            ease: 'power1.out',
            overwrite: true,
            onUpdate,
            onComplete,
        });
    }

    killLoadingProgress(): void {
        this.loadingProgressTween?.kill();
        this.loadingProgressTween = null;
    }

    // The sheet leaves upward in two beats: it accelerates away while its bottom
    // edge sags into a curve (power2.in), then that curve flattens out against the
    // top as it settles (power2.out). The dark layer trails the gradient one so a
    // shadow band follows the coloured edge instead of everything cross-fading.
    playLoadingExit(elements: LoadingExitElements, onComplete: () => void): void {
        this.killLoadingProgress();
        this.loadingIntroTimeline?.kill();
        this.loadingExitTimeline?.kill();

        // No `overwrite` here: each path gets two chained morphs, and overwrite: true
        // would make the second one kill the first the moment it is created.
        this.loadingExitTimeline = gsap.timeline({ onComplete });

        this.loadingExitTimeline
            .to(elements.content, {
                autoAlpha: 0,
                y: -24,
                duration: 0.3,
                ease: 'power2.in',
            }, 0)
            .to(elements.transitionPath, {
                morphSVG: this.loadingPathBulge,
                duration: 0.4,
                ease: 'power2.in',
            }, 0.08)
            .to(elements.transitionPath, {
                morphSVG: this.loadingPathGone,
                duration: 0.36,
                ease: 'power2.out',
            }, 0.48)
            .to(elements.transitionBase, {
                morphSVG: this.loadingPathBulge,
                duration: 0.4,
                ease: 'power2.in',
            }, 0.16)
            .to(elements.transitionBase, {
                morphSVG: this.loadingPathGone,
                duration: 0.36,
                ease: 'power2.out',
            }, 0.56)
            ;
    }

    // Game menu

    // Where a plate hides: centred on the welcome logo, which paints over it.
    // Measured off `offsetTop` rather than a bounding rect because the plate may
    // already be sitting on a transform when this is asked a second time, and a
    // rect would fold that offset back into the answer. Without a logo to hide
    // behind, just push the plate up past its own height so it still starts
    // off-slot.
    private getMenuSignParkedY(sign: HTMLElement, hideBehind: HTMLElement | null): number {
        if (!hideBehind) return -(sign.offsetHeight * 2);

        return (hideBehind.offsetTop + hideBehind.offsetHeight / 2)
            - (sign.offsetTop + sign.offsetHeight / 2);
    }

    private getMenuSignParkedState(sign: HTMLElement, index: number, hideBehind: HTMLElement | null) {
        return {
            y: this.getMenuSignParkedY(sign, hideBehind),
            rotate: index % 2 === 0 ? -5 : 4,
            scale: 0.94
        };
    }

    // Stacks the plates behind the logo without animating, so they are already
    // out of sight by the time whatever covers the menu lifts away.
    parkMenuSigns(elements: MenuSignsDropElements): void {
        const signs = elements.signs.filter(Boolean);
        if (!signs.length) return;

        this.menuSignsTimeline?.kill();
        gsap.killTweensOf(signs);

        signs.forEach((sign, index) => {
            gsap.set(sign, this.getMenuSignParkedState(sign, index, elements.hideBehind));
        });
    }

    // The parked plates fall into their slots one after the other. Safe to call
    // whether or not they were parked first: the tween declares its own start.
    playMenuSignsDrop(elements: MenuSignsDropElements, onComplete?: () => void): void {
        const signs = elements.signs.filter(Boolean);
        if (!signs.length) {
            onComplete?.();
            return;
        }

        this.menuSignsTimeline?.kill();
        gsap.killTweensOf(signs);

        this.menuSignsTimeline = gsap.timeline({
            onComplete: () => {
                // Hands the transform back to CSS, otherwise the inline one left
                // by the timeline would outrank the hover tilt.
                gsap.set(signs, { clearProps: 'transform' });
                onComplete?.();
            }
        });

        signs.forEach((sign, index) => {
            // Bottom plate first, so the stack fills upwards towards the logo.
            const startsAt = (signs.length - 1 - index) * 0.13;

            this.menuSignsTimeline!
                // bounce.out does the landing itself: the plate hits its slot and
                // settles in two quick diminishing hops.
                .fromTo(sign,
                    this.getMenuSignParkedState(sign, index, elements.hideBehind),
                    { y: 0, duration: 0.72, ease: 'bounce.out' },
                    startsAt
                )
                // The tilt straightens on its own clock, overshooting slightly so
                // the plate rocks level a beat after it has already landed.
                .to(sign,
                    { rotate: 0, scale: 1, duration: 0.5, ease: 'back.out(2.4)' },
                    startsAt + 0.18
                );
        });
    }

    // The reverse of the drop: the plates are picked back up behind the logo and
    // left parked there, so the route card gets the screen to itself. Top plate
    // first, which is the drop's stagger read backwards.
    playMenuSignsLift(elements: MenuSignsDropElements, onComplete?: () => void): void {
        const signs = elements.signs.filter(Boolean);
        if (!signs.length) {
            onComplete?.();
            return;
        }

        this.menuSignsTimeline?.kill();
        gsap.killTweensOf(signs);

        this.menuSignsTimeline = gsap.timeline({ onComplete });

        signs.forEach((sign, index) => {
            const parkedState = this.getMenuSignParkedState(sign, index, elements.hideBehind);
            const startsAt = index * 0.07;

            this.menuSignsTimeline!
                .to(sign,
                    { ...parkedState, duration: 0.42, ease: 'back.in(1.6)' },
                    startsAt
                );
        });
    }

    // Menu keys tip

    hideMenuKeysTip(elements: MenuKeysTipElements): void {
        this.menuKeysTipTimeline?.kill();
        gsap.set(elements.container, { autoAlpha: 0, y: 0 });
    }

    // Played once the menu signs have landed, read in the order the tip is
    // meant to be read: the note is jotted down, the arrow is drawn out of it
    // towards the corner, and the keys it points at pop in one by one.
    playMenuKeysTipIn(elements: MenuKeysTipElements): void {
        this.menuKeysTipTimeline?.kill();

        const timeline = gsap.timeline();
        timeline.set(elements.container, { autoAlpha: 1, y: 0 }, 0);

        if (elements.note) {
            timeline.fromTo(elements.note,
                { opacity: 0, y: 12, rotation: -12, scale: 0.9 },
                { opacity: 1, y: 0, rotation: -5, scale: 1, duration: 0.45, ease: 'back.out(2)' },
                0
            );
        }

        // Each stroke is "drawn" by sliding a dash as long as the path off it.
        let drawAt = 0.3;
        for (const line of elements.arrowLines) {
            const length = line.getTotalLength();
            const duration = Math.max(0.12, length / 180);

            timeline.fromTo(line,
                { strokeDasharray: length, strokeDashoffset: length },
                { strokeDashoffset: 0, duration, ease: 'power1.inOut' },
                drawAt
            );
            drawAt += duration;
        }

        if (elements.keys.length) {
            timeline.fromTo(elements.keys,
                { opacity: 0, scale: 0.4, y: 8, transformOrigin: '50% 50%' },
                { opacity: 1, scale: 1, y: 0, duration: 0.4, stagger: 0.08, ease: 'back.out(2.4)' },
                drawAt - 0.05
            );
        }

        this.menuKeysTipTimeline = timeline;
    }

    // Leaves as one piece and quickly, alongside the plates lifting away.
    playMenuKeysTipOut(elements: MenuKeysTipElements): void {
        this.menuKeysTipTimeline?.kill();

        this.menuKeysTipTimeline = gsap.timeline()
            .to(elements.container, { autoAlpha: 0, y: 12, duration: 0.2, ease: 'power2.in' });
    }

    // Achievement toast

    // Drops in from above the viewport edge and overshoots slightly, so a trophy
    // earned behind the route-complete modal still catches the eye.
    playAchievementToastIn(el: HTMLElement): void {
        gsap.fromTo(el,
            { opacity: 0, y: -24, scale: 0.92 },
            { opacity: 1, y: 0, scale: 1, duration: 0.35, ease: 'back.out(1.7)' }
        );
    }

    // The card is removed by the caller once this lands, so the stack does not
    // keep collapsed nodes around.
    playAchievementToastOut(el: HTMLElement, onComplete: () => void): void {
        gsap.killTweensOf(el);
        gsap.to(el, {
            opacity: 0,
            y: -16,
            scale: 0.96,
            duration: 0.25,
            ease: 'power2.in',
            onComplete
        });
    }

    // Modal

    // The panel is one more green road sign, so it swings in the way the menu
    // plates do: dropped from above, tilted, and settling on its hook. A null
    // overlay means the backdrop is already up (switching states in place).
    playModalIn(elements: ModalElements): void {
        this.modalTimeline?.kill();

        const timeline = gsap.timeline();

        if (elements.overlay) {
            timeline.fromTo(elements.overlay,
                { opacity: 0 },
                { opacity: 1, duration: 0.25, ease: 'power1.out' },
                0
            );
        }

        if (elements.panel) {
            timeline.fromTo(elements.panel,
                { opacity: 0, y: -60, rotation: -4, scale: 0.94, transformOrigin: '50% 0%' },
                {
                    opacity: 1,
                    y: 0,
                    rotation: 0,
                    scale: 1,
                    duration: 0.5,
                    ease: 'back.out(1.6)',
                    // Hand the transform back to CSS so nothing inside the panel
                    // inherits a stale inline one.
                    clearProps: 'transform,opacity'
                },
                0.05
            );
        }

        this.modalTimeline = timeline;
    }

    // Snatched back up the way it came, quicker than it arrived so closing never
    // feels like waiting. The caller hides the shell once this lands.
    playModalOut(elements: ModalElements, onComplete: () => void): void {
        this.modalTimeline?.kill();

        const timeline = gsap.timeline({
            onComplete: () => {
                gsap.set([elements.overlay, elements.panel].filter(Boolean), { clearProps: 'transform,opacity' });
                onComplete();
            }
        });

        if (elements.panel) {
            timeline.to(elements.panel, {
                opacity: 0,
                y: -40,
                rotation: 3,
                scale: 0.96,
                transformOrigin: '50% 0%',
                duration: 0.22,
                ease: 'power2.in'
            }, 0);
        }

        if (elements.overlay) {
            timeline.to(elements.overlay, { opacity: 0, duration: 0.22, ease: 'power1.in' }, 0.04);
        }

        this.modalTimeline = timeline;
    }

    // Toast

    // Mirrors the achievement pair, but travelling the other way: this stack
    // lives at the bottom edge, so it has to read as rising out of it rather
    // than dropping in from above.
    playToastIn(el: HTMLElement): void {
        gsap.fromTo(el,
            { opacity: 0, y: 24, scale: 0.94 },
            { opacity: 1, y: 0, scale: 1, duration: 0.35, ease: 'back.out(1.7)' }
        );
    }

    playToastOut(el: HTMLElement, onComplete: () => void): void {
        gsap.killTweensOf(el);
        gsap.to(el, {
            opacity: 0,
            y: 16,
            scale: 0.96,
            duration: 0.25,
            ease: 'power2.in',
            onComplete
        });
    }

    // Mouse info card

    moveTo(el: HTMLElement, x: number, y: number): void {
        gsap.set(el, { x, y });
    }

    showBubble(el: HTMLElement, x: number, y: number): void {
        // A hide still running would otherwise keep fading the bubble out
        // underneath the entrance.
        gsap.killTweensOf(el);
        gsap.set(el, { x, y });
        gsap.timeline()
            .fromTo(el,
                { opacity: 0, scaleX: 0.5, scaleY: 0.3 },
                { opacity: 1, scaleX: 1.1, scaleY: 0.9, duration: 0.15, ease: 'power1.out' }
            )
            .to(el, { scaleX: 1, scaleY: 1, duration: 0.15, ease: 'power1.out' });
    }

    hideBubble(el: HTMLElement): void {
        gsap.killTweensOf(el);
        gsap.to(el, {
            opacity: 0,
            scale: 0.3,
            duration: 0.2,
            ease: 'power2.in'
        });
    }

    animateTextIn(el: HTMLElement): void {
        const split = new SplitText(el, { type: "chars" });

        gsap.fromTo(split.chars,
            { opacity: 0, y: 10, rotateX: -40 },
            {
                opacity: 1,
                y: 0,
                rotateX: 0,
                duration: 0.4,
                ease: "back.out(1.7)",
                stagger: 0.02
            }
        );
    }

    animateTextPerWord(el: HTMLElement): void {
        const split = new SplitText(el, { type: "words" });
        gsap.fromTo(split.words,
            { opacity: 0, y: 8 },
            { opacity: 1, y: 0, duration: 0.3, stagger: 0.04, ease: "power2.out" }
        );
    }

}

const gsapManager = new GsapManager();
export { gsapManager as GsapManager };
export type { MenuKeysTipElements };
