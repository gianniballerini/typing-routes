import type { UserStatsSnapshot } from '../UserStats';
import { UserStats } from '../UserStats';

const USER_STATS_STORAGE_KEY = 'typing-routes.user-stats.v1';
const USER_STATS_VERSION = 1;

class UserStatsStorage {
    private storageKey: string;

    constructor(storageKey: string = USER_STATS_STORAGE_KEY) {
        this.storageKey = storageKey;
    }

    load(): UserStats {
        const rawSnapshot = this.getStoredValue();
        if (!rawSnapshot) return new UserStats();

        try {
            const parsed: unknown = JSON.parse(rawSnapshot);
            if (!this.isValidSnapshot(parsed)) {
                console.warn('Invalid user stats payload in localStorage; starting from empty stats');
                return new UserStats();
            }

            return UserStats.fromSnapshot(parsed);
        } catch {
            console.warn('Malformed user stats payload in localStorage; starting from empty stats');
            return new UserStats();
        }
    }

    save(stats: UserStats): void {
        const snapshot = stats.toSnapshot();
        this.setStoredValue(JSON.stringify(snapshot));
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
            console.warn('Unable to persist user stats in localStorage');
        }
    }

    private isValidSnapshot(value: unknown): value is UserStatsSnapshot {
        if (!value || typeof value !== 'object') return false;

        const candidate = value as Partial<UserStatsSnapshot>;
        if (candidate.version !== USER_STATS_VERSION) return false;
        if (!Array.isArray(candidate.completedCityIds)) return false;
        if (!Array.isArray(candidate.completedRouteIds)) return false;

        const hasOnlyStringCityIds = candidate.completedCityIds.every((cityId) => typeof cityId === 'string');
        const hasOnlyStringRouteIds = candidate.completedRouteIds.every((routeId) => typeof routeId === 'string');
        return hasOnlyStringCityIds && hasOnlyStringRouteIds;
    }
}

export { USER_STATS_STORAGE_KEY, UserStatsStorage };
