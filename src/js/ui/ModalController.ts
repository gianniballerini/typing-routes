interface RouteCompleteModalPayload {
	routeTitle: string;
	combo: number;
	wpm: number;
	isNewComboRecord?: boolean;
	isNewWpmRecord?: boolean;
	elapsedMs: number;
	citiesCompleted: number;
	citiesTotal: number;
	mistakes: number;
}

class ModalController {
	private rootEl: HTMLElement | null;
	private routeCompleteEl: HTMLElement | null;
	private routeCompleteTitleEl: HTMLElement | null;
	private routeCompleteComboEl: HTMLElement | null;
	private routeCompleteWpmEl: HTMLElement | null;
	private routeCompleteElapsedEl: HTMLElement | null;
	private routeCompleteCitiesEl: HTMLElement | null;
	private routeCompleteMistakesEl: HTMLElement | null;
	private routeCompleteCloseButtonEl: HTMLElement | null;
	private escapeBound: boolean;

	constructor() {
		this.rootEl = document.querySelector('.modal');
		this.routeCompleteEl = document.querySelector('.route-complete-modal');
		this.routeCompleteTitleEl = document.querySelector('.route-complete-modal__title-text');
		this.routeCompleteComboEl = document.querySelector('.route-complete-modal__stat-value--combo');
		this.routeCompleteWpmEl = document.querySelector('.route-complete-modal__stat-value--wpm');
		this.routeCompleteElapsedEl = document.querySelector('.route-complete-modal__stat-value--elapsed');
		this.routeCompleteCitiesEl = document.querySelector('.route-complete-modal__stat-value--cities');
		this.routeCompleteMistakesEl = document.querySelector('.route-complete-modal__stat-value--mistakes');
		this.routeCompleteCloseButtonEl = document.querySelector('.route-complete-modal__button');
		this.escapeBound = false;

		this.routeCompleteCloseButtonEl?.addEventListener('click', this.hide);
	}

	showRouteComplete(payload: RouteCompleteModalPayload): void {
		const title = payload.routeTitle ? payload.routeTitle : 'Ruta completada';
		const safeCombo = this.toRoundedNonNegativeInteger(payload.combo);
		const safeWpm = this.toRoundedNonNegativeInteger(payload.wpm);
		const comboLabel = this.withNewRecordPrefix(safeCombo, Boolean(payload.isNewComboRecord));
		const wpmLabel = this.withNewRecordPrefix(safeWpm, Boolean(payload.isNewWpmRecord));
		const safeCitiesTotal = this.toRoundedNonNegativeInteger(payload.citiesTotal);
		const safeMistakes = this.toRoundedNonNegativeInteger(payload.mistakes);

		if (this.routeCompleteTitleEl) this.routeCompleteTitleEl.textContent = title;
		if (this.routeCompleteComboEl) this.routeCompleteComboEl.textContent = comboLabel;
		if (this.routeCompleteWpmEl) this.routeCompleteWpmEl.textContent = wpmLabel;
		if (this.routeCompleteElapsedEl) this.routeCompleteElapsedEl.textContent = this.formatElapsedTime(payload.elapsedMs);
		if (this.routeCompleteCitiesEl) this.routeCompleteCitiesEl.textContent = `${safeCitiesTotal}`;
		if (this.routeCompleteMistakesEl) this.routeCompleteMistakesEl.textContent = `${safeMistakes}`;

		this.rootEl?.classList.remove('hidden');
		this.routeCompleteEl?.classList.remove('hidden');
		this.bindEscapeKey();
	}

	hide = (): void => {
		this.routeCompleteEl?.classList.add('hidden');
		this.rootEl?.classList.add('hidden');
		this.unbindEscapeKey();
	};

	isOpen(): boolean {
		return Boolean(this.rootEl && !this.rootEl.classList.contains('hidden'));
	}

	private bindEscapeKey(): void {
		if (this.escapeBound) return;
		window.addEventListener('keydown', this.handleEscapeKeydown, true);
		this.escapeBound = true;
	}

	private unbindEscapeKey(): void {
		if (!this.escapeBound) return;
		window.removeEventListener('keydown', this.handleEscapeKeydown, true);
		this.escapeBound = false;
	}

	private handleEscapeKeydown = (event: KeyboardEvent): void => {
		if (event.key !== 'Escape' || !this.isOpen()) return;

		event.preventDefault();
		event.stopPropagation();
		this.hide();
	};

	private toRoundedNonNegativeInteger(value: number): number {
		if (!Number.isFinite(value)) return 0;
		return Math.max(0, Math.round(value));
	}

	private withNewRecordPrefix(value: number, isNewRecord: boolean): string {
		const baseValue = `${value}`;
		if (!isNewRecord) return baseValue;
		return `(new record) ${baseValue}`;
	}

	private formatElapsedTime(elapsedMs: number): string {
		const safeElapsedMs = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;
		const totalSeconds = Math.floor(safeElapsedMs / 1000);
		const minutes = Math.floor(totalSeconds / 60);
		const seconds = totalSeconds % 60;
		return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
	}
}

export { ModalController };
export type { RouteCompleteModalPayload };

