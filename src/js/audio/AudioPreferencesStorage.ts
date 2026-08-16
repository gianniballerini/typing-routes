import { Settings } from '../Settings';
import type { SoundCategory } from './types';

const AUDIO_PREFERENCES_STORAGE_KEY = 'typing-routes.audio.v1';
const AUDIO_PREFERENCES_VERSION = 2;

interface AudioPreferences {
    muted: boolean;
    masterVolume: number;
    categoryVolumes: Record<SoundCategory, number>;
}

interface AudioPreferencesV1Snapshot {
    version: 1;
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
            const preferences = this.parseSnapshot(parsed);
            if (preferences) {
                return preferences;
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
            categoryVolumes: { ...preferences.categoryVolumes },
        };

        this.setStoredValue(JSON.stringify(snapshot));
    }

    private defaults(): AudioPreferences {
        return {
            muted: false,
            masterVolume: Settings.audio.defaultMasterVolume,
            categoryVolumes: this.defaultCategoryVolumes(),
        };
    }

    private defaultCategoryVolumes(): Record<SoundCategory, number> {
        return {
            music: Settings.audio.categoryVolumes.music,
            sfx: Settings.audio.categoryVolumes.sfx,
            keys: Settings.audio.categoryVolumes.keys,
        };
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

    private parseSnapshot(value: unknown): AudioPreferences | null {
        if (this.isValidCurrentSnapshot(value)) {
            return {
                muted: value.muted,
                masterVolume: value.masterVolume,
                categoryVolumes: { ...value.categoryVolumes },
            };
        }

        if (this.isValidLegacySnapshot(value)) {
            return {
                muted: value.muted,
                masterVolume: value.masterVolume,
                categoryVolumes: this.defaultCategoryVolumes(),
            };
        }

        return null;
    }

    private isValidCurrentSnapshot(value: unknown): value is AudioPreferencesSnapshot {
        if (!value || typeof value !== 'object') return false;

        const candidate = value as Partial<AudioPreferencesSnapshot>;
        if (candidate.version !== AUDIO_PREFERENCES_VERSION) return false;
        if (typeof candidate.muted !== 'boolean') return false;
        if (typeof candidate.masterVolume !== 'number') return false;
        if (!Number.isFinite(candidate.masterVolume)) return false;
        if (!this.isValidCategoryVolumes(candidate.categoryVolumes)) return false;

        return candidate.masterVolume >= 0 && candidate.masterVolume <= 1;
    }

    private isValidLegacySnapshot(value: unknown): value is AudioPreferencesV1Snapshot {
        if (!value || typeof value !== 'object') return false;

        const candidate = value as Partial<AudioPreferencesV1Snapshot>;
        if (candidate.version !== 1) return false;
        if (typeof candidate.muted !== 'boolean') return false;
        if (typeof candidate.masterVolume !== 'number') return false;
        if (!Number.isFinite(candidate.masterVolume)) return false;

        return candidate.masterVolume >= 0 && candidate.masterVolume <= 1;
    }

    private isValidCategoryVolumes(value: unknown): value is Record<SoundCategory, number> {
        if (!value || typeof value !== 'object') return false;

        const candidate = value as Partial<Record<SoundCategory, number>>;
        const categories: SoundCategory[] = ['music', 'sfx', 'keys'];

        return categories.every((category) => {
            const volume = candidate[category];
            return typeof volume === 'number' && Number.isFinite(volume) && volume >= 0 && volume <= 1;
        });
    }
}

export { AUDIO_PREFERENCES_STORAGE_KEY, AudioPreferencesStorage };
export type { AudioPreferences };

