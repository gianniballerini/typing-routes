import { GsapManager } from './app/GsapManager';

class LoadingManager {
    // Loading is over long before the intro is, so the counter is deliberately
    // slow: each reported step crawls, and the final run to 100 is stretched to
    // land with the last word of the welcome text.
    private static readonly PROGRESS_STEP_DURATION = 1.2;
    private static readonly PROGRESS_COMPLETE_MIN_DURATION = 0.6;

    private readonly loadingElement: HTMLElement | null;
    private readonly contentElement: HTMLElement | null;
    private readonly valueElement: HTMLElement | null;
    private readonly progressElement: HTMLElement | null;
    private readonly ctaElement: HTMLElement | null;
    private readonly transitionPathElement: SVGPathElement;
    private readonly transitionBaseElement: SVGPathElement | null;
    private readonly homeElement: HTMLElement | null;
    private readonly titleElement: HTMLElement | null;
    private readonly welcomeElement: HTMLElement | null;

    private progress = { value: 0 };
    private readyToStart = false;
    private exitStarted = false;
    private introFinished = false;
    private progressFinished = false;

    private readonly handleStartClick = (): void => {
        if (!this.readyToStart || this.exitStarted) return;
        this.playExitAnimation();
    };

    constructor() {
        this.loadingElement = document.querySelector('.loading-screen');
        this.contentElement = document.querySelector('.loading-screen__content');
        this.titleElement = document.querySelector('.loading-screen__title');
        this.welcomeElement = document.querySelector('.loading-screen__welcome');
        this.valueElement = document.querySelector('.loading-screen__value');
        this.progressElement = document.querySelector('.loading-screen__progress');
        this.ctaElement = document.querySelector('.loading-screen__cta');
        this.transitionPathElement = document.querySelector('.loading-screen__transition-path') || document.createElementNS('http://www.w3.org/2000/svg', 'path');
        this.transitionBaseElement = document.querySelector('.loading-screen__transition-base');
        this.homeElement = document.querySelector('.home');

        this.transitionPathElement.setAttribute('d', GsapManager.loadingPathCovered);
        this.transitionBaseElement?.setAttribute('d', GsapManager.loadingPathCovered);

        this.setProgress(0, true);
        this.init();
    }

    init(): void {
        GsapManager.playLoadingIntro(
            { title: this.titleElement, welcome: this.welcomeElement },
            () => {
                this.introFinished = true;
                this.tryUnlockStart();
            }
        );
    }

    setProgress(value: number, immediate = false): void {
        const target = Math.max(0, Math.min(100, value));

        if (immediate) {
            GsapManager.killLoadingProgress();
            this.progress.value = target;
            this.render();
            return;
        }

        GsapManager.tweenLoadingProgress(
            this.progress,
            target,
            LoadingManager.PROGRESS_STEP_DURATION,
            () => this.render()
        );
    }

    private render(): void {
        if (!this.valueElement) return;
        this.valueElement.textContent = String(Math.round(this.progress.value));
    }

    complete(): void {
        const duration = Math.max(
            LoadingManager.PROGRESS_COMPLETE_MIN_DURATION,
            GsapManager.getLoadingIntroRemaining()
        );

        GsapManager.tweenLoadingProgress(
            this.progress,
            100,
            duration,
            () => this.render(),
            () => {
                this.progressFinished = true;
                this.tryUnlockStart();
            }
        );
    }

    // Both the counter and the intro have to land before the screen invites a click.
    private tryUnlockStart(): void {
        if (!this.introFinished || !this.progressFinished || this.readyToStart) return;
        this.unlockStart();
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

        GsapManager.disappearWithSwell(this.progressElement as HTMLElement);
    }

    private playExitAnimation(): void {
        if (!this.loadingElement || this.exitStarted) return;

        this.exitStarted = true;
        this.readyToStart = false;
        this.loadingElement.removeEventListener('click', this.handleStartClick);

        this.loadingElement.classList.add('loading-screen--exiting');

        GsapManager.playLoadingExit({
            content: this.contentElement,
            transitionPath: this.transitionPathElement,
            transitionBase: this.transitionBaseElement,
        }, () => this.finishLoadingScreen());
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
