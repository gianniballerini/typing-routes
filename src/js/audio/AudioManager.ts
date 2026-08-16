import { Settings } from '../Settings';
import type { AudioPreferences } from './AudioPreferencesStorage';
import { AudioPreferencesStorage } from './AudioPreferencesStorage';
import { KeyboardSoundPack } from './KeyboardSoundPack';
import type { KeyPackDefinition, SoundCategory, SoundDefinition, SoundManifest } from './types';

interface PlayOptions {
    volume?: number;
    loop?: boolean;
    rate?: number;
}

interface BufferedSound {
    definition: SoundDefinition;
    buffer: AudioBuffer;
}

interface StreamedSound {
    definition: SoundDefinition;
    element: HTMLAudioElement;
    gain: GainNode;
    // Set while the app wants this element audible, so the deferred park in
    // `unlock` cannot pause a stream that was started from the same gesture.
    wantsPlayback: boolean;
}

interface PlayingVoice {
    source: AudioBufferSourceNode;
    gain: GainNode;
}

interface LoadResult {
    // Settles once the keyboard pack is usable. The loading screen waits on this.
    blocking: Promise<void>;
    // Settles once every entry has settled, failures included.
    all: Promise<void>;
}

const CATEGORIES: SoundCategory[] = ['music', 'sfx', 'keys'];
const DEFAULT_CATEGORY: SoundCategory = 'sfx';

// The single audio surface for the app. Everything routes through one
// `AudioContext`:
//
//     source -> voice gain -> category gain -> master gain -> destination
//
// Mute and volume ramp the gains rather than disconnecting, so nothing clicks
// and looping sounds keep their playhead. Nothing here throws at the caller: a
// missing or undecodable asset disables that one sound and is logged.
class AudioManager {
    private static readonly PREFERENCES_SAVE_DELAY_MS = 250;

    private readonly preferencesStorage: AudioPreferencesStorage;
    private readonly preferences: AudioPreferences;

    private readonly context: AudioContext;
    private readonly masterGain: GainNode;
    private readonly categoryGains: Record<SoundCategory, GainNode>;

    private readonly keyPack: KeyboardSoundPack;
    private readonly uiPack: KeyboardSoundPack;
    private readonly buffered = new Map<string, BufferedSound>();
    private readonly streamed = new Map<string, StreamedSound>();
    private readonly voices = new Map<string, PlayingVoice[]>();
    private readonly missingWarned = new Set<string>();

    private keySoundsEnabled = false;
    private keyboardBound = false;
    private unlocked = false;
    private lastPhysicalKeyAt = -Infinity;
    private pendingPreferencesSaveHandle: number | null;
    // Where a category's volume came from before it was muted. In memory only: a
    // muted category is a volume of 0, which the snapshot already persists, and a
    // slider that comes back from storage at 0 unmutes to the default instead.
    private readonly preMuteCategoryVolumes = new Map<SoundCategory, number>();

    constructor(preferencesStorage: AudioPreferencesStorage) {
        this.preferencesStorage = preferencesStorage;
        this.preferences = preferencesStorage.load();
        this.pendingPreferencesSaveHandle = null;

        // Constructed suspended until a user gesture; see `unlock`.
        this.context = new AudioContext();

        this.masterGain = this.context.createGain();
        this.masterGain.gain.value = this.preferences.muted ? 0 : this.preferences.masterVolume;
        this.masterGain.connect(this.context.destination);

        this.categoryGains = {} as Record<SoundCategory, GainNode>;
        for (const category of CATEGORIES) {
            const gain = this.context.createGain();
            gain.gain.value = this.preferences.categoryVolumes[category];
            gain.connect(this.masterGain);
            this.categoryGains[category] = gain;
        }

        this.keyPack = new KeyboardSoundPack(this.context, this.categoryGains.keys);
        // The UI pack is an effect, not the keyboard the player types on, so it
        // rides the sfx slider.
        this.uiPack = new KeyboardSoundPack(this.context, this.categoryGains.sfx);
        this.bindUnlockGestures();
        window.addEventListener('pagehide', this.handlePageHide);
    }

    // --- loading -----------------------------------------------------------

