// Shared behaviour for every modal state: resolving its root element, toggling
// visibility and forwarding its own close button to the owning ModalController.
abstract class BaseModal {
    protected rootEl: HTMLElement | null;
    protected closeButtonEl: HTMLElement | null;
    private onCloseRequested: () => void;
    private previouslyFocusedEl: HTMLElement | null;

    constructor(rootSelector: string, closeButtonSelector: string, onCloseRequested: () => void) {
        this.rootEl = document.querySelector(rootSelector);
        this.closeButtonEl = this.rootEl?.querySelector(closeButtonSelector) ?? null;
        this.onCloseRequested = onCloseRequested;
        this.previouslyFocusedEl = null;
        this.closeButtonEl?.addEventListener('click', this.handleCloseClick);
        this.closeButtonEl?.addEventListener('keydown', this.handleCloseKeydown);
    }

    show(): void {
        this.previouslyFocusedEl = document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;

        this.rootEl?.classList.remove('hidden');

        this.focusInitialElement();
    }

    hide(): void {
        this.restoreFocus();
        this.rootEl?.classList.add('hidden');
    }

    // Split from hide() so the shell can hand focus back the moment a close
    // starts, instead of once the exit animation has finished — by then whatever
    // the close led to (a countdown, the menu) may already own focus.
    restoreFocus(): void {
        // Every state is hidden on close, so only the one that was actually open
        // hands focus back to whatever opened it.
        const wasOpen = this.rootEl?.classList.contains('hidden') === false;

        if (wasOpen) this.previouslyFocusedEl?.focus();
        this.previouslyFocusedEl = null;
    }

    getRootElement(): HTMLElement | null {
        return this.rootEl;
    }

    // Focus has to land inside the modal for Escape to read as "go back" rather
    // than "close a thing I was never in". States with richer content override this.
    protected focusInitialElement(): void {
        this.closeButtonEl?.focus({ preventScroll: true });
    }

    protected handleCloseClick = (): void => {
        this.onCloseRequested();
    };

    // The close button is a div, so Enter and Space need wiring by hand.
    private handleCloseKeydown = (event: KeyboardEvent): void => {
        if (event.key !== 'Enter' && event.key !== ' ') return;

        event.preventDefault();
        this.onCloseRequested();
    };
}

export { BaseModal };
