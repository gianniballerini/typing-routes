import { BaseModal } from './BaseModal';

class HowToPlayModal extends BaseModal {
	constructor(onCloseRequested: () => void) {
		super('.how-to-play-modal', '.how-to-play-modal__close-button', onCloseRequested);
	}
}

export { HowToPlayModal };
