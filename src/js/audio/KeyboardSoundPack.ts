import { Settings } from '../Settings';
import { keycodeForEventCode, randomFallbackKeycode } from './KeycodeMap';
import type { KeyPackDefinition, KeyPackSource, MechvibesConfig } from './types';

interface SpriteRegion {
    offsetSeconds: number;
    durationSeconds: number;
}

interface KeyVoice {
    source: AudioBufferSourceNode;
    gain: GainNode;
}

// Owns one Mechvibes pack: its `config.json` region table and the decoded sprite
// the regions point into. Playback slices the shared buffer via
// `start(when, offset, duration)` rather than pre-cutting ~90 buffers.
class KeyboardSoundPack {
    private readonly context: AudioContext;
    private readonly destination: AudioNode;

    private buffer: AudioBuffer | null = null;
    private regions = new Map<number, SpriteRegion>();
    private voices: KeyVoice[] = [];
    private packVolume = 1;

    constructor(context: AudioContext, destination: AudioNode) {
        this.context = context;
        this.destination = destination;
    }

    get ready(): boolean {
        return this.buffer !== null && this.regions.size > 0;
    }

    async load(
        definition: KeyPackDefinition,
        onBytesLoaded?: (bytes: number) => void
    ): Promise<void> {
        const source = this.pickPlayableSource(definition.sources);
        if (!source) {
            throw new Error('No playable keyboard sprite source for this browser');
        }

        this.packVolume = definition.volume ?? 1;

        const config = await this.fetchConfig(definition.configUrl);
        // The sprite is the heavy half; the config is a few KB and its download
        // is not worth reporting separately.
        const spriteBytes = await this.fetchArrayBuffer(source.url);
        onBytesLoaded?.(source.size);

        // `decodeAudioData` detaches the buffer it is handed, so nothing may read
        // `spriteBytes` after this point.
        this.buffer = await this.context.decodeAudioData(spriteBytes);
        this.regions = this.buildRegions(config, source.offsetCompensationMs ?? 0);
    }

    playForEventCode(code: string, volume: number): void {
        const keycode = keycodeForEventCode(code);
        const region = keycode === null ? null : this.regions.get(keycode);
        // Unmapped keys still deserve a click rather than silence.
        this.playRegion(region ?? this.fallbackRegion(), volume);
    }

    playFallback(volume: number): void {
        this.playRegion(this.fallbackRegion(), volume);
    }

    stopAll(): void {
        for (const voice of this.voices.splice(0)) {
            this.stopVoice(voice);
        }
    }

    private playRegion(region: SpriteRegion | null, volume: number): void {
        if (!this.buffer || !region) return;

        const { maxVoices, attackMs, releaseMs, gainJitter } = Settings.audio.key;
        while (this.voices.length >= maxVoices) {
            const oldest = this.voices.shift();
            if (oldest) this.stopVoice(oldest);
        }

        const jitter = 1 + (Math.random() * 2 - 1) * gainJitter;
        const peak = Math.max(0, volume * this.packVolume * jitter);

        const gain = this.context.createGain();
        gain.connect(this.destination);

        const source = this.context.createBufferSource();
        source.buffer = this.buffer;
        source.connect(gain);

        // The sprite slices start and end mid-waveform, so ramp both edges.
        const startAt = this.context.currentTime;
        const attack = attackMs / 1000;
        const release = releaseMs / 1000;
        const sustainUntil = startAt + Math.max(attack, region.durationSeconds - release);

        gain.gain.setValueAtTime(0, startAt);
        gain.gain.linearRampToValueAtTime(peak, startAt + attack);
        gain.gain.setValueAtTime(peak, sustainUntil);
        gain.gain.linearRampToValueAtTime(0, sustainUntil + release);

        const voice: KeyVoice = { source, gain };
        this.voices.push(voice);
        source.onended = () => {
            gain.disconnect();
            const index = this.voices.indexOf(voice);
            if (index !== -1) this.voices.splice(index, 1);
        };

        source.start(startAt, region.offsetSeconds, region.durationSeconds);
    }

    private stopVoice(voice: KeyVoice): void {
        voice.source.onended = null;
        try {
            voice.source.stop();
        } catch {
            // Already stopped; nothing to unwind.
        }
        voice.gain.disconnect();
    }

    private fallbackRegion(): SpriteRegion | null {
        // Try a few draws before giving up: a pack is not obliged to define
        // every home-row key.
        for (let attempt = 0; attempt < 4; attempt += 1) {
            const region = this.regions.get(randomFallbackKeycode());
            if (region) return region;
        }

        const first = this.regions.values().next();
        return first.done ? null : first.value;
    }

    private buildRegions(config: MechvibesConfig, compensationMs: number): Map<number, SpriteRegion> {
        const regions = new Map<number, SpriteRegion>();
        const bufferDuration = this.buffer ? this.buffer.duration : 0;

        for (const [rawKeycode, define] of Object.entries(config.defines)) {
            if (!Array.isArray(define) || define.length < 2) continue;

            const keycode = Number(rawKeycode);
            const [startMs, durationMs] = define;
            if (!Number.isFinite(keycode) || !Number.isFinite(startMs) || !Number.isFinite(durationMs)) continue;
            if (durationMs <= 0) continue;

            const offsetSeconds = Math.max(0, (startMs + compensationMs) / 1000);
            if (offsetSeconds >= bufferDuration) continue;

            regions.set(keycode, {
                offsetSeconds,
                durationSeconds: Math.min(durationMs / 1000, bufferDuration - offsetSeconds),
            });
        }

        return regions;
    }

    private pickPlayableSource(sources: KeyPackSource[]): KeyPackSource | null {
        if (!sources || sources.length === 0) return null;

        const probe = document.createElement('audio');
        for (const source of sources) {
            if (!source.type || probe.canPlayType(source.type) !== '') return source;
        }

        return null;
    }

    private async fetchConfig(url: string): Promise<MechvibesConfig> {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to load sound pack config: ${url} (${response.status})`);

        const config = await response.json() as MechvibesConfig;
        if (!config || typeof config.defines !== 'object') {
            throw new Error(`Sound pack config has no defines: ${url}`);
        }

        return config;
    }

    private async fetchArrayBuffer(url: string): Promise<ArrayBuffer> {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to load sound pack sprite: ${url} (${response.status})`);

        return response.arrayBuffer();
    }
}

export { KeyboardSoundPack };
