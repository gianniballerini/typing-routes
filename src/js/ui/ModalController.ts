import { AchievementsModal } from './modals/AchievementsModal';
import { BaseModal } from './modals/BaseModal';
import { HowToPlayModal } from './modals/HowToPlayModal';
import { ModalState } from './modals/ModalState';
import type { ModalStateValue, OpenModalStateValue } from './modals/ModalState';
import { RouteCompleteModal } from './modals/RouteCompleteModal';
import type { RouteCompleteModalPayload } from './modals/RouteCompleteModal';
import { RouteListModal } from './modals/RouteListModal';

// Owns the modal shell only: which state is open, switching between states and
// showing/hiding. Everything inside a given modal lives in its own class.
class ModalController {
	readonly routeCompleteModal: RouteCompleteModal;
	readonly howToPlayModal: HowToPlayModal;
	readonly routeListModal: RouteListModal;
	readonly achievementsModal: AchievementsModal;

	private rootEl: HTMLElement | null;
	private overlayEl: HTMLElement | null;
	private currentState: ModalStateValue;
	private modalsByState: Record<OpenModalStateValue, BaseModal>;
	private escapeBound: boolean;

	constructor() {
		this.rootEl = document.querySelector('.modal');
		this.overlayEl = document.querySelector('.modal__overlay');
		this.currentState = ModalState.NONE;
		this.escapeBound = false;

		this.routeCompleteModal = new RouteCompleteModal(this.hide);
		this.howToPlayModal = new HowToPlayModal(this.hide);
		this.routeListModal = new RouteListModal(this.hide);
		this.achievementsModal = new AchievementsModal(this.hide);

		this.modalsByState = {
			[ModalState.ROUTE_COMPLETE]: this.routeCompleteModal,
			[ModalState.HOW_TO_PLAY]: this.howToPlayModal,
			[ModalState.ROUTE_LIST]: this.routeListModal,
			[ModalState.ACHIEVEMENTS]: this.achievementsModal
		};

		this.overlayEl?.addEventListener('click', this.hide);
	}

	show(state: ModalStateValue): void {
		if (state === ModalState.NONE) {
			this.hide();
			return;
		}

		for (const modal of Object.values(this.modalsByState)) {
			modal.hide();
		}

		this.modalsByState[state].show();
		this.currentState = state;

		this.rootEl?.classList.remove('hidden');
		this.bindEscapeKey();
	}

	hide = (): void => {
		for (const modal of Object.values(this.modalsByState)) {
			modal.hide();
		}

		this.currentState = ModalState.NONE;

		this.rootEl?.classList.add('hidden');
		this.unbindEscapeKey();
	};

	getState(): ModalStateValue {
		return this.currentState;
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

	// Capture phase + stopPropagation so the bubble-phase Escape handler in
	// KeyboardInputCoordinator does not also quit the run / deselect the route.
	private handleEscapeKeydown = (event: KeyboardEvent): void => {
		if (event.key !== 'Escape' || !this.isOpen()) return;

		event.preventDefault();
		event.stopPropagation();
		this.hide();
	};
}

export { ModalController, ModalState };
export type { ModalStateValue, RouteCompleteModalPayload };
