// Shared behaviour for every modal state: resolving its root element, toggling
// visibility and forwarding its own close button to the owning ModalController.
abstract class BaseModal {
    protected rootEl: HTMLElement | null;
    protected closeButtonEl: HTMLElement | null;
    private onCloseRequested: () => void;

    constructor(rootSelector: string, closeButtonSelector: string, onCloseRequested: () => void) {
        this.rootEl = document.querySelector(rootSelector);
        this.closeButtonEl = this.rootEl?.querySelector(closeButtonSelector) ?? null;
        this.onCloseRequested = onCloseRequested;
        this.closeButtonEl?.addEventListener('click', this.handleCloseClick);
    }

    show(): void {
        this.rootEl?.classList.remove('hidden');
    }

    hide(): void {
        this.rootEl?.classList.add('hidden');
    }

    protected handleCloseClick = (): void => {
        this.onCloseRequested();
    };
}

export { BaseModal };
