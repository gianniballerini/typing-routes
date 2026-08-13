import { BaseModal } from './BaseModal';

class AchievementsModal extends BaseModal {
	constructor(onCloseRequested: () => void) {
		super('.achievements-modal', '.achievements-modal__close-button', onCloseRequested);
	}
}

export { AchievementsModal };
