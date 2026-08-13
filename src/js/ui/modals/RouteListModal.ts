import { BaseModal } from './BaseModal';

class RouteListModal extends BaseModal {
	constructor(onCloseRequested: () => void) {
		super('.route-list-modal', '.route-list-modal__close-button', onCloseRequested);
	}
}

export { RouteListModal };
