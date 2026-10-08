import type { KeyPackState, SoundCategory } from '../../audio/types';
import { BaseModal } from './BaseModal';

const SOUND_CATEGORIES: SoundCategory[] = ['music', 'sfx', 'keys'];

class SettingsModal extends BaseModal {
    private sliderEls: HTMLInputElement[];
    private mutedNoteEl: HTMLElement | null;
    private onVolumeChangeHandler: ((category: SoundCategory, value: number) => void) | null;
    private onCategoryMuteToggleHandler: ((category: SoundCategory) => void) | null;
    private keyPacksEl: HTMLElement | null;
    private keyPackButtonEls: HTMLButtonElement[];
    private onKeyPackSelectedHandler: ((packId: string) => void) | null;
    private strictAccentsToggleEl: HTMLButtonElement | null;
    private onStrictAccentsToggleHandler: ((value: boolean) => void) | null;

    constructor(onCloseRequested: () => void) {
        super('.settings-modal', '.settings-modal__close-button', onCloseRequested);

        this.sliderEls = Array.from(
            this.rootEl?.querySelectorAll<HTMLInputElement>('.settings-modal__slider') ?? []
        );
        this.mutedNoteEl = this.rootEl?.querySelector('.settings-modal__muted-note') ?? null;
        this.onVolumeChangeHandler = null;
        this.onCategoryMuteToggleHandler = null;
        this.keyPacksEl = this.rootEl?.querySelector('.settings-modal__keypacks') ?? null;
        this.keyPackButtonEls = [];
        this.onKeyPackSelectedHandler = null;
        this.strictAccentsToggleEl = this.rootEl?.querySelector('.settings-modal__toggle') ?? null;
        this.onStrictAccentsToggleHandler = null;

        this.strictAccentsToggleEl?.addEventListener('click', this.handleStrictAccentsClick);
        this.strictAccentsToggleEl?.addEventListener('keydown', this.handleStrictAccentsKeydown);

        for (const sliderEl of this.sliderEls) {
            sliderEl.addEventListener('input', this.handleSliderInput);
            sliderEl.addEventListener('keydown', this.handleSliderKeydown);
        }
    }

    onVolumeChange(handler: (category: SoundCategory, value: number) => void): void {
        this.onVolumeChangeHandler = handler;
    }

    onCategoryMuteToggle(handler: (category: SoundCategory) => void): void {
        this.onCategoryMuteToggleHandler = handler;
    }

    onKeyPackSelected(handler: (packId: string) => void): void {
        this.onKeyPackSelectedHandler = handler;
    }

    onStrictAccentsToggle(handler: (value: boolean) => void): void {
        this.onStrictAccentsToggleHandler = handler;
    }

    renderStrictAccents(value: boolean): void {
        this.strictAccentsToggleEl?.setAttribute('aria-checked', value ? 'true' : 'false');
    }

