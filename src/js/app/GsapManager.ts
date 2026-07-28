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

    // Mouse info card

    moveTo(el: HTMLElement, x: number, y: number): void {
        gsap.set(el, { x, y });
    }

    showBubble(el: HTMLElement, x: number, y: number): void {
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
