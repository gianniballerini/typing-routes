import type { RouteRecordSnapshot } from '../../UserStats';
import { formatAccuracy, formatElapsedTime, formatInteger, formatOneDecimal } from '../../utils/StatFormatters';
import { renderStars } from '../StarsView';
import { BaseModal } from './BaseModal';

interface RouteListRow {
    routeId: string;
    // Display number, e.g. 'RN 40'.
    routeLabel: string;
    routeName: string;
    citiesCount: number;
    lengthKm: number;
    imageUrl: string | null;
    completed: boolean;
    stars: number | null;
    record: RouteRecordSnapshot | null;
}

type RouteListFilter = 'all' | 'unplayed' | 'completed';

const TYPE_AHEAD_RESET_MS = 800;
const PAGE_ROWS = 3;

/**
 * Course-select grid over every route. The grid element itself holds focus and
 * owns the keydown listener, so arrow keys never reach the window-level handlers
 * in KeyboardInputCoordinator. Escape is handled one level up, by ModalController's
 * capture-phase listener, which closes the modal before the grid sees the key.
 */
class RouteListModal extends BaseModal {
    private gridEl: HTMLElement | null;
    private emptyEl: HTMLElement | null;
    private footerTitleEl: HTMLElement | null;
    private footerStatsEl: HTMLElement | null;
    private tileTemplateEl: HTMLTemplateElement | null;
    private filterEls: HTMLElement[];

    private rowsByRouteId: Map<string, RouteListRow>;
    private tilesByRouteId: Map<string, HTMLElement>;
    private tileOrder: HTMLElement[];
    private visibleTiles: HTMLElement[];
    private focusedIndex: number;
    private activeFilter: RouteListFilter;
    private selectedRouteId: string | null;

    private onRouteActivatedHandler: ((routeId: string) => void) | null;
    private typeAheadBuffer: string;
    private typeAheadTimeoutHandle: number | null;
    private keyboardNavigating: boolean;

    constructor(onCloseRequested: () => void) {
        super('.route-list-modal', '.route-list-modal__close-button', onCloseRequested);

        this.gridEl = this.rootEl?.querySelector('.route-list-modal__grid') ?? null;
        this.emptyEl = this.rootEl?.querySelector('.route-list-modal__empty') ?? null;
        this.footerTitleEl = this.rootEl?.querySelector('.route-list-modal__footer-title') ?? null;
        this.footerStatsEl = this.rootEl?.querySelector('.route-list-modal__footer-stats') ?? null;
        this.tileTemplateEl = this.rootEl?.querySelector('.route-list-modal__tile-template') ?? null;
        this.filterEls = Array.from(this.rootEl?.querySelectorAll('.route-list-modal__filter') ?? []);

        this.rowsByRouteId = new Map();
        this.tilesByRouteId = new Map();
        this.tileOrder = [];
        this.visibleTiles = [];
        this.focusedIndex = 0;
        this.activeFilter = 'all';
        this.selectedRouteId = null;

        this.onRouteActivatedHandler = null;
        this.typeAheadBuffer = '';
        this.typeAheadTimeoutHandle = null;
        this.keyboardNavigating = false;

        this.gridEl?.addEventListener('keydown', this.handleGridKeydown);
        this.gridEl?.addEventListener('mousemove', this.handleGridMouseMove);
        this.gridEl?.addEventListener('mouseleave', this.handleGridMouseLeave);

        for (const filterEl of this.filterEls) {
            filterEl.addEventListener('click', this.handleFilterClick);
            filterEl.addEventListener('keydown', this.handleFilterKeydown);
        }
    }

    onRouteActivated(handler: (routeId: string) => void): void {
        this.onRouteActivatedHandler = handler;
    }

