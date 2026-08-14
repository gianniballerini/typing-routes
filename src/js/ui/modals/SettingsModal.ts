import type { SoundCategory } from '../../audio/types';
import { BaseModal } from './BaseModal';

const SOUND_CATEGORIES: SoundCategory[] = ['music', 'sfx', 'keys'];

class SettingsModal extends BaseModal {
    private sliderEls: HTMLInputElement[];
    private mutedNoteEl: HTMLElement | null;
    private onVolumeChangeHandler: ((category: SoundCategory, value: number) => void) | null;

    constructor(onCloseRequested: () => void) {
        super('.settings-modal', '.settings-modal__close-button', onCloseRequested);

        this.sliderEls = Array.from(
            this.rootEl?.querySelectorAll<HTMLInputElement>('.settings-modal__slider') ?? []
        );
        this.mutedNoteEl = this.rootEl?.querySelector('.settings-modal__muted-note') ?? null;
        this.onVolumeChangeHandler = null;

        for (const sliderEl of this.sliderEls) {
            sliderEl.addEventListener('input', this.handleSliderInput);
            sliderEl.addEventListener('keydown', this.handleSliderKeydown);
        }
    }

    onVolumeChange(handler: (category: SoundCategory, value: number) => void): void {
        this.onVolumeChangeHandler = handler;
    }

    renderVolumes(volumes: Record<SoundCategory, number>): void {
        for (const sliderEl of this.sliderEls) {
            const category = this.getSliderCategory(sliderEl);
            if (!category) continue;

            const percentage = Math.round(volumes[category] * 100);
            sliderEl.value = `${percentage}`;
            this.renderSliderValue(sliderEl, percentage);
        }
    }

    renderMuted(muted: boolean): void {
        this.mutedNoteEl?.classList.toggle('hidden', !muted);
    }

    protected focusInitialElement(): void {
        const firstSliderEl = this.sliderEls[0];
        if (!firstSliderEl) {
            super.focusInitialElement();
            return;
        }

        firstSliderEl.focus({ preventScroll: true });
    }

    private handleSliderInput = (event: Event): void => {
        const sliderEl = event.currentTarget;
        if (!(sliderEl instanceof HTMLInputElement)) return;

        const category = this.getSliderCategory(sliderEl);
        if (!category) return;

        const percentage = Number(sliderEl.value);
        if (!Number.isFinite(percentage)) return;

        this.renderSliderValue(sliderEl, percentage);
        this.onVolumeChangeHandler?.(category, percentage / 100);
    };

    private handleSliderKeydown = (event: KeyboardEvent): void => {
        const sliderEl = event.currentTarget;
        if (!(sliderEl instanceof HTMLInputElement)) return;

        const step = this.getSliderNavigationStep(event.key);
        if (step === 0) return;

        event.preventDefault();
        this.focusRelativeSlider(sliderEl, step);
    };

    private getSliderCategory(sliderEl: HTMLInputElement): SoundCategory | null {
        const category = sliderEl.dataset.audioCategory;
        return SOUND_CATEGORIES.includes(category as SoundCategory)
            ? category as SoundCategory
            : null;
    }

    private getSliderNavigationStep(key: string): number {
        if (key === 'ArrowDown') return 1;
        if (key === 'ArrowUp') return -1;
        return 0;
    }

    private focusRelativeSlider(currentSliderEl: HTMLInputElement, step: number): void {
        const currentIndex = this.sliderEls.indexOf(currentSliderEl);
        if (currentIndex === -1) return;

        const nextIndex = Math.max(0, Math.min(this.sliderEls.length - 1, currentIndex + step));
        if (nextIndex === currentIndex) return;

        this.sliderEls[nextIndex].focus({ preventScroll: true });
    }

    private renderSliderValue(sliderEl: HTMLInputElement, percentage: number): void {
        const valueEl = sliderEl.closest('.settings-modal__setting')
            ?.querySelector('.settings-modal__setting-value');
        if (!valueEl) return;

        valueEl.textContent = `${Math.round(percentage)}%`;
    }
}

export { SettingsModal };
