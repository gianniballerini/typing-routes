import { Settings } from '../Settings';

const AUDIO_PREFERENCES_STORAGE_KEY = 'typing-routes.audio.v1';
const AUDIO_PREFERENCES_VERSION = 1;

interface AudioPreferences {
    muted: boolean;
    masterVolume: number;
}

interface AudioPreferencesSnapshot extends AudioPreferences {
    version: number;
}

// Deliberately its own key rather than a field on the user-stats snapshot:
// preferences are not progress, and folding them in would force a stats version
// bump plus a migration for an unrelated concern.
class AudioPreferencesStorage {
    private storageKey: string;

    constructor(storageKey: string = AUDIO_PREFERENCES_STORAGE_KEY) {
        this.storageKey = storageKey;
    }

    load(): AudioPreferences {
        const rawSnapshot = this.getStoredValue();
        if (!rawSnapshot) return this.defaults();

        try {
            const parsed: unknown = JSON.parse(rawSnapshot);
            if (this.isValidSnapshot(parsed)) {
                return { muted: parsed.muted, masterVolume: parsed.masterVolume };
            }

            console.warn('Invalid audio preferences payload in localStorage; using defaults');
        } catch {
            console.warn('Malformed audio preferences payload in localStorage; using defaults');
        }

        return this.defaults();
    }

    save(preferences: AudioPreferences): void {
        const snapshot: AudioPreferencesSnapshot = {
            version: AUDIO_PREFERENCES_VERSION,
            muted: preferences.muted,
            masterVolume: preferences.masterVolume,
        };

        this.setStoredValue(JSON.stringify(snapshot));
    }

    private defaults(): AudioPreferences {
        return { muted: false, masterVolume: Settings.audio.defaultMasterVolume };
    }

    private getStoredValue(): string | null {
        try {
            return localStorage.getItem(this.storageKey);
        } catch {
            return null;
        }
    }

    private setStoredValue(value: string): void {
        try {
            localStorage.setItem(this.storageKey, value);
        } catch {
            console.warn('Unable to persist audio preferences in localStorage');
        }
    }

    private isValidSnapshot(value: unknown): value is AudioPreferencesSnapshot {
        if (!value || typeof value !== 'object') return false;

        const candidate = value as Partial<AudioPreferencesSnapshot>;
        if (candidate.version !== AUDIO_PREFERENCES_VERSION) return false;
        if (typeof candidate.muted !== 'boolean') return false;
        if (typeof candidate.masterVolume !== 'number') return false;
        if (!Number.isFinite(candidate.masterVolume)) return false;

        return candidate.masterVolume >= 0 && candidate.masterVolume <= 1;
    }
}

export type { AudioPreferences };
export { AudioPreferencesStorage, AUDIO_PREFERENCES_STORAGE_KEY };
