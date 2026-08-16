import { BaseModal } from './BaseModal';

interface AchievementRow {
    id: string;
    title: string;
    description: string;
    imageUrl: string;
    unlocked: boolean;
}

// Rows are short, so a page is a screenful rather than the three-row jump the
// route grid uses.
const PAGE_ROWS = 5;

/**
 * The trophy list. The list element itself holds focus and owns the keydown
 * listener, so the arrows never reach the window-level handlers in
 * `KeyboardInputCoordinator` or `GameUiPresenter`'s menu walk. Escape is handled
 * one level up, by `ModalController`'s capture-phase listener.
 *
 * Rows are not activatable — there is nothing to open — so Enter is left alone.
 */
class AchievementsModal extends BaseModal {
    private listEl: HTMLElement | null;
    private progressTextEl: HTMLElement | null;
    private rowTemplateEl: HTMLTemplateElement | null;

    private rowEls: HTMLElement[];
    private rowElsById: Map<string, HTMLElement>;
    private focusedIndex: number;

    constructor(onCloseRequested: () => void) {
        super('.achievements-modal', '.achievements-modal__close-button', onCloseRequested);

        this.listEl = this.rootEl?.querySelector('.achievements-modal__list') ?? null;
        this.progressTextEl = this.rootEl?.querySelector('.achievements-modal__progress-text') ?? null;
        this.rowTemplateEl = this.rootEl?.querySelector('.achievements-modal__row-template') ?? null;

        this.rowEls = [];
        this.rowElsById = new Map();
        this.focusedIndex = 0;

        this.listEl?.addEventListener('keydown', this.handleListKeydown);
    }

    /**
     * Rows are created on the first render and patched afterwards: the catalog
     * never changes shape, only which entries are unlocked.
     */
    render(rows: AchievementRow[]): void {
        if (this.rowEls.length === 0) this.buildRows(rows);
        for (const row of rows) this.patchRow(row);

        this.renderProgress(rows);
        // Reopening lands on the first trophy rather than wherever the last visit
        // left off — the list is short enough that resuming would just confuse.
        this.setFocusedIndex(0, false);
    }

    // Opens on the first row, so the arrows are live the moment the list appears.
    protected focusInitialElement(): void {
        this.focusCurrentRow();
    }

    private buildRows(rows: AchievementRow[]): void {
        if (!this.listEl || !this.rowTemplateEl) return;

        const fragment = document.createDocumentFragment();

        for (const row of rows) {
            const rowEl = this.rowTemplateEl.content.firstElementChild?.cloneNode(true);
            if (!(rowEl instanceof HTMLElement)) continue;

            rowEl.dataset.achievementId = row.id;
            rowEl.tabIndex = -1;
            rowEl.addEventListener('mouseenter', this.handleRowMouseEnter);

            this.rowElsById.set(row.id, rowEl);
            this.rowEls.push(rowEl);
            fragment.appendChild(rowEl);
        }

        this.listEl.appendChild(fragment);
    }

    private patchRow(row: AchievementRow): void {
        const rowEl = this.rowElsById.get(row.id);
        if (!rowEl) return;

        const titleEl = rowEl.querySelector('.achievements-modal__row-title');
        const descriptionEl = rowEl.querySelector('.achievements-modal__row-description');
        const imageEl = rowEl.querySelector('img');

        if (titleEl) titleEl.textContent = row.title;
        if (imageEl) {
            imageEl.src = row.imageUrl;
            imageEl.alt = '';
        }

        // A locked description is blurred out rather than withheld, so the list
        // reads as a set of goals with the specifics still to find out. It is a
        // visual spoiler only — the text is in the DOM either way.
        if (descriptionEl) {
            descriptionEl.textContent = row.description;
            descriptionEl.setAttribute('aria-hidden', `${!row.unlocked}`);
        }

        rowEl.classList.toggle('achievements-modal__row--locked', !row.unlocked);
        rowEl.setAttribute('aria-label', `${row.title}. ${row.unlocked ? row.description : 'Bloqueado.'}`);
    }

    private renderProgress(rows: AchievementRow[]): void {
        if (!this.progressTextEl) return;

        const unlocked = rows.filter((row) => row.unlocked).length;
        this.progressTextEl.textContent = `${unlocked} / ${rows.length}`;
    }

    private setFocusedIndex(index: number, moveFocus: boolean = true): void {
        if (this.rowEls.length === 0) {
            this.focusedIndex = 0;
            return;
        }

        const clampedIndex = Math.max(0, Math.min(this.rowEls.length - 1, index));
        this.focusedIndex = clampedIndex;

        for (const [rowIndex, rowEl] of this.rowEls.entries()) {
            const isFocused = rowIndex === clampedIndex;

            rowEl.classList.toggle('achievements-modal__row--focused', isFocused);
            rowEl.setAttribute('aria-selected', `${isFocused}`);
            rowEl.tabIndex = isFocused ? 0 : -1;
        }

        if (moveFocus) this.focusCurrentRow();
    }

    private focusCurrentRow(): void {
        const rowEl = this.rowEls[this.focusedIndex];
        if (!rowEl) {
            this.listEl?.focus();
            return;
        }

        rowEl.focus({ preventScroll: true });
        rowEl.scrollIntoView({ block: 'nearest' });
    }

    private handleListKeydown = (event: KeyboardEvent): void => {
        switch (event.key) {
            case 'ArrowDown':
                this.moveFocusBy(1, event);
                return;
            case 'ArrowUp':
                this.moveFocusBy(-1, event);
                return;
            case 'PageDown':
                this.moveFocusBy(PAGE_ROWS, event);
                return;
            case 'PageUp':
                this.moveFocusBy(-PAGE_ROWS, event);
                return;
            case 'Home':
                event.preventDefault();
                this.setFocusedIndex(0);
                return;
            case 'End':
                event.preventDefault();
                this.setFocusedIndex(this.rowEls.length - 1);
                return;
            default:
                break;
        }
    };

    private moveFocusBy(delta: number, event: KeyboardEvent): void {
        event.preventDefault();
        this.setFocusedIndex(this.focusedIndex + delta);
    }

    // Hovering moves the cursor outright: unlike the route grid there is no
    // footer preview to keep separate from the selection, so the two can agree.
    private handleRowMouseEnter = (event: Event): void => {
        const rowEl = event.currentTarget as HTMLElement | null;
        const index = rowEl ? this.rowEls.indexOf(rowEl) : -1;

        if (index >= 0) this.setFocusedIndex(index, false);
    };
}

export { AchievementsModal };
export type { AchievementRow };
