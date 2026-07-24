import gsap from 'gsap';

class LoadingManager {
    private readonly loadingElement: HTMLElement | null;
    private readonly valueElement: HTMLElement | null;
    private readonly homeElement: HTMLElement | null;

    private progress = { value: 0 };
    private tween: gsap.core.Tween | null = null;

    constructor() {
        this.loadingElement = document.querySelector('.loading-screen');
        this.valueElement = document.querySelector('.loading-screen__value');
        this.homeElement = document.querySelector('.home');
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
            onComplete: () => this.playExitAnimation(),
        });
    }

    private playExitAnimation(): void {
        if (!this.loadingElement) return;

        this.homeElement?.classList.remove('home--loading');

        const timeline = gsap.timeline();

        // Punch the number before the screen leaves
        if (this.valueElement) {
            timeline.to(this.valueElement, {
                scale: 1.15,
                duration: 0.15,
                ease: 'power1.out',
            }).to(this.valueElement, {
                scale: 1,
                opacity: 0,
                duration: 0.25,
                ease: 'power2.in',
            });
        }

        // Wipe the whole screen away like a curtain, upward
        timeline.to(
            this.loadingElement,
            {
                clipPath: 'inset(0% 0% 100% 0%)',
                duration: 0.6,
                ease: 'power4.inOut',
            },
            this.valueElement ? '-=0.15' : 0,
        ).set(this.loadingElement, {
            display: 'none',
        });
    }
}
export { LoadingManager };
