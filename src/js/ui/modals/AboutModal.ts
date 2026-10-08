import { BaseModal } from './BaseModal';

class AboutModal extends BaseModal {
	constructor(onCloseRequested: () => void) {
		super('.about-modal', '.about-modal__close-button', onCloseRequested);
	}
}

export { AboutModal };
