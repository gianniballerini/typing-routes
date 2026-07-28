import gsap from 'gsap';
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin';

gsap.registerPlugin(MorphSVGPlugin);

class LoadingManager {
    private readonly loadingElement: HTMLElement | null;
    private readonly contentElement: HTMLElement | null;
    private readonly valueElement: HTMLElement | null;
    private readonly ctaElement: HTMLElement | null;
    private readonly transitionPathElement: SVGPathElement;
    private readonly transitionBaseElement: SVGPathElement | null;
    private readonly homeElement: HTMLElement | null;

    private progress = { value: 0 };
    private tween: gsap.core.Tween | null = null;
    private exitTimeline: gsap.core.Timeline | null = null;
    private readyToStart = false;
    private exitStarted = false;

    // Three states of the same curve, sharing a command structure so MorphSVG maps
    // point-to-point: full cover -> sagging bulge -> collapsed against the top edge.
    private readonly revealPathCovered = 'M 0 0 V 100 Q 50 100 100 100 V 0 z';
    private readonly revealPathBulge = 'M 0 0 V 50 Q 50 100 100 50 V 0 z';
    private readonly revealPathGone = 'M 0 0 V 0 Q 50 0 100 0 V 0 z';

    private readonly handleStartClick = (): void => {
        if (!this.readyToStart || this.exitStarted) return;
        this.playExitAnimation();
    };

    constructor() {
        this.loadingElement = document.querySelector('.loading-screen');
        this.contentElement = document.querySelector('.loading-screen__content');
        this.valueElement = document.querySelector('.loading-screen__value');
        this.ctaElement = document.querySelector('.loading-screen__cta');
        this.transitionPathElement = document.querySelector('.loading-screen__transition-path') || document.createElementNS('http://www.w3.org/2000/svg', 'path');
        this.transitionBaseElement = document.querySelector('.loading-screen__transition-base');
        this.homeElement = document.querySelector('.home');

        this.transitionPathElement.setAttribute('d', this.revealPathCovered);
        this.transitionBaseElement?.setAttribute('d', this.revealPathCovered);

        this.setProgress(0, true);
    }

    setProgress(value: number, immediate = false): void {
        const target = Math.max(0, Math.min(100, value));

        if (immediate) {
            this.tween?.kill();
            this.progress.value = target;
            this.render();
            return;
        }

        this.tween = gsap.to(this.progress, {
            value: target,
            duration: 0.4,
            ease: 'power3.out',
            overwrite: true,
            onUpdate: () => this.render(),
        });
    }

    private render(): void {
        if (!this.valueElement) return;
        this.valueElement.textContent = String(Math.round(this.progress.value));
    }

    complete(): void {
        this.tween?.kill();
        this.tween = gsap.to(this.progress, {
            value: 100,
            duration: 0.4,
            ease: 'power3.out',
            overwrite: true,
            onUpdate: () => this.render(),
            onComplete: () => this.unlockStart(),
        });
    }

    private unlockStart(): void {
        if (!this.loadingElement || !this.ctaElement) {
            this.finishLoadingScreen();
            return;
        }

        // Reveal the game layer behind the loader before the upward exit starts.
        this.homeElement?.classList.remove('home--loading');

        this.readyToStart = true;
        this.ctaElement.classList.add('loading-screen__cta--visible');
        this.ctaElement.setAttribute('aria-hidden', 'false');
        this.loadingElement.addEventListener('click', this.handleStartClick);
    }

    private playExitAnimation(): void {
        if (!this.loadingElement || this.exitStarted) return;

        this.exitStarted = true;
        this.readyToStart = false;
        this.loadingElement.removeEventListener('click', this.handleStartClick);

        this.tween?.kill();
        this.exitTimeline?.kill();

        this.loadingElement.classList.add('loading-screen--exiting');

        // No `overwrite` here: each path gets two chained morphs, and overwrite: true
        // would make the second one kill the first the moment it is created.
        this.exitTimeline = gsap.timeline({
            onComplete: () => this.finishLoadingScreen(),
        });

        // The sheet leaves upward in two beats: it accelerates away while its bottom
        // edge sags into a curve (power2.in), then that curve flattens out against the
        // top as it settles (power2.out). The dark layer trails the gradient one so a
        // shadow band follows the coloured edge instead of everything cross-fading.
        this.exitTimeline
            .to(this.contentElement, {
                autoAlpha: 0,
                y: -24,
                duration: 0.3,
                ease: 'power2.in',
            }, 0)
            .to(this.transitionPathElement, {
                morphSVG: this.revealPathBulge,
                duration: 0.4,
                ease: 'power2.in',
            }, 0.08)
            .to(this.transitionPathElement, {
                morphSVG: this.revealPathGone,
                duration: 0.36,
                ease: 'power2.out',
            }, 0.48)
            .to(this.transitionBaseElement, {
                morphSVG: this.revealPathBulge,
                duration: 0.4,
                ease: 'power2.in',
            }, 0.16)
            .to(this.transitionBaseElement, {
                morphSVG: this.revealPathGone,
                duration: 0.36,
                ease: 'power2.out',
            }, 0.56)
            ;

    }

    private finishLoadingScreen(): void {
        this.loadingElement?.removeEventListener('click', this.handleStartClick);
        this.homeElement?.classList.remove('home--loading');

        if (this.loadingElement) {
            this.loadingElement.classList.add('hidden');
            this.loadingElement.style.display = 'none';
        }
    }
}
export { LoadingManager };
