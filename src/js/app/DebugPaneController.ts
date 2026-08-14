import { AudioManager } from '../audio/AudioManager';
import { MapController } from '../MapController';
import { Settings } from '../Settings';

interface BindingOptions {
    label: string;
    min?: number;
    max?: number;
    step?: number;
}

interface BindingCompat {
    on: (eventName: string, handler: (event: { value: unknown }) => void) => void;
}

type BindingFactory = (
    object: Record<string, unknown>,
    key: string,
    options: BindingOptions
) => BindingCompat;

type PaneCompat = {
    addBinding?: BindingFactory;
    addInput?: BindingFactory;
};

interface DebugState {
    showHitboxes: boolean;
    muted: boolean;
    masterVolume: number;
    keysVolume: number;
    musicVolume: number;
}

class DebugPaneController {
    private static readonly CONTAINER_ID = 'debug-pane-container';
    private readonly map_controller: MapController;
    private readonly audio_manager: AudioManager;

    constructor(map_controller: MapController, audio_manager: AudioManager) {
        this.map_controller = map_controller;
        this.audio_manager = audio_manager;
    }

    init(): void {
        const debug_state: DebugState = {
            showHitboxes: Settings.cityCircle.hitboxDebug.visible || Settings.routeLine.hitboxDebug.visible,
            muted: this.audio_manager.isMuted(),
            masterVolume: this.audio_manager.getMasterVolume(),
            keysVolume: Settings.audio.categoryVolumes.keys,
            musicVolume: Settings.audio.categoryVolumes.music
        };

        this.map_controller.setHitboxVisibility(debug_state.showHitboxes);

        void import('tweakpane').then(({ Pane }) => {
            const container = this.ensureContainer();
            const pane = new Pane({
                title: 'Debug',
                container
            });
            const pane_with_compat = pane as unknown as PaneCompat;
            const state = debug_state as unknown as Record<string, unknown>;

            // Tweakpane renamed `addInput` to `addBinding` in v4.
            const bind = (key: keyof DebugState, options: BindingOptions): BindingCompat | undefined =>
                pane_with_compat.addBinding
                    ? pane_with_compat.addBinding(state, key, options)
                    : pane_with_compat.addInput?.(state, key, options);

            bind('showHitboxes', { label: 'Hitboxes' })?.on('change', (event) => {
                this.map_controller.setHitboxVisibility(Boolean(event.value));
            });

            bind('muted', { label: 'Mute' })?.on('change', (event) => {
                this.audio_manager.setMuted(Boolean(event.value));
            });

            const volume = { min: 0, max: 1, step: 0.05 };
            bind('masterVolume', { label: 'Volume', ...volume })?.on('change', (event) => {
                this.audio_manager.setMasterVolume(Number(event.value));
            });

            bind('keysVolume', { label: 'Keys', ...volume })?.on('change', (event) => {
                this.audio_manager.setCategoryVolume('keys', Number(event.value));
            });

            bind('musicVolume', { label: 'Music', ...volume })?.on('change', (event) => {
                this.audio_manager.setCategoryVolume('music', Number(event.value));
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
        // Clears the audio toggle, which owns the top-right corner.
        container.style.top = '72px';
        container.style.right = '12px';
        container.style.zIndex = '9999';
        container.style.pointerEvents = 'auto';

        document.body.appendChild(container);
        return container;
    }
}

export { DebugPaneController };
