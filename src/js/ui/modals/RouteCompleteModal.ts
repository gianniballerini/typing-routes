import {
	buildRatingLabel,
	formatAccuracy,
	formatElapsedTime,
	formatInteger,
	formatOneDecimal
} from '../../utils/StatFormatters';
import { renderStars } from '../StarsView';
import { BaseModal } from './BaseModal';

// A record is shown as a medal drawn by CSS on this modifier, so the value stays
// a clean number with no wording baked into it.
const NEW_RECORD_CLASS = 'route-complete-modal__stat-value--new-record';
const NEW_RECORD_LABEL = 'Nuevo récord';

interface RouteCompleteModalPayload {
	routeId: string;
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
	private route_id: string;
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

	private retryButtonEl: HTMLElement | null;
	private shareButtonEl: HTMLElement | null;
	// Left to right, which is the order the arrows walk them in.
	private actionButtonEls: HTMLElement[];
	// The card is drawn from the run, not from the panel, so the last rendered
	// payload is what the share handler needs — the coordinator has already let
	// go of the live run stats by the time this modal opens.
	private lastPayload: RouteCompleteModalPayload | null;
	// A capture takes a few frames and fills one shared off-screen card, so a
	// second click mid-flight would race the first for the same DOM.
	private isSharing: boolean;
	private onShareRequestedHandler: ((payload: RouteCompleteModalPayload) => Promise<void>) | null;
	private onRetryHandler: ((routeId: string) => void) | null;

	constructor(onCloseRequested: () => void) {
		super('.route-complete-modal', '.route-complete-modal__close-button', onCloseRequested);

		this.route_name = '';
		this.route_id = '';

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

		this.retryButtonEl = document.querySelector('.route-complete-modal__retry-button');
		this.shareButtonEl = document.querySelector('.route-complete-modal__share-button');

		this.actionButtonEls = [this.retryButtonEl, this.shareButtonEl]
			.filter((el): el is HTMLElement => el !== null);

		this.lastPayload = null;
		this.isSharing = false;
		this.onShareRequestedHandler = null;
		this.onRetryHandler = null;

		this.bindAction(this.retryButtonEl, this.retry);
		this.bindAction(this.shareButtonEl, this.share);
	}

	onShareRequested(handler: (payload: RouteCompleteModalPayload) => Promise<void>): void {
		this.onShareRequestedHandler = handler;
	}

	onRetry(handler: (routeId: string) => void): void {
		this.onRetryHandler = handler;
	}

	// Opens on "Reintentar" so Enter replays the route straight away — by far the
	// likeliest thing to want next, and the reason the button exists.
	protected focusInitialElement(): void {
		if (!this.retryButtonEl) {
			super.focusInitialElement();
			return;
		}

		this.retryButtonEl.focus({ preventScroll: true });
	}

	// The action buttons are divs, so Enter and Space need wiring by hand, and the
	// arrows walk between them the way they walk the route grid and the sliders.
	private bindAction(el: HTMLElement | null, handler: () => void): void {
		el?.addEventListener('click', handler);
		el?.addEventListener('keydown', (event: KeyboardEvent) => {
			const step = this.getNavigationStep(event.key);
			if (step !== 0) {
				event.preventDefault();
				this.focusRelativeAction(el, step);
				return;
			}

			if (event.key !== 'Enter' && event.key !== ' ') return;

			event.preventDefault();
			// Retrying puts the game into COUNTDOWN synchronously, so this same
			// keystroke must not bubble to KeyboardInputCoordinator — there,
			// Enter/Space means "skip the countdown" and the run would start instantly.
			event.stopPropagation();
			handler();
		});
	}

	private getNavigationStep(key: string): number {
		if (key === 'ArrowRight' || key === 'ArrowDown') return 1;
		if (key === 'ArrowLeft' || key === 'ArrowUp') return -1;
		return 0;
	}

	private focusRelativeAction(currentEl: HTMLElement, step: number): void {
		const currentIndex = this.actionButtonEls.indexOf(currentEl);
		if (currentIndex === -1) return;

		const nextIndex = Math.max(0, Math.min(this.actionButtonEls.length - 1, currentIndex + step));
		if (nextIndex === currentIndex) return;

		this.actionButtonEls[nextIndex].focus({ preventScroll: true });
	}

	private retry = (): void => {
		if (!this.route_id) return;

		this.onRetryHandler?.(this.route_id);
	};

	render(payload: RouteCompleteModalPayload): void {
		this.lastPayload = payload;
		this.route_id = payload.routeId;
		this.route_name = payload.routeTitle || 'Ruta completada';
		const title = this.route_name;
		if (this.titleEl) this.titleEl.textContent = title;

		renderStars(this.starsEl, payload.stars, { animate: true });
		if (this.ratingLabelEl) {
			this.ratingLabelEl.textContent = buildRatingLabel(payload.stars);
		}

		this.renderStat(this.comboEl, formatInteger(payload.combo), Boolean(payload.isNewComboRecord));
		this.renderStat(this.grossWpmEl, formatOneDecimal(payload.grossWpm), Boolean(payload.isNewGrossWpmRecord));
		this.renderStat(this.netWpmEl, formatOneDecimal(payload.netWpm), Boolean(payload.isNewNetWpmRecord));
		this.renderStat(this.accuracyEl, formatAccuracy(payload.accuracy), Boolean(payload.isNewAccuracyRecord));
		this.renderStat(this.elapsedEl, formatElapsedTime(payload.elapsedMs), Boolean(payload.isNewTimeRecord));
		// Neither of these can be a record; routed through the same call so a
		// stale medal from an earlier run cannot survive on them either.
		this.renderStat(this.citiesEl, formatInteger(payload.citiesTotal), false);
		this.renderStat(this.mistakesEl, formatInteger(payload.mistakes), false);
	}

	// The medal is a background image, which assistive tech cannot see, so the
	// record is also stated in an aria-label that keeps the value with it.
	private renderStat(el: HTMLElement | null, value: string, isNewRecord: boolean): void {
		if (!el) return;

		el.textContent = value;
		el.classList.toggle(NEW_RECORD_CLASS, isNewRecord);

		if (isNewRecord) {
			el.setAttribute('title', NEW_RECORD_LABEL);
			el.setAttribute('aria-label', `${value}, ${NEW_RECORD_LABEL.toLowerCase()}`);
			return;
		}

		el.removeAttribute('title');
		el.removeAttribute('aria-label');
	}

	// The panel is no longer the artwork: the picture comes from the off-screen
	// share card, so there is nothing to hide here and no buttons to flicker.
	private share = async (): Promise<void> => {
		if (!this.lastPayload || this.isSharing || !this.onShareRequestedHandler) return;

		this.isSharing = true;
		try {
			await this.onShareRequestedHandler(this.lastPayload);
		}
		finally {
			this.isSharing = false;
		}
	};

}

export { RouteCompleteModal };
export type { RouteCompleteModalPayload };
