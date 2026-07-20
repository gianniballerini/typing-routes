interface UserStatsSnapshot {
    version: number;
    completedCityIds: string[];
    completedRouteIds: string[];
}

class UserStats {
    private completedCityIds: Set<string>;
    private completedRouteIds: Set<string>;

    constructor(completedCityIds: Iterable<string> = [], completedRouteIds: Iterable<string> = []) {
        this.completedCityIds = new Set(completedCityIds);
        this.completedRouteIds = new Set(completedRouteIds);
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

    toSnapshot(): UserStatsSnapshot {
        return {
            version: 1,
            completedCityIds: [...this.completedCityIds],
            completedRouteIds: [...this.completedRouteIds]
        };
    }
}

export { UserStats };
export type { UserStatsSnapshot };