import { Game } from '../Game';
import { GameState } from '../GameState';

class KeyboardInputCoordinator {
    private game: Game;
    private onQuitRun: () => void;
    private onSkipCountdown: () => void;
    private bound: boolean;

    constructor(game: Game, onQuitRun: () => void, onSkipCountdown: () => void) {
        this.game = game;
        this.onQuitRun = onQuitRun;
        this.onSkipCountdown = onSkipCountdown;
        this.bound = false;
    }

    bind(): void {
        if (this.bound) return;
        window.addEventListener('keydown', this.handleKeydown);
        this.bound = true;
    }

    unbind(): void {
        if (!this.bound) return;
        window.removeEventListener('keydown', this.handleKeydown);
        this.bound = false;
    }

    private handleKeydown = (event: KeyboardEvent): void => {
        // Ahead of the editable-element guard below: during the countdown the focus
        // already sits in the hidden typing input.
        if (this.game.state === GameState.COUNTDOWN && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            this.onSkipCountdown();
            return;
        }

        if (event.key === 'Escape') {
            // During a run the route is still selected, so quitting has to win over
            // the deselect branch or Escape would need two presses to leave the run.
            if (this.game.state === GameState.PLAYING || this.game.state === GameState.COUNTDOWN) {
                this.onQuitRun();
                return;
            }

            if (this.game.map_controller.getSelectedRouteId() !== null) {
                this.game.map_controller.selectRoute(null);
                this.game.map_controller.resetToCountryView();
            }

            return;
        }

        if (this.game.state !== GameState.PLAYING) return;

        // Typing input is handled via the focused hidden input's `input` event.
        // Skip keydown character forwarding when focus is inside editable elements
        // to avoid duplicate processing and inflated mistake counts.
        const activeElement = document.activeElement;
        if (
            activeElement instanceof HTMLInputElement
            || activeElement instanceof HTMLTextAreaElement
            || (activeElement instanceof HTMLElement && activeElement.isContentEditable)
        ) {
            return;
        }

        if (event.key.length === 1) this.game.typing_controller.handleInput(event.key);
    };
}

export { KeyboardInputCoordinator };
