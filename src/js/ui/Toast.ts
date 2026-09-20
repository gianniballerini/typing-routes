import { GsapManager } from '../app/GsapManager';

// Longer than the trophy toast's 2000ms: this one asks the player to go and do
// something with what was just copied, so it has to survive being read.
const VISIBLE_MS = 3600;

// Repeat share clicks are the only realistic way to stack these, and past a few
// the column starts climbing the screen.
const MAX_VISIBLE_CARDS = 3;

/**
 * A plain text notification that rises from the bottom of the screen and leaves
 * on its own. Deliberately generic — it takes a message and nothing else — so
 * the next thing that needs to say something transient does not add a third
 * bespoke toast.
 *
 * Shaped after `AchievementToast`: same host + `<template>` clone, same timer
 * map, same double-dismiss guard. The two are left as siblings rather than
 * folded into a shared base; a third one would be the moment to do that.
 */
class Toast {
    private hostEl: HTMLElement | null;
    private cardTemplateEl: HTMLTemplateElement | null;
    private timeoutHandlesByCard: Map<HTMLElement, number>;

    constructor() {
        this.hostEl = document.querySelector('.toast-stack');
        this.cardTemplateEl = this.hostEl?.querySelector('.toast__card-template') ?? null;
        this.timeoutHandlesByCard = new Map();
    }

    show(message: string): void {
        if (!this.hostEl || !this.cardTemplateEl || !message) return;

        const cardEl = this.cardTemplateEl.content.firstElementChild?.cloneNode(true);
        if (!(cardEl instanceof HTMLElement)) return;

        const textEl = cardEl.querySelector('.toast__card-text');
        if (textEl) textEl.textContent = message;

        this.hostEl.appendChild(cardEl);
        GsapManager.playToastIn(cardEl);

        this.timeoutHandlesByCard.set(cardEl, window.setTimeout(() => this.dismiss(cardEl), VISIBLE_MS));
        this.trimOldestCards();
    }

    clear(): void {
        for (const cardEl of [...this.timeoutHandlesByCard.keys()]) {
            this.removeCard(cardEl);
        }
    }

    private trimOldestCards(): void {
        const cards = [...this.timeoutHandlesByCard.keys()];

        for (const cardEl of cards.slice(0, Math.max(0, cards.length - MAX_VISIBLE_CARDS))) {
            this.dismiss(cardEl);
        }
    }

    private dismiss(cardEl: HTMLElement): void {
        const timeoutHandle = this.timeoutHandlesByCard.get(cardEl);
        if (timeoutHandle === undefined) return;

        window.clearTimeout(timeoutHandle);
        // Dropped from the map before the tween so a second dismiss — the timer
        // and the trim can both reach the same card — cannot start it twice.
        this.timeoutHandlesByCard.delete(cardEl);

        GsapManager.playToastOut(cardEl, () => cardEl.remove());
    }

    private removeCard(cardEl: HTMLElement): void {
        const timeoutHandle = this.timeoutHandlesByCard.get(cardEl);
        if (timeoutHandle !== undefined) window.clearTimeout(timeoutHandle);

        this.timeoutHandlesByCard.delete(cardEl);
        cardEl.remove();
    }
}

export { Toast };