    load(
        manifest: SoundManifest,
        onProgress?: (loadedBytes: number, totalBytes: number) => void
    ): LoadResult {
        const totalBytes = this.totalBytes(manifest);
        let loadedBytes = 0;
        const reportBytes = (bytes: number): void => {
            loadedBytes += bytes;
            onProgress?.(Math.min(loadedBytes, totalBytes), totalBytes);
        };

        // Both packs gate the loading screen: the start CTA is itself a click, so
        // the UI pack has to be decoded before the player ever reaches the menu.
        const blocking = Promise.all([
            this.loadPack(this.keyPack, manifest.keyPack, 'Keyboard', reportBytes),
            this.loadPack(this.uiPack, manifest.uiPack, 'UI', reportBytes),
        ]).then(() => undefined);

        const rest = (manifest.sounds ?? []).map((definition) =>
            this.loadSound(definition)
                .then(() => reportBytes(definition.size ?? 0))
                .catch((error: unknown) => {
                    console.warn(`Sound "${definition.name}" failed to load`, error);
                    reportBytes(definition.size ?? 0);
                })
        );

        return {
            blocking,
            all: Promise.all([blocking, ...rest]).then(() => undefined),
        };
    }

    private loadPack(
        pack: KeyboardSoundPack,
        definition: KeyPackDefinition | undefined,
        label: string,
        reportBytes: (bytes: number) => void
    ): Promise<void> {
        if (!definition) return Promise.resolve();

        return pack.load(definition, reportBytes).catch((error: unknown) => {
            console.warn(`${label} sound pack failed to load; its sounds are off`, error);
        });
    }

    private async loadSound(definition: SoundDefinition): Promise<void> {
        const url = this.pickPlayableUrl(definition);

        if (definition.stream) {
            this.streamed.set(definition.name, this.createStreamedSound(definition, url));
            return;
        }

        const response = await fetch(url);
        if (!response.ok) throw new Error(`${url} responded ${response.status}`);

        const buffer = await this.context.decodeAudioData(await response.arrayBuffer());
        this.buffered.set(definition.name, { definition, buffer });
    }

    private createStreamedSound(definition: SoundDefinition, url: string): StreamedSound {
        const element = new Audio(url);
        element.preload = 'auto';
        element.loop = definition.loop === true;

        const gain = this.context.createGain();
        gain.gain.value = definition.volume ?? 1;
        gain.connect(this.categoryGains[definition.category ?? DEFAULT_CATEGORY]);
        this.context.createMediaElementSource(element).connect(gain);

        return { definition, element, gain, wantsPlayback: false };
    }

    // Everything currently ships as AAC alone, which every target browser can
    // decode. The fallback path stays for the day a second encoding earns its
    // place — Ogg/Opus is smaller, but only for the non-Safari half of the users.
    private pickPlayableUrl(definition: SoundDefinition): string {
        if (!definition.fallbackUrl) return definition.url;

        const probe = document.createElement('audio');
        const primaryType = this.mimeTypeForUrl(definition.url);
        if (!primaryType || probe.canPlayType(primaryType) !== '') return definition.url;

        return definition.fallbackUrl;
    }

    private mimeTypeForUrl(url: string): string | null {
        if (url.endsWith('.ogg') || url.endsWith('.oga')) return 'audio/ogg; codecs="vorbis"';
        if (url.endsWith('.m4a') || url.endsWith('.mp4')) return 'audio/mp4; codecs="mp4a.40.2"';
        if (url.endsWith('.webm')) return 'audio/webm; codecs="opus"';
        if (url.endsWith('.mp3')) return 'audio/mpeg';
        if (url.endsWith('.wav')) return 'audio/wav';
        return null;
    }

    private totalBytes(manifest: SoundManifest): number {
        // A pack reports whichever encoding this browser picked, so budget for the
        // largest of them and let the cap in `reportBytes` absorb the slack.
        const packBytes = [manifest.keyPack, manifest.uiPack].reduce(
            (sum, pack) => sum + (pack?.sources ?? [])
                .reduce((largest, source) => Math.max(largest, source.size ?? 0), 0),
            0
        );
        const soundBytes = (manifest.sounds ?? []).reduce((sum, sound) => sum + (sound.size ?? 0), 0);
        return Math.max(1, packBytes + soundBytes);
    }

