import { Settings } from '../Settings';
import type { AudioPreferences } from './AudioPreferencesStorage';
import { AudioPreferencesStorage } from './AudioPreferencesStorage';
import { KeyboardSoundPack } from './KeyboardSoundPack';
import type { SoundCategory, SoundDefinition, SoundManifest } from './types';

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
    private readonly preferencesStorage: AudioPreferencesStorage;
    private readonly preferences: AudioPreferences;

    private readonly context: AudioContext;
    private readonly masterGain: GainNode;
    private readonly categoryGains: Record<SoundCategory, GainNode>;

    private readonly keyPack: KeyboardSoundPack;
    private readonly buffered = new Map<string, BufferedSound>();
    private readonly streamed = new Map<string, StreamedSound>();
    private readonly voices = new Map<string, PlayingVoice[]>();
    private readonly missingWarned = new Set<string>();

    private keySoundsEnabled = false;
    private keyboardBound = false;
    private unlocked = false;
    private lastPhysicalKeyAt = -Infinity;

    constructor(preferencesStorage: AudioPreferencesStorage) {
        this.preferencesStorage = preferencesStorage;
        this.preferences = preferencesStorage.load();

        // Constructed suspended until a user gesture; see `unlock`.
        this.context = new AudioContext();

        this.masterGain = this.context.createGain();
        this.masterGain.gain.value = this.preferences.muted ? 0 : this.preferences.masterVolume;
        this.masterGain.connect(this.context.destination);

        this.categoryGains = {} as Record<SoundCategory, GainNode>;
        for (const category of CATEGORIES) {
            const gain = this.context.createGain();
            gain.gain.value = Settings.audio.categoryVolumes[category];
            gain.connect(this.masterGain);
            this.categoryGains[category] = gain;
        }

        this.keyPack = new KeyboardSoundPack(this.context, this.categoryGains.keys);
        this.bindUnlockGestures();
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

        const blocking = manifest.keyPack
            ? this.keyPack
                .load(manifest.keyPack, reportBytes)
                .catch((error: unknown) => {
                    console.warn('Keyboard sound pack failed to load; key sounds are off', error);
                })
            : Promise.resolve();

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

        return { definition, element, gain };
    }

    // A browser that cannot play the primary encoding gets the fallback; Safari
    // is the reason every sound ships as both Ogg and AAC.
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
        // The pack reports whichever encoding this browser picked, so budget for
        // the largest of them and let the cap in `reportBytes` absorb the slack.
        const packBytes = (manifest.keyPack?.sources ?? [])
            .reduce((largest, source) => Math.max(largest, source.size ?? 0), 0);
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

        streamed.gain.gain.value = (streamed.definition.volume ?? 1) * (options.volume ?? 1);
        if (options.rate) streamed.element.playbackRate = options.rate;
        if (options.loop !== undefined) streamed.element.loop = options.loop;

        streamed.element.currentTime = 0;
        void streamed.element.play().catch(() => undefined);
    }

    stop(name: string, fadeMs = 0): void {
        const streamed = this.streamed.get(name);
        if (streamed) {
            this.fadeOut(streamed.gain, fadeMs, () => {
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

    // --- volume and mute ---------------------------------------------------

    isMuted(): boolean {
        return this.preferences.muted;
    }

    setMuted(muted: boolean): void {
        if (this.preferences.muted === muted) return;

        this.preferences.muted = muted;
        this.rampGain(this.masterGain, muted ? 0 : this.preferences.masterVolume);
        if (muted) this.keyPack.stopAll();
        this.preferencesStorage.save(this.preferences);
    }

    toggleMute(): boolean {
        this.setMuted(!this.preferences.muted);
        return this.preferences.muted;
    }

    getMasterVolume(): number {
        return this.preferences.masterVolume;
    }

    setMasterVolume(value: number): void {
        this.preferences.masterVolume = Math.max(0, Math.min(1, value));
        if (!this.preferences.muted) this.rampGain(this.masterGain, this.preferences.masterVolume);
        this.preferencesStorage.save(this.preferences);
    }

    setCategoryVolume(category: SoundCategory, value: number): void {
        const gain = this.categoryGains[category];
        if (!gain) return;

        this.rampGain(gain, Math.max(0, Math.min(1, value)));
    }

    // --- internals ---------------------------------------------------------

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

export type { PlayOptions };
export { AudioManager };
