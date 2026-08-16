interface MapRouteCursorDeps {
    // Same ordered, playable-only list the route picker walks.
    getOrderedRouteIds: () => string[];
    getSelectedRouteId: () => string | null;
    selectRoute: (routeId: string | null) => void;
    startRoute: (routeId: string) => void;
    // Hands the arrow keys back to the menu column.
    onExit: () => void;
    canActivate: () => boolean;
    onStep?: () => void;
}

/**
 * The map half of the menu's two-zone arrow model: while active, up and down walk
 * the routes as a list and select each one exactly as a click would, so the
 * highlight, the route card and the camera all follow for free.
 *
 * The listener runs in the capture phase — the same trick ModalController uses for
 * Escape — so the keys it consumes never reach KeyboardInputCoordinator, where
 * Enter would skip the countdown this very keystroke just started and Escape would
 * deselect a second time.
 */
class MapRouteCursor {
    private deps: MapRouteCursorDeps;
    private active: boolean;
    private bound: boolean;

    constructor(deps: MapRouteCursorDeps) {
        this.deps = deps;
        this.active = false;
        this.bound = false;
    }

    bind(): void {
        if (this.bound) return;
        window.addEventListener('keydown', this.handleKeydown, true);
        this.bound = true;
    }

    unbind(): void {
        if (!this.bound) return;
        window.removeEventListener('keydown', this.handleKeydown, true);
        this.bound = false;
    }

    isActive(): boolean {
        return this.active;
    }

    /**
     * Picks up from whatever is already selected — by mouse, by the route list or
     * by a previous visit — and selects straight away, so taking the arrows over
     * always shows something.
     */
    activate(): void {
        if (!this.deps.canActivate()) return;

        const routeIds = this.deps.getOrderedRouteIds();
        if (routeIds.length === 0) return;

        this.active = true;

        if (this.getCurrentIndex(routeIds) === -1) this.selectAt(routeIds, 0);
    }

    deactivate(): void {
        this.active = false;
    }

    private handleKeydown = (event: KeyboardEvent): void => {
        if (!this.active) return;

        if (!this.deps.canActivate()) {
            this.deactivate();
            return;
        }

        // A modal or the hidden typing input can take focus while the cursor is
        // still live; their own keys win.
        const activeElement = document.activeElement;
        if (
            activeElement instanceof HTMLInputElement
            || activeElement instanceof HTMLTextAreaElement
            || (activeElement instanceof HTMLElement && activeElement.isContentEditable)
        ) {
            return;
        }

        switch (event.key) {
            case 'ArrowDown':
                this.step(event, 1);
                return;
            case 'ArrowUp':
                this.step(event, -1);
                return;
            case 'Enter':
            case ' ':
                this.activateCurrent(event);
                return;
            case 'ArrowLeft':
            case 'Escape':
                this.exit(event);
                return;
            default:
                break;
        }
    };

    private step(event: KeyboardEvent, delta: number): void {
        const routeIds = this.deps.getOrderedRouteIds();
        if (routeIds.length === 0) return;

        event.preventDefault();
        event.stopPropagation();

        const currentIndex = this.getCurrentIndex(routeIds);
        const nextIndex = currentIndex === -1
            ? 0
            : (currentIndex + delta + routeIds.length) % routeIds.length;

        this.selectAt(routeIds, nextIndex);
        this.deps.onStep?.();
    }

    private activateCurrent(event: KeyboardEvent): void {
        const routeId = this.deps.getSelectedRouteId();
        if (!routeId) return;

        event.preventDefault();
        event.stopPropagation();

        this.deactivate();
        this.deps.startRoute(routeId);
    }

    private exit(event: KeyboardEvent): void {
        event.preventDefault();
        event.stopPropagation();

        this.deactivate();
        // Clears the highlight, lifts the card and resets the camera through the
        // usual `route-selected` path, which also drops the menu signs back in.
        this.deps.selectRoute(null);
        this.deps.onExit();
    }

    // Read from the live selection rather than a stored index, so a route clicked
    // on the map mid-session is where the next arrow press continues from.
    private getCurrentIndex(routeIds: string[]): number {
        const selectedRouteId = this.deps.getSelectedRouteId();
        if (!selectedRouteId) return -1;

        return routeIds.indexOf(selectedRouteId);
    }

    private selectAt(routeIds: string[], index: number): void {
        const routeId = routeIds[index];
        if (!routeId) return;

        this.deps.selectRoute(routeId);
    }
}

export { MapRouteCursor };
export type { MapRouteCursorDeps };
