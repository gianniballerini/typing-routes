import { MapController } from '../MapController';
import { Settings } from '../Settings';

type PaneCompat = {
    addBinding?: (
        object: { showHitboxes: boolean },
        key: 'showHitboxes',
        options: { label: string }
    ) => { on: (eventName: string, handler: (event: { value: unknown }) => void) => void };
    addInput?: (
        object: { showHitboxes: boolean },
        key: 'showHitboxes',
        options: { label: string }
    ) => { on: (eventName: string, handler: (event: { value: unknown }) => void) => void };
};

class DebugPaneController {
    private static readonly CONTAINER_ID = 'debug-pane-container';
    private readonly map_controller: MapController;

    constructor(map_controller: MapController) {
        this.map_controller = map_controller;
    }

    init(): void {
        const debug_state = {
            showHitboxes: Settings.cityCircle.hitboxDebug.visible || Settings.routeLine.hitboxDebug.visible
        };

        this.map_controller.setHitboxVisibility(debug_state.showHitboxes);

        void import('tweakpane').then(({ Pane }) => {
            const container = this.ensureContainer();
            const pane = new Pane({
                title: 'Debug',
                container
            });
            const pane_with_compat = pane as unknown as PaneCompat;

            const binding = pane_with_compat.addBinding
                ? pane_with_compat.addBinding(debug_state, 'showHitboxes', { label: 'Hitboxes' })
                : pane_with_compat.addInput?.(debug_state, 'showHitboxes', { label: 'Hitboxes' });

            if (!binding) return;

            binding.on('change', (event: { value: unknown }) => {
                this.map_controller.setHitboxVisibility(Boolean(event.value));
            });
        });
    }

    private ensureContainer(): HTMLElement {
        const existing = document.getElementById(DebugPaneController.CONTAINER_ID);
        if (existing) {
            existing.remove();
        }

        const container = document.createElement('div');
        container.id = DebugPaneController.CONTAINER_ID;
        container.style.position = 'fixed';
        container.style.top = '12px';
        container.style.right = '12px';
        container.style.zIndex = '9999';
        container.style.pointerEvents = 'auto';

        document.body.appendChild(container);
        return container;
    }
}

export { DebugPaneController };