    // --- unlocking ---------------------------------------------------------

    // Browsers start the context suspended until a user gesture. The loading
    // screen's start CTA is the app's first one; these listeners only matter if
    // that CTA is somehow bypassed.
    private bindUnlockGestures(): void {
        const handler = (): void => this.unlock();
        window.addEventListener('pointerdown', handler, { once: true });
        window.addEventListener('keydown', handler, { once: true });
    }

    unlock(): void {
        if (this.context.state === 'suspended') {
            void this.context.resume().catch(() => undefined);
        }

        if (this.unlocked) return;
        this.unlocked = true;

        // iOS refuses programmatic playback on a media element that has never
        // been started from a gesture, so start and immediately park each one.
        for (const stream of this.streamed.values()) {
            const started = stream.element.play();
            void Promise.resolve(started)
                .then(() => {
                    // The menu music is started from this very gesture, and this
                    // callback lands a turn later: parking it here would silence it.
                    if (stream.wantsPlayback) return;

                    stream.element.pause();
                    stream.element.currentTime = 0;
                })
                .catch(() => undefined);
        }
    }

    // --- named playback ----------------------------------------------------

    play(name: string, options: PlayOptions = {}): void {
        const streamed = this.streamed.get(name);
        if (streamed) {
            this.playStreamed(streamed, options);
            return;
        }

        const sound = this.buffered.get(name);
        if (!sound) {
            this.warnMissing(name);
            return;
        }

        this.resumeIfNeeded();

        const gain = this.context.createGain();
        gain.gain.value = (sound.definition.volume ?? 1) * (options.volume ?? 1);
        gain.connect(this.categoryGains[sound.definition.category ?? DEFAULT_CATEGORY]);

        const source = this.context.createBufferSource();
        source.buffer = sound.buffer;
        source.loop = options.loop ?? sound.definition.loop === true;
        if (options.rate) source.playbackRate.value = options.rate;
        source.connect(gain);

        const voice: PlayingVoice = { source, gain };
        this.trackVoice(name, voice);
        source.onended = () => {
            gain.disconnect();
            this.untrackVoice(name, voice);
        };

        source.start();
    }

    private playStreamed(streamed: StreamedSound, options: PlayOptions): void {
        this.resumeIfNeeded();

        streamed.wantsPlayback = true;

        // A fade-out may still be scheduled on this gain; assigning `.value` would
        // not cancel it and the restarted track would ramp itself back to silence.
        const now = this.context.currentTime;
        const level = (streamed.definition.volume ?? 1) * (options.volume ?? 1);
        streamed.gain.gain.cancelScheduledValues(now);
        streamed.gain.gain.setValueAtTime(level, now);

        if (options.rate) streamed.element.playbackRate = options.rate;
        if (options.loop !== undefined) streamed.element.loop = options.loop;

        streamed.element.currentTime = 0;
        void streamed.element.play().catch(() => undefined);
    }

    stop(name: string, fadeMs = 0): void {
        const streamed = this.streamed.get(name);
        if (streamed) {
            streamed.wantsPlayback = false;
            this.fadeOut(streamed.gain, fadeMs, () => {
                // Restarted mid-fade — abandoning a run inside the countdown puts
                // the menu music back before this callback lands.
                if (streamed.wantsPlayback) return;

                streamed.element.pause();
                streamed.element.currentTime = 0;
                streamed.gain.gain.value = streamed.definition.volume ?? 1;
            });
            return;
        }

        const voices = this.voices.get(name);
        if (!voices || voices.length === 0) return;

        for (const voice of voices.splice(0)) {
            voice.source.onended = null;
            this.fadeOut(voice.gain, fadeMs, () => {
                try {
                    voice.source.stop();
                } catch {
                    // Already ended.
                }
                voice.gain.disconnect();
            });
        }
    }

    stopAll(fadeMs = 0): void {
        for (const name of [...this.voices.keys(), ...this.streamed.keys()]) {
            this.stop(name, fadeMs);
        }
    }

    isPlaying(name: string): boolean {
        const streamed = this.streamed.get(name);
        if (streamed) return !streamed.element.paused;

        const voices = this.voices.get(name);
        return voices !== undefined && voices.length > 0;
    }

