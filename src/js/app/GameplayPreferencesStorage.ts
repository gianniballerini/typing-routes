const GAMEPLAY_PREFERENCES_STORAGE_KEY = 'typing-routes.gameplay.v1';
const GAMEPLAY_PREFERENCES_VERSION = 1;

interface GameplayPreferences {
    // When on, `n` no longer stands in for `ñ` (nor `a` for `á`, and so on).
    strictAccents: boolean;
}

interface GameplayPreferencesSnapshot extends GameplayPreferences {
    version: number;
}

// Its own key for the same reason as the audio preferences: settings are not
// progress, and sharing the stats snapshot would couple their versions.
class GameplayPreferencesStorage {
    private storageKey: string;

    constructor(storageKey: string = GAMEPLAY_PREFERENCES_STORAGE_KEY) {
        this.storageKey = storageKey;
    }

    load(): GameplayPreferences {
        const rawSnapshot = this.getStoredValue();
        if (!rawSnapshot) return this.defaults();

        try {
            const parsed: unknown = JSON.parse(rawSnapshot);
            if (this.isValidSnapshot(parsed)) {
                return { strictAccents: parsed.strictAccents };
            }

            console.warn('Invalid gameplay preferences payload in localStorage; using defaults');
        } catch {
            console.warn('Malformed gameplay preferences payload in localStorage; using defaults');
        }

        return this.defaults();
    }

    save(preferences: GameplayPreferences): void {
        const snapshot: GameplayPreferencesSnapshot = {
            version: GAMEPLAY_PREFERENCES_VERSION,
            strictAccents: preferences.strictAccents,
        };

        try {
            localStorage.setItem(this.storageKey, JSON.stringify(snapshot));
        } catch {
            console.warn('Unable to persist gameplay preferences in localStorage');
        }
    }

    private defaults(): GameplayPreferences {
        return { strictAccents: false };
    }

    private getStoredValue(): string | null {
        try {
            return localStorage.getItem(this.storageKey);
        } catch {
            return null;
        }
    }

    private isValidSnapshot(value: unknown): value is GameplayPreferencesSnapshot {
        if (!value || typeof value !== 'object') return false;

        const candidate = value as Partial<GameplayPreferencesSnapshot>;
        return candidate.version === GAMEPLAY_PREFERENCES_VERSION
            && typeof candidate.strictAccents === 'boolean';
    }
}

export { GAMEPLAY_PREFERENCES_STORAGE_KEY, GameplayPreferencesStorage };
export type { GameplayPreferences };