    renderKeyPacks(states: KeyPackState[]): void {
        if (!this.keyPacksEl) return;

        this.keyPackButtonEls = states.map((state) => this.buildKeyPackButton(state));
        this.keyPacksEl.replaceChildren(...this.keyPackButtonEls);
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

    private buildKeyPackButton(state: KeyPackState): HTMLButtonElement {
        const { entry, unlocked, unlockPercent, selected } = state;

        const buttonEl = document.createElement('button');
        buttonEl.type = 'button';
        buttonEl.className = 'settings-modal__keypack';
        buttonEl.dataset.packId = entry.id;
        buttonEl.setAttribute('role', 'radio');
        buttonEl.setAttribute('aria-checked', selected ? 'true' : 'false');
        buttonEl.classList.toggle('settings-modal__keypack--selected', selected);
        buttonEl.classList.toggle('settings-modal__keypack--locked', !unlocked);
        buttonEl.disabled = !unlocked;
        // Only the selected radio sits in the tab order; arrows move within the group.
        buttonEl.tabIndex = selected ? 0 : -1;

        const nameEl = document.createElement('span');
        nameEl.className = 'settings-modal__keypack-name';
        nameEl.textContent = entry.name;
        buttonEl.append(nameEl);

        const captionEl = document.createElement('span');
        captionEl.className = 'settings-modal__keypack-caption';
        captionEl.textContent = unlocked
            ? (entry.author ?? '')
            : `Se desbloquea al ${unlockPercent ?? 100}%`;
        if (captionEl.textContent) buttonEl.append(captionEl);

        if (!unlocked) {
            buttonEl.setAttribute('aria-label', `${entry.name}. Se desbloquea al ${unlockPercent ?? 100}%`);
        }

        buttonEl.addEventListener('click', () => this.onKeyPackSelectedHandler?.(entry.id));
        buttonEl.addEventListener('keydown', this.handleKeyPackKeydown);
        return buttonEl;
    }

    private handleKeyPackKeydown = (event: KeyboardEvent): void => {
        const buttonEl = event.currentTarget;
        if (!(buttonEl instanceof HTMLButtonElement)) return;

        if (event.key === 'Enter' || event.key === ' ') {
            // Same reason as the sliders: Enter skips the countdown elsewhere.
            event.stopPropagation();
            return;
        }

        const step = this.getKeyPackNavigationStep(event.key);
        if (step === 0) return;

        event.preventDefault();
        const enabled = this.keyPackButtonEls.filter((el) => !el.disabled);
        const index = enabled.indexOf(buttonEl);
        if (index === -1) return;

        const next = index + step;
        if (next < 0) {
            this.sliderEls[this.sliderEls.length - 1]?.focus({ preventScroll: true });
            return;
        }
        if (next >= enabled.length) return;

        this.focusKeyPackButton(enabled[next]);
    };

    private getKeyPackNavigationStep(key: string): number {
        if (key === 'ArrowDown' || key === 'ArrowRight') return 1;
        if (key === 'ArrowUp' || key === 'ArrowLeft') return -1;
        return 0;
    }

    private focusKeyPackButton(buttonEl: HTMLButtonElement): void {
        for (const el of this.keyPackButtonEls) el.tabIndex = el === buttonEl ? 0 : -1;
        buttonEl.focus({ preventScroll: true });
    }

    private handleStrictAccentsClick = (): void => {
        const toggleEl = this.strictAccentsToggleEl;
        if (!toggleEl) return;

        this.onStrictAccentsToggleHandler?.(toggleEl.getAttribute('aria-checked') !== 'true');
    };

    private handleStrictAccentsKeydown = (event: KeyboardEvent): void => {
        // Same reason as the sliders: Enter skips the countdown elsewhere.
        if (event.key === 'Enter' || event.key === ' ') event.stopPropagation();
    };

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

        if (event.key === 'Enter' || event.key === ' ') {
            const category = this.getSliderCategory(sliderEl);
            if (!category) return;

            event.preventDefault();
            // Nothing outside the modal should read this keystroke — in
            // KeyboardInputCoordinator Enter means "skip the countdown".
            event.stopPropagation();
            this.onCategoryMuteToggleHandler?.(category);
            return;
        }

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
        if (nextIndex === currentIndex) {
            // Past the last slider, the arrows carry on into the pack picker.
            if (step > 0) {
                const target = this.keyPackButtonEls.find((el) => el.tabIndex === 0 && !el.disabled)
                    ?? this.keyPackButtonEls.find((el) => !el.disabled);
                if (target) this.focusKeyPackButton(target);
            }
            return;
        }

        this.sliderEls[nextIndex].focus({ preventScroll: true });
    }

    private renderSliderValue(sliderEl: HTMLInputElement, percentage: number): void {
        const settingEl = sliderEl.closest('.settings-modal__setting');
        if (!settingEl) return;

        // A row at zero is a muted row, however it got there — dragging the slider
        // all the way down and hitting Enter on it are the same state.
        settingEl.classList.toggle('settings-modal__setting--muted', Math.round(percentage) <= 0);

        const valueEl = settingEl.querySelector('.settings-modal__setting-value');
        if (!valueEl) return;

        valueEl.textContent = `${Math.round(percentage)}%`;
    }
}

export { SettingsModal };