    pauseAll(): void {
        void this.context.suspend().catch(() => undefined);
    }

    resumeAll(): void {
        void this.context.resume().catch(() => undefined);
    }

    // --- key sounds --------------------------------------------------------

    // Bound on the window in the capture phase because neither existing input
    // path sees every key: `KeyboardInputCoordinator` bails out while the hidden
    // typing input holds focus, and that input only listens for `input`, which
    // never reports Backspace.
    bindKeyboardSounds(): void {
        if (this.keyboardBound) return;
        window.addEventListener('keydown', this.handleKeydown, true);
        this.keyboardBound = true;
    }

    unbindKeyboardSounds(): void {
        if (!this.keyboardBound) return;
        window.removeEventListener('keydown', this.handleKeydown, true);
        this.keyboardBound = false;
    }

    setKeySoundsEnabled(enabled: boolean): void {
        this.keySoundsEnabled = enabled;
        if (!enabled) this.keyPack.stopAll();
    }

    private handleKeydown = (event: KeyboardEvent): void => {
        // Held keys would machine-gun the sprite.
        if (event.repeat) return;
        if (!this.canPlayKeySound()) return;

        // Mobile virtual keyboards report no usable code; those keystrokes reach
        // us through `playKeyFromText` instead.
        const code = event.code;
        if (!code || code === 'Unidentified') return;

        this.lastPhysicalKeyAt = performance.now();
        this.keyPack.playForEventCode(code, 1);
    };

    // Fed by the hidden typing input's `input` event, the only signal a mobile
    // on-screen keyboard produces.
    playKeyFromText(text: string): void {
        if (!text || !this.canPlayKeySound()) return;

        const sincePhysicalKey = performance.now() - this.lastPhysicalKeyAt;
        if (sincePhysicalKey < Settings.audio.key.virtualKeyDedupeMs) return;

        this.keyPack.playFallback(1);
    }

    private canPlayKeySound(): boolean {
        if (!this.keySoundsEnabled) return false;
        if (this.preferences.muted) return false;
        if (!this.keyPack.ready) return false;

        this.resumeIfNeeded();
        return true;
    }

    // --- ui sounds ---------------------------------------------------------

    // Buttons, modals, route tiles, map selection — everything the player clicks
    // rather than types. Fixed sprite regions, so a button always sounds like the
    // same button.
    playUiClick(): void {
        this.playUiRegion(Settings.audio.ui.clickKeycode, Settings.audio.ui.clickVolume);
    }

    playUiHover(): void {
        this.playUiRegion(Settings.audio.ui.hoverKeycode, Settings.audio.ui.hoverVolume);
    }

    // The UI keyboard shortcuts share Enter and Space with the countdown skip, so
    // callers need to know when the typing sprite already owns the keystroke.
    areKeySoundsEnabled(): boolean {
        return this.keySoundsEnabled;
    }

    private playUiRegion(keycode: number, volume: number): void {
        if (this.preferences.muted) return;
        if (!this.uiPack.ready) return;

        this.resumeIfNeeded();
        this.uiPack.playForKeycode(keycode, volume);
    }

    // --- music -------------------------------------------------------------

    // Idempotent: the menu is re-entered from several paths and none of them
    // should restart a track that is already running.
    playMusic(): void {
        const track = Settings.audio.music.menuTrack;
        // Checked instead of `isPlaying`, which is still true during a fade-out —
        // that case has to restart rather than no-op.
        if (this.streamed.get(track)?.wantsPlayback) return;

        this.play(track);
    }

    stopMusic(fadeMs = Settings.audio.music.fadeOutMs): void {
        this.stop(Settings.audio.music.menuTrack, fadeMs);
    }

    // --- volume and mute ---------------------------------------------------

    isMuted(): boolean {
        return this.preferences.muted;
    }

    setMuted(muted: boolean): void {
        if (this.preferences.muted === muted) return;

        this.preferences.muted = muted;
        this.rampGain(this.masterGain, muted ? 0 : this.preferences.masterVolume);
        if (muted) {
            this.keyPack.stopAll();
            this.uiPack.stopAll();
        }
        this.schedulePreferencesSave();
    }

    toggleMute(): boolean {
        this.setMuted(!this.preferences.muted);
        return this.preferences.muted;
    }

