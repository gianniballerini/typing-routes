import { copyElementImageToClipboard, shareElementAsImage } from '../../utils/ShareUtils';
import { renderStars } from '../StarsView';
import { BaseModal } from './BaseModal';

interface RouteCompleteModalPayload {
	routeTitle: string;
	stars: number;
	combo: number;
	grossWpm: number;
	netWpm: number;
	accuracy: number;
	isNewComboRecord?: boolean;
	isNewGrossWpmRecord?: boolean;
	isNewNetWpmRecord?: boolean;
	isNewAccuracyRecord?: boolean;
	isNewTimeRecord?: boolean;
	elapsedMs: number;
	citiesCompleted: number;
	citiesTotal: number;
	mistakes: number;
}

class RouteCompleteModal extends BaseModal {
	private route_name: string;
	private titleEl: HTMLElement | null;
	private starsEl: HTMLElement | null;
	private ratingLabelEl: HTMLElement | null;
	private comboEl: HTMLElement | null;
	private grossWpmEl: HTMLElement | null;
	private netWpmEl: HTMLElement | null;
	private accuracyEl: HTMLElement | null;
	private elapsedEl: HTMLElement | null;
	private citiesEl: HTMLElement | null;
	private mistakesEl: HTMLElement | null;

	private shareButtonEl: HTMLElement | null;
	private shareButtonTextEl: HTMLElement | null;

	constructor(onCloseRequested: () => void) {
		super('.route-complete-modal', '.route-complete-modal__close-button', onCloseRequested);

		this.route_name = '';

		this.titleEl = document.querySelector('.route-complete-modal__title-text');
		this.starsEl = document.querySelector('.route-complete-modal__stars');
		this.ratingLabelEl = document.querySelector('.route-complete-modal__rating-label');
		this.comboEl = document.querySelector('.route-complete-modal__stat-value--combo');
		this.grossWpmEl = document.querySelector('.route-complete-modal__stat-value--gross-wpm');
		this.netWpmEl = document.querySelector('.route-complete-modal__stat-value--net-wpm');
		this.accuracyEl = document.querySelector('.route-complete-modal__stat-value--accuracy');
		this.elapsedEl = document.querySelector('.route-complete-modal__stat-value--elapsed');
		this.citiesEl = document.querySelector('.route-complete-modal__stat-value--cities');
		this.mistakesEl = document.querySelector('.route-complete-modal__stat-value--mistakes');

		this.shareButtonEl = document.querySelector('.route-complete-modal__share-button');
		this.shareButtonTextEl = document.querySelector('.route-complete-modal__button-text');

		this.shareButtonEl?.addEventListener('click', this.share);
	}

	render(payload: RouteCompleteModalPayload): void {
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
		const elapsedLabel = this.withNewRecordPrefix(
			this.formatElapsedTime(payload.elapsedMs),
			Boolean(payload.isNewTimeRecord)
		);
		const safeCitiesTotal = this.toRoundedNonNegativeInteger(payload.citiesTotal);
		const safeMistakes = this.toRoundedNonNegativeInteger(payload.mistakes);

		if (this.titleEl) this.titleEl.textContent = title;

		renderStars(this.starsEl, payload.stars, { animate: true });
		if (this.ratingLabelEl) {
			this.ratingLabelEl.textContent = this.buildRatingLabel(payload.stars);
		}

		if (this.comboEl) this.comboEl.textContent = comboLabel;
		if (this.grossWpmEl) this.grossWpmEl.textContent = grossWpmLabel;
		if (this.netWpmEl) this.netWpmEl.textContent = netWpmLabel;
		if (this.accuracyEl) this.accuracyEl.textContent = accuracyLabel;
		if (this.elapsedEl) this.elapsedEl.textContent = elapsedLabel;
		if (this.citiesEl) this.citiesEl.textContent = `${safeCitiesTotal}`;
		if (this.mistakesEl) this.mistakesEl.textContent = `${safeMistakes}`;
	}

	private share = async (): Promise<void> => {
		if (this.rootEl) {
			this.shareButtonEl?.classList.add('hidden');
			this.closeButtonEl?.classList.add('hidden');
			try {
				await copyElementImageToClipboard(this.rootEl);
				// await shareElementAsImage(this.rootEl, `Record - ${this.route_name}.png`);
			}
			catch (error) {
				try {
					await shareElementAsImage(this.rootEl, `Record - ${this.route_name}.png`);
				} catch (error) {
					console.error('Failed to share element as image:', error);
				}
			}
			finally {
				this.shareButtonEl?.classList.remove('hidden');
				this.closeButtonEl?.classList.remove('hidden');
				this.show_copy_success_message();
			}
		}
	};

	show_copy_success_message(): void {
		if (this.shareButtonTextEl) {
			const originalText = this.shareButtonTextEl.textContent;
			this.shareButtonTextEl.textContent = 'Copied!';
			setTimeout(() => {
				if (this.shareButtonTextEl) {
					this.shareButtonTextEl.textContent = originalText;
				}
			}, 2000);
		}
	}

	// The stars come from the stored best record, so a slower repeat run keeps the
	// rating it already earned instead of appearing to lose stars.
	private buildRatingLabel(stars: number): string {
		if (stars >= 3) return '¡Perfecto!';
		if (stars >= 2) return '¡Muy bien!';
		if (stars >= 1) return 'Bien, se puede mejorar';
		return 'Sin estrellas todavía';
	}

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

export { RouteCompleteModal };
export type { RouteCompleteModalPayload };