    /**
     * Tiles are created on the first render and patched afterwards: there are ~96
     * of them and only their stats change between openings.
     */
    render(rows: RouteListRow[], selectedRouteId: string | null = null): void {
        this.selectedRouteId = selectedRouteId;
        this.rowsByRouteId = new Map(rows.map((row) => [row.routeId, row]));

        if (this.tileOrder.length === 0) this.buildTiles(rows);
        for (const row of rows) this.patchTile(row);

        this.applyFilter(this.activeFilter);

        const selectedIndex = selectedRouteId
            ? this.visibleTiles.findIndex((tile) => tile.dataset.routeId === selectedRouteId)
            : -1;
        this.setFocusedIndex(selectedIndex >= 0 ? selectedIndex : 0, false);
    }

    show(): void {
        this.keyboardNavigating = false;
        super.show();
    }

    hide(): void {
        super.hide();
        this.clearTypeAhead();
    }

    // Opens on the route cursor rather than the close button, so the arrow keys
    // are live the moment the grid appears.
    protected focusInitialElement(): void {
        this.focusCurrentTile();
    }

    private buildTiles(rows: RouteListRow[]): void {
        if (!this.gridEl || !this.tileTemplateEl) return;

        const fragment = document.createDocumentFragment();

        for (const row of rows) {
            const tileEl = this.tileTemplateEl.content.firstElementChild?.cloneNode(true);
            if (!(tileEl instanceof HTMLElement)) continue;

            tileEl.dataset.routeId = row.routeId;
            tileEl.dataset.routeNumber = row.routeLabel.replace(/\D/g, '');
            tileEl.tabIndex = -1;
            tileEl.addEventListener('click', this.handleTileClick);
            tileEl.addEventListener('mouseenter', this.handleTileMouseEnter);

            this.tilesByRouteId.set(row.routeId, tileEl);
            this.tileOrder.push(tileEl);
            fragment.appendChild(tileEl);
        }

        this.gridEl.appendChild(fragment);
    }

    private patchTile(row: RouteListRow): void {
        const tileEl = this.tilesByRouteId.get(row.routeId);
        if (!tileEl) return;

        const numberEl = tileEl.querySelector('.route-list-modal__tile-number');
        const citiesEl = tileEl.querySelector('.route-list-modal__tile-cities');
        const nameEl = tileEl.querySelector('.route-list-modal__tile-name');
        const imageEl = tileEl.querySelector('img');
        const starsEl = tileEl.querySelector<HTMLElement>('.route-list-modal__tile-stars');

        if (numberEl) numberEl.textContent = row.routeLabel;
        if (citiesEl) citiesEl.textContent = `${row.citiesCount} ${row.citiesCount === 1 ? 'ciudad' : 'ciudades'}`;
        if (nameEl) nameEl.textContent = row.routeName;

        // Only ~a quarter of the routes ship a photo, so the sign-only tile is the
        // common case rather than a fallback.
        if (imageEl) {
            if (row.imageUrl) {
                imageEl.src = row.imageUrl;
                imageEl.alt = row.routeName;
            } else {
                imageEl.removeAttribute('src');
                imageEl.alt = '';
            }
        }
        tileEl.classList.toggle('route-list-modal__tile--no-image', !row.imageUrl);
        tileEl.classList.toggle('route-list-modal__tile--completed', row.completed);

        renderStars(starsEl, row.stars);
    }

    private applyFilter(filter: RouteListFilter): void {
        this.activeFilter = filter;

        for (const filterEl of this.filterEls) {
            const isActive = filterEl.dataset.filter === filter;
            filterEl.classList.toggle('route-list-modal__filter--active', isActive);
            filterEl.setAttribute('aria-pressed', `${isActive}`);
        }

        this.visibleTiles = [];

        for (const tileEl of this.tileOrder) {
            const row = this.rowsByRouteId.get(tileEl.dataset.routeId ?? '');
            const visible = this.matchesFilter(row, filter);

            tileEl.classList.toggle('hidden', !visible);
            if (visible) this.visibleTiles.push(tileEl);
        }

        this.emptyEl?.classList.toggle('hidden', this.visibleTiles.length > 0);
    }

