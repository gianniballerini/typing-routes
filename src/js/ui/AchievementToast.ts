import type { AchievementDefinition } from '../achievements/AchievementDefinitions';
import { ACHIEVEMENT_PLACEHOLDER_IMAGE } from '../achievements/AchievementDefinitions';
import { GsapManager } from '../app/GsapManager';

// How long a card sits at full opacity before it starts leaving.
const VISIBLE_MS = 2000;

// Finishing a route can unlock several trophies at once — a tier, its star twin
// and the meta one. Past this the stack becomes a wall, so the oldest card is
// retired early to make room.
const MAX_VISIBLE_CARDS = 4;

/**
 * The unlock notification: a small card that drops in at the top of the screen,
 * holds for a beat and leaves. Manual DOM like the rest of `src/js/ui/`, and the
 * only thing it knows about a trophy is its image and title.
 *
 * Cards stack because the host is a flex column, so concurrent unlocks need no
 * queueing of their own.
 */
class AchievementToast {
    private hostEl: HTMLElement | null;
    private cardTemplateEl: HTMLTemplateElement | null;
    private timeoutHandlesByCard: Map<HTMLElement, number>;

    constructor() {
        this.hostEl = document.querySelector('.achievement-toast-stack');
        this.cardTemplateEl = this.hostEl?.querySelector('.achievement-toast__card-template') ?? null;
        this.timeoutHandlesByCard = new Map();
    }

    show(definition: AchievementDefinition): void {
        if (!this.hostEl || !this.cardTemplateEl) return;

        const cardEl = this.cardTemplateEl.content.firstElementChild?.cloneNode(true);
        if (!(cardEl instanceof HTMLElement)) return;

        const titleEl = cardEl.querySelector('.achievement-toast__card-title');
        const imageEl = cardEl.querySelector('img');

        if (titleEl) titleEl.textContent = definition.title;
        if (imageEl) {
            imageEl.src = definition.imageUrl ?? ACHIEVEMENT_PLACEHOLDER_IMAGE;
            imageEl.alt = '';
        }

        this.hostEl.appendChild(cardEl);
        GsapManager.playAchievementToastIn(cardEl);

        this.timeoutHandlesByCard.set(cardEl, window.setTimeout(() => this.dismiss(cardEl), VISIBLE_MS));
        this.trimOldestCards();
    }

    // Nothing calls this today, but a card outliving the page it belongs to would
    // be the first thing to go wrong if the app ever tears itself down.
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

        GsapManager.playAchievementToastOut(cardEl, () => cardEl.remove());
    }

    private removeCard(cardEl: HTMLElement): void {
        const timeoutHandle = this.timeoutHandlesByCard.get(cardEl);
        if (timeoutHandle !== undefined) window.clearTimeout(timeoutHandle);

        this.timeoutHandlesByCard.delete(cardEl);
        cardEl.remove();
    }
}

export { AchievementToast };
