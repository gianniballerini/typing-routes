import { GsapManager } from '../app/GsapManager';
import { AchievementsModal } from './modals/AchievementsModal';
import { BaseModal } from './modals/BaseModal';
import { HowToPlayModal } from './modals/HowToPlayModal';
import type { ModalStateValue, OpenModalStateValue } from './modals/ModalState';
import { ModalState } from './modals/ModalState';
import type { RouteCompleteModalPayload } from './modals/RouteCompleteModal';
import { RouteCompleteModal } from './modals/RouteCompleteModal';
import { RouteListModal } from './modals/RouteListModal';
import { SettingsModal } from './modals/SettingsModal';

// Owns the modal shell only: which state is open, switching between states and
// showing/hiding. Everything inside a given modal lives in its own class.
class ModalController {
	readonly routeCompleteModal: RouteCompleteModal;
	readonly howToPlayModal: HowToPlayModal;
	readonly routeListModal: RouteListModal;
	readonly achievementsModal: AchievementsModal;
	readonly settingsModal: SettingsModal;

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
		this.settingsModal = new SettingsModal(this.hide);

		this.modalsByState = {
			[ModalState.ROUTE_COMPLETE]: this.routeCompleteModal,
			[ModalState.HOW_TO_PLAY]: this.howToPlayModal,
			[ModalState.ROUTE_LIST]: this.routeListModal,
			[ModalState.ACHIEVEMENTS]: this.achievementsModal,
			[ModalState.SETTINGS]: this.settingsModal
		};

		this.overlayEl?.addEventListener('click', this.hide);
	}

	show(state: ModalStateValue): void {
		if (state === ModalState.NONE) {
			this.hide();
			return;
		}

		// Switching states inside an open shell only swaps the panel; the backdrop
		// stays put instead of blinking out and back in.
		const wasOpen = this.isOpen();

		for (const modal of Object.values(this.modalsByState)) {
			modal.hide();
		}

		// The shell is uncovered first so the state's own show() has a laid-out
		// element to move focus onto. Reopening mid-exit lands here too, and the
		// enter animation below takes over from wherever the exit had got to.
		this.rootEl?.classList.remove('hidden', 'modal--closing');

		const modal = this.modalsByState[state];
		modal.show();
		this.currentState = state;

		GsapManager.playModalIn({
			overlay: wasOpen ? null : this.overlayEl,
			panel: modal.getRootElement()
		});

		this.bindEscapeKey();
	}

	// The shell counts as closed from the first frame of the exit: focus goes back
	// and the keys are released straight away, only the pixels linger while the
	// panel swings out.
	hide = (): void => {
		const openModal = this.currentState === ModalState.NONE
			? null
			: this.modalsByState[this.currentState];

		this.currentState = ModalState.NONE;
		this.unbindEscapeKey();

		if (!openModal || !this.rootEl || this.rootEl.classList.contains('hidden')) {
			this.hideImmediately();
			return;
		}

		openModal.restoreFocus();
		this.rootEl.classList.add('modal--closing');

		GsapManager.playModalOut(
			{ overlay: this.overlayEl, panel: openModal.getRootElement() },
			this.hideImmediately
		);
	};

	private hideImmediately = (): void => {
		for (const modal of Object.values(this.modalsByState)) {
			modal.hide();
		}

		this.rootEl?.classList.add('hidden');
		this.rootEl?.classList.remove('modal--closing');
	};

	getState(): ModalStateValue {
		return this.currentState;
	}

	isOpen(): boolean {
		return this.currentState !== ModalState.NONE;
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