    private matchesFilter(row: RouteListRow | undefined, filter: RouteListFilter): boolean {
        if (!row) return false;
        if (filter === 'completed') return row.completed;
        if (filter === 'unplayed') return !row.completed;
        return true;
    }

    private setFocusedIndex(index: number, moveFocus: boolean = true): void {
        if (this.visibleTiles.length === 0) {
            this.focusedIndex = 0;
            this.renderFooter(null);
            return;
        }

        const clampedIndex = Math.max(0, Math.min(this.visibleTiles.length - 1, index));
        this.focusedIndex = clampedIndex;

        for (const [tileIndex, tileEl] of this.visibleTiles.entries()) {
            const isFocused = tileIndex === clampedIndex;
            const isSelected = tileEl.dataset.routeId === this.selectedRouteId;

            tileEl.classList.toggle('route-list-modal__tile--focused', isFocused);
            tileEl.classList.toggle('route-list-modal__tile--selected', isSelected);
            tileEl.setAttribute('aria-selected', `${isFocused}`);
            tileEl.tabIndex = isFocused ? 0 : -1;
        }

        const focusedTile = this.visibleTiles[clampedIndex];
        this.renderFooter(this.rowsByRouteId.get(focusedTile.dataset.routeId ?? '') ?? null);

        if (moveFocus) this.focusCurrentTile();
    }

    private focusCurrentTile(): void {
        const tileEl = this.visibleTiles[this.focusedIndex];
        if (!tileEl) {
            this.gridEl?.focus();
            return;
        }

        tileEl.focus({ preventScroll: true });
        tileEl.scrollIntoView({ block: 'nearest' });
    }

    private renderFooter(row: RouteListRow | null): void {
        if (this.footerTitleEl) {
            this.footerTitleEl.textContent = row
                ? `${row.routeLabel} · ${row.routeName} · ${Math.round(row.lengthKm)} km`
                : '';
        }

        if (!this.footerStatsEl) return;

        if (!row || !row.completed) {
            this.footerStatsEl.textContent = row ? 'Sin jugar' : '';
            return;
        }

        const record = row.record;
        this.footerStatsEl.textContent = [
            `${formatOneDecimal(record?.bestNetWpm)} PPM`,
            `${formatAccuracy(record?.bestAccuracy)} precisión`,
            formatElapsedTime(record?.bestElapsedMs),
            `${formatInteger(record?.fewestMistakes)} errores`
        ].join(' · ');
    }

    private getColumnCount(): number {
        if (!this.gridEl) return 1;

        // Read from the resolved template rather than a hardcoded number, so the
        // responsive breakpoints move the cursor by exactly one row.
        const columns = window.getComputedStyle(this.gridEl).gridTemplateColumns
            .split(' ')
            .filter((entry) => entry.trim().length > 0)
            .length;

        return Math.max(1, columns);
    }

    private handleGridKeydown = (event: KeyboardEvent): void => {
        // Arrow keys scroll tiles underneath a resting cursor, which would otherwise
        // fire mouseenter and overwrite the footer with a route nobody pointed at.
        this.keyboardNavigating = true;

        const columns = this.getColumnCount();

        switch (event.key) {
            case 'ArrowRight':
                this.moveFocusBy(1, event);
                return;
            case 'ArrowLeft':
                this.moveFocusBy(-1, event);
                return;
            case 'ArrowDown':
                this.moveFocusBy(columns, event);
                return;
            case 'ArrowUp':
                this.moveFocusBy(-columns, event);
                return;
            case 'PageDown':
                this.moveFocusBy(columns * PAGE_ROWS, event);
                return;
            case 'PageUp':
                this.moveFocusBy(-columns * PAGE_ROWS, event);
                return;
            case 'Home':
                event.preventDefault();
                this.setFocusedIndex(0);
                return;
            case 'End':
                event.preventDefault();
                this.setFocusedIndex(this.visibleTiles.length - 1);
                return;
            case 'Enter':
            case ' ':
                event.preventDefault();
                // Activation puts the game in COUNTDOWN synchronously, so this same
                // keystroke must not bubble to KeyboardInputCoordinator — there,
                // Enter/Space means "skip the countdown" and the run would start instantly.
                event.stopPropagation();
                this.activateFocusedTile();
                return;
            default:
                break;
        }

        // Type-ahead by route number: with ~96 tiles, "40" beats forty arrow presses.
        if (/^\d$/.test(event.key)) {
            event.preventDefault();
            this.pushTypeAhead(event.key);
        }
    };

