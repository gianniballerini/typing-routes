import type { RouteRecordSnapshot, UserStatsSnapshot } from '../UserStats';
import { UserStats } from '../UserStats';

const USER_STATS_STORAGE_KEY = 'typing-routes.user-stats.v1';
const USER_STATS_VERSION = 3;

interface LegacyUserStatsSnapshot {
    version: 1;
    completedCityIds: string[];
    completedRouteIds: string[];
}

interface V2RouteRecordSnapshot {
    bestCombo: number;
    bestWpm: number;
    bestElapsedMs: number | null;
    fewestMistakes: number | null;
}

interface V2UserStatsSnapshot {
    version: 2;
    completedCityIds: string[];
    completedRouteIds: string[];
    routeRecords: Record<string, V2RouteRecordSnapshot>;
}

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

            if (this.isV2Snapshot(parsed)) {
                return UserStats.fromSnapshot(this.migrateV2ToV3(parsed));
            }

            if (this.isLegacySnapshot(parsed)) {
                return new UserStats(parsed.completedCityIds, parsed.completedRouteIds);
            }

            if (!this.isValidSnapshot(parsed) && !this.isLegacySnapshot(parsed)) {
                console.warn('Invalid user stats payload in localStorage; starting from empty stats');
                return new UserStats();
            }
        } catch {
            console.warn('Malformed user stats payload in localStorage; starting from empty stats');
            return new UserStats();
        }

        return new UserStats();
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
        if (!candidate.routeRecords || typeof candidate.routeRecords !== 'object') return false;

        const hasOnlyStringCityIds = candidate.completedCityIds.every((cityId) => typeof cityId === 'string');
        const hasOnlyStringRouteIds = candidate.completedRouteIds.every((routeId) => typeof routeId === 'string');
        if (!hasOnlyStringCityIds || !hasOnlyStringRouteIds) return false;

        return this.hasValidRouteRecords(candidate.routeRecords as Record<string, unknown>);
    }

    private isLegacySnapshot(value: unknown): value is LegacyUserStatsSnapshot {
        if (!value || typeof value !== 'object') return false;

        const candidate = value as Partial<LegacyUserStatsSnapshot>;
        if (candidate.version !== 1) return false;
        if (!Array.isArray(candidate.completedCityIds)) return false;
        if (!Array.isArray(candidate.completedRouteIds)) return false;

        const hasOnlyStringCityIds = candidate.completedCityIds.every((cityId) => typeof cityId === 'string');
        const hasOnlyStringRouteIds = candidate.completedRouteIds.every((routeId) => typeof routeId === 'string');
        return hasOnlyStringCityIds && hasOnlyStringRouteIds;
    }

    private hasValidRouteRecords(records: Record<string, unknown>): boolean {
        return Object.values(records).every((record) => this.isValidRouteRecord(record));
    }

    private hasValidV2RouteRecords(records: Record<string, unknown>): boolean {
        return Object.values(records).every((record) => this.isValidV2RouteRecord(record));
    }

    private isV2Snapshot(value: unknown): value is V2UserStatsSnapshot {
        if (!value || typeof value !== 'object') return false;

        const candidate = value as Partial<V2UserStatsSnapshot>;
        if (candidate.version !== 2) return false;
        if (!Array.isArray(candidate.completedCityIds)) return false;
        if (!Array.isArray(candidate.completedRouteIds)) return false;
        if (!candidate.routeRecords || typeof candidate.routeRecords !== 'object') return false;

        const hasOnlyStringCityIds = candidate.completedCityIds.every((cityId) => typeof cityId === 'string');
        const hasOnlyStringRouteIds = candidate.completedRouteIds.every((routeId) => typeof routeId === 'string');
        if (!hasOnlyStringCityIds || !hasOnlyStringRouteIds) return false;

        return this.hasValidV2RouteRecords(candidate.routeRecords as Record<string, unknown>);
    }

    private isValidV2RouteRecord(value: unknown): value is V2RouteRecordSnapshot {
        if (!value || typeof value !== 'object') return false;

        const candidate = value as Partial<V2RouteRecordSnapshot>;
        if (!Number.isFinite(candidate.bestCombo)) return false;
        if (!Number.isFinite(candidate.bestWpm)) return false;
        if ((candidate.bestCombo ?? 0) < 0) return false;
        if ((candidate.bestWpm ?? 0) < 0) return false;

        const hasValidElapsed = candidate.bestElapsedMs === undefined
            || candidate.bestElapsedMs === null
            || (Number.isFinite(candidate.bestElapsedMs) && candidate.bestElapsedMs >= 0);

        const hasValidMistakes = candidate.fewestMistakes === undefined
            || candidate.fewestMistakes === null
            || (Number.isFinite(candidate.fewestMistakes) && candidate.fewestMistakes >= 0);

        if (!hasValidElapsed || !hasValidMistakes) return false;

        return true;
    }

    private migrateV2ToV3(v2Snapshot: V2UserStatsSnapshot): UserStatsSnapshot {
        const migratedRecords: Record<string, RouteRecordSnapshot> = {};

        for (const [routeId, record] of Object.entries(v2Snapshot.routeRecords)) {
            migratedRecords[routeId] = {
                bestCombo: record.bestCombo,
                bestGrossWpm: null,
                bestNetWpm: null,
                bestAccuracy: null,
                bestElapsedMs: record.bestElapsedMs,
                fewestMistakes: record.fewestMistakes
            };
        }

        return {
            version: USER_STATS_VERSION,
            completedCityIds: v2Snapshot.completedCityIds,
            completedRouteIds: v2Snapshot.completedRouteIds,
            routeRecords: migratedRecords
        };
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
