interface UserStatsSnapshot {
    version: number;
    completedCityIds: string[];
    completedRouteIds: string[];
    routeRecords: Record<string, RouteRecordSnapshot>;
}

interface RouteRecordSnapshot {
    bestCombo: number;
    bestWpm: number;
}

class UserStats {
    private completedCityIds: Set<string>;
    private completedRouteIds: Set<string>;
    private routeRecords: Map<string, RouteRecordSnapshot>;

    constructor(
        completedCityIds: Iterable<string> = [],
        completedRouteIds: Iterable<string> = [],
        routeRecords: Record<string, RouteRecordSnapshot> = {}
    ) {
        this.completedCityIds = new Set(completedCityIds);
        this.completedRouteIds = new Set(completedRouteIds);
        this.routeRecords = new Map(
            Object.entries(routeRecords).map(([routeId, record]) => [routeId, {
                bestCombo: this.sanitizeMetric(record.bestCombo),
                bestWpm: this.sanitizeMetric(record.bestWpm)
            }])
        );
    }

    static fromSnapshot(snapshot: UserStatsSnapshot): UserStats {
        return new UserStats(snapshot.completedCityIds, snapshot.completedRouteIds);
    }

    markCityCompleted(cityId: string): boolean {
        if (this.completedCityIds.has(cityId)) return false;
        this.completedCityIds.add(cityId);
        return true;
    }

    markRouteCompleted(routeId: string): boolean {
        if (this.completedRouteIds.has(routeId)) return false;
        this.completedRouteIds.add(routeId);
        return true;
    }

    hasCompletedCity(cityId: string): boolean {
        return this.completedCityIds.has(cityId);
    }

    hasCompletedRoute(routeId: string): boolean {
        return this.completedRouteIds.has(routeId);
    }

    getCompletedCityCount(): number {
        return this.completedCityIds.size;
    }

    getCompletedRouteCount(): number {
        return this.completedRouteIds.size;
    }

    getRouteRecord(routeId: string): RouteRecordSnapshot | null {
        const record = this.routeRecords.get(routeId);
        if (!record) return null;

        return {
            bestCombo: record.bestCombo,
            bestWpm: record.bestWpm
        };
    }

    updateRouteRecord(routeId: string, bestComboForRun: number, bestWpmForRun: number): boolean {
        const normalizedCombo = this.sanitizeMetric(bestComboForRun);
        const normalizedWpm = this.sanitizeMetric(bestWpmForRun);
        const currentRecord = this.routeRecords.get(routeId);

        const nextRecord: RouteRecordSnapshot = {
            bestCombo: Math.max(currentRecord?.bestCombo ?? 0, normalizedCombo),
            bestWpm: Math.max(currentRecord?.bestWpm ?? 0, normalizedWpm)
        };

        if (
            currentRecord
            && currentRecord.bestCombo === nextRecord.bestCombo
            && currentRecord.bestWpm === nextRecord.bestWpm
        ) {
            return false;
        }

        this.routeRecords.set(routeId, nextRecord);
        return true;
    }

    toSnapshot(): UserStatsSnapshot {
        return {
            version: 2,
            completedCityIds: [...this.completedCityIds],
            completedRouteIds: [...this.completedRouteIds],
            routeRecords: Object.fromEntries(this.routeRecords)
        };
    }

    private sanitizeMetric(value: number): number {
        if (!Number.isFinite(value)) return 0;
        return Math.max(0, value);
    }
}

export { UserStats };
export type { RouteRecordSnapshot, UserStatsSnapshot };