    getMasterVolume(): number {
        return this.preferences.masterVolume;
    }

    setMasterVolume(value: number): void {
        const clampedValue = Math.max(0, Math.min(1, value));
        if (this.preferences.masterVolume === clampedValue) return;

        this.preferences.masterVolume = clampedValue;
        if (!this.preferences.muted) this.rampGain(this.masterGain, this.preferences.masterVolume);
        this.schedulePreferencesSave();
    }

    getCategoryVolume(category: SoundCategory): number {
        return this.preferences.categoryVolumes[category];
    }

    getCategoryVolumes(): Record<SoundCategory, number> {
        return {
            music: this.preferences.categoryVolumes.music,
            sfx: this.preferences.categoryVolumes.sfx,
            keys: this.preferences.categoryVolumes.keys,
        };
    }

    setCategoryVolume(category: SoundCategory, value: number): void {
        const gain = this.categoryGains[category];
        if (!gain) return;

        const clampedValue = Math.max(0, Math.min(1, value));
        if (this.preferences.categoryVolumes[category] === clampedValue) return;

        this.preferences.categoryVolumes[category] = clampedValue;
        this.rampGain(gain, clampedValue);
        this.schedulePreferencesSave();
    }

    isCategoryMuted(category: SoundCategory): boolean {
        return this.preferences.categoryVolumes[category] <= 0;
    }

    // Silences one slider without touching the others or the master mute, and
    // brings it back where it was.
    toggleCategoryMute(category: SoundCategory): boolean {
        if (this.isCategoryMuted(category)) {
            const restoredVolume = this.preMuteCategoryVolumes.get(category)
                ?? Settings.audio.categoryVolumes[category];

            this.preMuteCategoryVolumes.delete(category);
            this.setCategoryVolume(category, restoredVolume);
            return false;
        }

        this.preMuteCategoryVolumes.set(category, this.preferences.categoryVolumes[category]);
        this.setCategoryVolume(category, 0);
        return true;
    }

    // --- internals ---------------------------------------------------------

    private schedulePreferencesSave(): void {
        if (this.pendingPreferencesSaveHandle !== null) {
            window.clearTimeout(this.pendingPreferencesSaveHandle);
        }

        this.pendingPreferencesSaveHandle = window.setTimeout(() => {
            this.pendingPreferencesSaveHandle = null;
            this.preferencesStorage.save(this.preferences);
        }, AudioManager.PREFERENCES_SAVE_DELAY_MS);
    }

    private flushPendingPreferencesSave(): void {
        if (this.pendingPreferencesSaveHandle !== null) {
            window.clearTimeout(this.pendingPreferencesSaveHandle);
            this.pendingPreferencesSaveHandle = null;
        }

        this.preferencesStorage.save(this.preferences);
    }

    private handlePageHide = (): void => {
        this.flushPendingPreferencesSave();
    };

    private rampGain(gain: GainNode, value: number, durationMs = Settings.audio.volumeRampMs): void {
        const now = this.context.currentTime;
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.linearRampToValueAtTime(value, now + durationMs / 1000);
    }

    private fadeOut(gain: GainNode, fadeMs: number, onDone: () => void): void {
        if (fadeMs <= 0) {
            onDone();
            return;
        }

        this.rampGain(gain, 0, fadeMs);
        window.setTimeout(onDone, fadeMs);
    }

    private resumeIfNeeded(): void {
        if (this.context.state === 'suspended') {
            void this.context.resume().catch(() => undefined);
        }
    }

    private trackVoice(name: string, voice: PlayingVoice): void {
        const existing = this.voices.get(name);
        if (existing) {
            existing.push(voice);
            return;
        }

        this.voices.set(name, [voice]);
    }

    private untrackVoice(name: string, voice: PlayingVoice): void {
        const existing = this.voices.get(name);
        if (!existing) return;

        const index = existing.indexOf(voice);
        if (index !== -1) existing.splice(index, 1);
    }

    private warnMissing(name: string): void {
        if (!import.meta.env.DEV) return;
        if (this.missingWarned.has(name)) return;

        this.missingWarned.add(name);
        console.warn(`No sound named "${name}" in the manifest`);
    }
}

export { AudioManager };
export type { PlayOptions };

