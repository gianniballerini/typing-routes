import type { AchievementsSnapshot } from './Achievements';
import { Achievements } from './Achievements';

const ACHIEVEMENTS_STORAGE_KEY = 'typing-routes.achievements.v1';
const ACHIEVEMENTS_VERSION = 1;

// Deliberately its own key rather than a field on the user-stats snapshot:
// trophies and records have different lifetimes, and folding them in would force
// a stats version bump plus a migration for an unrelated concern. It also keeps
// "reset records" and "reset trophies" independent of each other.
class AchievementsStorage {
    private storageKey: string;

    constructor(storageKey: string = ACHIEVEMENTS_STORAGE_KEY) {
        this.storageKey = storageKey;
    }

    load(): Achievements {
        const rawSnapshot = this.getStoredValue();
        if (!rawSnapshot) return new Achievements();

        try {
            const parsed: unknown = JSON.parse(rawSnapshot);
            if (this.isValidSnapshot(parsed)) {
                return Achievements.fromSnapshot(parsed);
            }

            console.warn('Invalid achievements payload in localStorage; starting with no trophies');
        } catch {
            console.warn('Malformed achievements payload in localStorage; starting with no trophies');
        }

        return new Achievements();
    }

    save(achievements: Achievements): void {
        this.setStoredValue(JSON.stringify(achievements.toSnapshot()));
    }

    clear(): void {
        try {
            localStorage.removeItem(this.storageKey);
        } catch {
            console.warn('Unable to clear achievements in localStorage');
        }
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
            console.warn('Unable to persist achievements in localStorage');
        }
    }

    private isValidSnapshot(value: unknown): value is AchievementsSnapshot {
        if (!value || typeof value !== 'object') return false;

        const candidate = value as Partial<AchievementsSnapshot>;
        if (candidate.version !== ACHIEVEMENTS_VERSION) return false;
        if (!Array.isArray(candidate.unlockedIds)) return false;

        // Ids that no longer exist in the catalog are dropped by `Achievements`
        // itself, so only the shape is checked here.
        return candidate.unlockedIds.every((id) => typeof id === 'string');
    }
}

export { ACHIEVEMENTS_STORAGE_KEY, AchievementsStorage };
