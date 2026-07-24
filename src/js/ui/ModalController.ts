import { copyElementImageToClipboard, shareElementAsImage } from './../utils/ShareUtils';

interface RouteCompleteModalPayload {
	routeTitle: string;
	combo: number;
	grossWpm: number;
	netWpm: number;
	accuracy: number;
	isNewComboRecord?: boolean;
	isNewGrossWpmRecord?: boolean;
	isNewNetWpmRecord?: boolean;
	isNewAccuracyRecord?: boolean;
	elapsedMs: number;
	citiesCompleted: number;
	citiesTotal: number;
	mistakes: number;
}

class ModalController {
	private route_name: string;
	private rootEl: HTMLElement | null;
	private routeCompleteEl: HTMLElement | null;
	private routeCompleteTitleEl: HTMLElement | null;
	private routeCompleteComboEl: HTMLElement | null;
	private routeCompleteGrossWpmEl: HTMLElement | null;
	private routeCompleteNetWpmEl: HTMLElement | null;
	private routeCompleteAccuracyEl: HTMLElement | null;
	private routeCompleteElapsedEl: HTMLElement | null;
	private routeCompleteCitiesEl: HTMLElement | null;
	private routeCompleteMistakesEl: HTMLElement | null;
	private routeCompleteCloseButtonEl: HTMLElement | null;

	private routeCompleteShareButtonEl: HTMLElement | null;
	private routeCompleteShareButtonTextEl: HTMLElement | null;

	private escapeBound: boolean;

	constructor() {
		this.route_name = '';

		this.rootEl = document.querySelector('.modal');
		this.routeCompleteEl = document.querySelector('.route-complete-modal');
		this.routeCompleteTitleEl = document.querySelector('.route-complete-modal__title-text');
		this.routeCompleteComboEl = document.querySelector('.route-complete-modal__stat-value--combo');
		this.routeCompleteGrossWpmEl = document.querySelector('.route-complete-modal__stat-value--gross-wpm');
		this.routeCompleteNetWpmEl = document.querySelector('.route-complete-modal__stat-value--net-wpm');
		this.routeCompleteAccuracyEl = document.querySelector('.route-complete-modal__stat-value--accuracy');
		this.routeCompleteElapsedEl = document.querySelector('.route-complete-modal__stat-value--elapsed');
		this.routeCompleteCitiesEl = document.querySelector('.route-complete-modal__stat-value--cities');
		this.routeCompleteMistakesEl = document.querySelector('.route-complete-modal__stat-value--mistakes');
		this.routeCompleteCloseButtonEl = document.querySelector('.route-complete-modal__button');
		this.escapeBound = false;

		this.routeCompleteShareButtonEl = document.querySelector('.route-complete-modal__share-button');
		this.routeCompleteShareButtonTextEl = document.querySelector('.route-complete-modal__button-text');

		this.routeCompleteCloseButtonEl?.addEventListener('click', this.hide);
		this.routeCompleteShareButtonEl?.addEventListener('click', this.share);
	}

	showRouteComplete(payload: RouteCompleteModalPayload): void {
		this.route_name = payload.routeTitle || 'Ruta completada';
		const title = this.route_name;
		const safeCombo = this.toRoundedNonNegativeInteger(payload.combo);
		const safeGrossWpm = this.toOneDecimalNonNegative(payload.grossWpm);
		const safeNetWpm = this.toOneDecimalNonNegative(payload.netWpm);
		const safeAccuracy = this.toOneDecimalNonNegative(payload.accuracy);
		const comboLabel = this.withNewRecordPrefix(safeCombo, Boolean(payload.isNewComboRecord));
		const grossWpmLabel = this.withNewRecordPrefix(safeGrossWpm, Boolean(payload.isNewGrossWpmRecord));
		const netWpmLabel = this.withNewRecordPrefix(safeNetWpm, Boolean(payload.isNewNetWpmRecord));
		const accuracyLabel = this.withNewRecordPrefix(`${safeAccuracy}%`, Boolean(payload.isNewAccuracyRecord));
		const safeCitiesTotal = this.toRoundedNonNegativeInteger(payload.citiesTotal);
		const safeMistakes = this.toRoundedNonNegativeInteger(payload.mistakes);

		if (this.routeCompleteTitleEl) this.routeCompleteTitleEl.textContent = title;
		if (this.routeCompleteComboEl) this.routeCompleteComboEl.textContent = comboLabel;
		if (this.routeCompleteGrossWpmEl) this.routeCompleteGrossWpmEl.textContent = grossWpmLabel;
		if (this.routeCompleteNetWpmEl) this.routeCompleteNetWpmEl.textContent = netWpmLabel;
		if (this.routeCompleteAccuracyEl) this.routeCompleteAccuracyEl.textContent = accuracyLabel;
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

	private share = async (): Promise<void> => {
		if (this.routeCompleteEl) {
			this.routeCompleteShareButtonEl?.classList.add('hidden');
			this.routeCompleteCloseButtonEl?.classList.add('hidden');
			try {
				await copyElementImageToClipboard(this.routeCompleteEl);
				// await shareElementAsImage(this.routeCompleteEl, `Record - ${this.route_name}.png`);
			}
			catch (error) {
				try {
					await shareElementAsImage(this.routeCompleteEl, `Record - ${this.route_name}.png`);
				} catch (error) {
					console.error('Failed to share element as image:', error);
				}
			}
			finally {
				this.routeCompleteShareButtonEl?.classList.remove('hidden');
				this.routeCompleteCloseButtonEl?.classList.remove('hidden');
				this.show_copy_success_message();
			}
		}
	};

	show_copy_success_message(): void {
		if (this.routeCompleteShareButtonTextEl) {
			const originalText = this.routeCompleteShareButtonTextEl.textContent;
			this.routeCompleteShareButtonTextEl.textContent = 'Copied!';
			setTimeout(() => {
				if (this.routeCompleteShareButtonTextEl) {
					this.routeCompleteShareButtonTextEl.textContent = originalText;
				}
			}, 2000);
		}
	}

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

	private toOneDecimalNonNegative(value: number): string {
		const safeValue = Number.isFinite(value) ? Math.max(0, value) : 0;
		return safeValue.toFixed(1);
	}

	private withNewRecordPrefix(value: string | number, isNewRecord: boolean): string {
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

