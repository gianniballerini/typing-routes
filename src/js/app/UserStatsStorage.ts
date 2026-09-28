import type { RouteRecordSnapshot, UserStatsSnapshot } from '../UserStats';
import { UserStats } from '../UserStats';

// Bumped alongside the routes.json/cities.json id rewrite (see data/README.md):
// old snapshots hold city/route ids that no longer resolve to anything, so
// this key change is a deliberate fresh start rather than a migration.
const USER_STATS_STORAGE_KEY = 'typing-routes.user-stats.v2';
const USER_STATS_VERSION = 3;

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
            if (this.isValidSnapshot(parsed)) {
                return UserStats.fromSnapshot(parsed);
            }

            console.warn('Invalid user stats payload in localStorage; starting from empty stats');
            return new UserStats();
        } catch {
            console.warn('Malformed user stats payload in localStorage; starting from empty stats');
            return new UserStats();
        }
    }

    save(stats: UserStats): void {
        const snapshot = stats.toSnapshot();
        this.setStoredValue(JSON.stringify(snapshot));
    }

    clear(): void {
        try {
            localStorage.removeItem(this.storageKey);
        } catch {
            console.warn('Unable to clear user stats in localStorage');
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
            console.warn('Unable to persist user stats in localStorage');
        }
    }

    private isValidSnapshot(value: unknown): value is UserStatsSnapshot {
        if (!value || typeof value !== 'object') return false;

        const candidate = value as Partial<UserStatsSnapshot>;
        if (candidate.version !== USER_STATS_VERSION) return false;
        if (!Array.isArray(candidate.completedCityIds)) return false;
        if (!Array.isArray(candidate.completedRouteIds)) return false;
        if (!candidate.routeRecords || typeof candidate.routeRecords !== 'object') return false;

        const hasOnlyStringCityIds = candidate.completedCityIds.every((cityId) => typeof cityId === 'string');
        const hasOnlyStringRouteIds = candidate.completedRouteIds.every((routeId) => typeof routeId === 'string');
        if (!hasOnlyStringCityIds || !hasOnlyStringRouteIds) return false;

        return this.hasValidRouteRecords(candidate.routeRecords as Record<string, unknown>);
    }

    private hasValidRouteRecords(records: Record<string, unknown>): boolean {
        return Object.values(records).every((record) => this.isValidRouteRecord(record));
    }

    private isValidRouteRecord(value: unknown): value is RouteRecordSnapshot {
        if (!value || typeof value !== 'object') return false;

        const candidate = value as Partial<RouteRecordSnapshot>;
        if (!Number.isFinite(candidate.bestCombo)) return false;
        if ((candidate.bestCombo ?? 0) < 0) return false;

        const hasValidGrossWpm = candidate.bestGrossWpm === undefined
            || candidate.bestGrossWpm === null
            || (Number.isFinite(candidate.bestGrossWpm) && candidate.bestGrossWpm >= 0);

        const hasValidNetWpm = candidate.bestNetWpm === undefined
            || candidate.bestNetWpm === null
            || (Number.isFinite(candidate.bestNetWpm) && candidate.bestNetWpm >= 0);

        const hasValidAccuracy = candidate.bestAccuracy === undefined
            || candidate.bestAccuracy === null
            || (Number.isFinite(candidate.bestAccuracy) && candidate.bestAccuracy >= 0);

        const hasValidElapsed = candidate.bestElapsedMs === undefined
            || candidate.bestElapsedMs === null
            || (Number.isFinite(candidate.bestElapsedMs) && candidate.bestElapsedMs >= 0);

        const hasValidMistakes = candidate.fewestMistakes === undefined
            || candidate.fewestMistakes === null
            || (Number.isFinite(candidate.fewestMistakes) && candidate.fewestMistakes >= 0);

        if (!hasValidGrossWpm || !hasValidNetWpm || !hasValidAccuracy || !hasValidElapsed || !hasValidMistakes) {
            return false;
        }

        return true;
    }
}

export { USER_STATS_STORAGE_KEY, UserStatsStorage };