    private moveFocusBy(delta: number, event: KeyboardEvent): void {
        event.preventDefault();
        this.setFocusedIndex(this.focusedIndex + delta);
    }

    private pushTypeAhead(digit: string): void {
        this.typeAheadBuffer += digit;

        if (this.typeAheadTimeoutHandle !== null) window.clearTimeout(this.typeAheadTimeoutHandle);
        this.typeAheadTimeoutHandle = window.setTimeout(this.clearTypeAhead, TYPE_AHEAD_RESET_MS);

        const exactIndex = this.visibleTiles.findIndex((tile) => tile.dataset.routeNumber === this.typeAheadBuffer);
        const prefixIndex = exactIndex >= 0
            ? exactIndex
            : this.visibleTiles.findIndex((tile) => tile.dataset.routeNumber?.startsWith(this.typeAheadBuffer));

        if (prefixIndex >= 0) this.setFocusedIndex(prefixIndex);
    }

    private clearTypeAhead = (): void => {
        if (this.typeAheadTimeoutHandle !== null) {
            window.clearTimeout(this.typeAheadTimeoutHandle);
            this.typeAheadTimeoutHandle = null;
        }

        this.typeAheadBuffer = '';
    };

    private activateFocusedTile(): void {
        const tileEl = this.visibleTiles[this.focusedIndex];
        const routeId = tileEl?.dataset.routeId;
        if (!routeId) return;

        this.onRouteActivatedHandler?.(routeId);
    }

    private handleTileClick = (event: Event): void => {
        const tileEl = (event.currentTarget as HTMLElement | null);
        const routeId = tileEl?.dataset.routeId;
        if (!routeId) return;

        const index = this.visibleTiles.indexOf(tileEl as HTMLElement);
        if (index >= 0) this.setFocusedIndex(index, false);

        this.onRouteActivatedHandler?.(routeId);
    };

    private handleGridMouseMove = (): void => {
        this.keyboardNavigating = false;
    };

    // Hover previews a route in the footer without stealing the keyboard cursor.
    private handleTileMouseEnter = (event: Event): void => {
        if (this.keyboardNavigating) return;

        const tileEl = event.currentTarget as HTMLElement | null;
        const row = this.rowsByRouteId.get(tileEl?.dataset.routeId ?? '');
        if (row) this.renderFooter(row);
    };

    private handleGridMouseLeave = (): void => {
        const focusedTile = this.visibleTiles[this.focusedIndex];
        this.renderFooter(this.rowsByRouteId.get(focusedTile?.dataset.routeId ?? '') ?? null);
    };

    private handleFilterClick = (event: Event): void => {
        const filter = (event.currentTarget as HTMLElement | null)?.dataset.filter as RouteListFilter | undefined;
        if (!filter) return;

        this.applyFilter(filter);
        this.setFocusedIndex(0);
    };

    private handleFilterKeydown = (event: KeyboardEvent): void => {
        if (event.key !== 'Enter' && event.key !== ' ') return;

        event.preventDefault();
        this.handleFilterClick(event);
    };
}

export { RouteListModal };
export type { RouteListFilter, RouteListRow };
