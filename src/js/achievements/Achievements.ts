import type { AchievementDefinition } from './AchievementDefinitions';
import {
    ACHIEVEMENT_DEFINITIONS,
    ALL_TROPHIES_ID,
    ROUTE_COMPLETION_TIERS,
    THREE_STAR_TIERS
} from './AchievementDefinitions';

/**
 * Everything the derived rules need, gathered by the caller. Passing a snapshot
 * rather than `UserStats` + `RoutesController` keeps this class free of the
 * "which routes are playable" question, which belongs to the game flow.
 */
interface AchievementProgressContext {
    totalPlayableRoutes: number;
    completedRouteIds: Set<string>;
    threeStarRouteIds: Set<string>;
    longestRouteId: string | null;
    shortestRouteId: string | null;
}

interface AchievementsSnapshot {
    version: number;
    unlockedIds: string[];
}

// Arrow presses that have to land on the menu before Enter counts as "did the
// whole thing without a mouse". One is an accident; two is a habit.
const KEYBOARD_MENU_STEPS_REQUIRED = 2;

/**
 * The trophy model. Extends `EventTarget` so unlocking stays fire-and-forget:
 * the toast, the sound and the save all hang off `achievement-unlocked` rather
 * than being called from inside the rules.
 *
 * Knows nothing about the DOM, the map or `localStorage` — `AchievementsStorage`
 * owns persistence, `GameFlowCoordinator` owns the wiring.
 */
class Achievements extends EventTarget {
    private unlockedIds: Set<string>;
    private definitionsById: Map<string, AchievementDefinition>;
    private menuKeyboardSteps: number;

    constructor(unlockedIds: Iterable<string> = []) {
        super();

        this.definitionsById = new Map(ACHIEVEMENT_DEFINITIONS.map((definition) => [definition.id, definition]));
        // Ids from an older build that no longer exist are dropped on load rather
        // than kept around to inflate the "x / y" counter.
        this.unlockedIds = new Set([...unlockedIds].filter((id) => this.definitionsById.has(id)));
        this.menuKeyboardSteps = 0;
    }

    static fromSnapshot(snapshot: AchievementsSnapshot): Achievements {
        return new Achievements(snapshot.unlockedIds);
    }

    getDefinitions(): AchievementDefinition[] {
        return ACHIEVEMENT_DEFINITIONS;
    }

    isUnlocked(id: string): boolean {
        return this.unlockedIds.has(id);
    }

    getUnlockedCount(): number {
        return this.unlockedIds.size;
    }

    getTotalCount(): number {
        return ACHIEVEMENT_DEFINITIONS.length;
    }

    /**
     * Recomputes every trophy that can be derived from progress and returns the
     * ids unlocked by this pass. Idempotent: already-unlocked trophies are left
     * alone and never re-announced, so this is safe to run on every boot.
     */
    evaluate(context: AchievementProgressContext): string[] {
        const unlockedNow: string[] = [];
        const completed = this.countIn(context.completedRouteIds, context.totalPlayableRoutes);
        const threeStar = this.countIn(context.threeStarRouteIds, context.totalPlayableRoutes);

        const award = (id: string, earned: boolean): void => {
            if (earned && this.unlock(id)) unlockedNow.push(id);
        };

        award('first-route', completed >= 1);
        award('first-three-stars', threeStar >= 1);

        award('longest-route', this.hasRoute(context.completedRouteIds, context.longestRouteId));
        award('longest-route-perfect', this.hasRoute(context.threeStarRouteIds, context.longestRouteId));
        award('shortest-route', this.hasRoute(context.completedRouteIds, context.shortestRouteId));

        for (const [id, fraction] of Object.entries(ROUTE_COMPLETION_TIERS)) {
            award(id, this.meetsTier(completed, context.totalPlayableRoutes, fraction));
        }

        for (const [id, fraction] of Object.entries(THREE_STAR_TIERS)) {
            award(id, this.meetsTier(threeStar, context.totalPlayableRoutes, fraction));
        }

        // Second pass, so the meta trophy sees whatever the first pass just gave out.
        unlockedNow.push(...this.awardMetaTrophy());

        return unlockedNow;
    }

    // "¿Qué es un mouse?" cannot be derived from stats, so the input layer reports
    // the three moves that make it up: walking, activating, and giving up and clicking.

    reportMenuKeyboardStep(): void {
        this.menuKeyboardSteps += 1;
    }

    reportPointerActivation(): void {
        this.menuKeyboardSteps = 0;
    }

    /**
     * Enter or Space on a menu option. Returns the ids unlocked, so the caller
     * persists on the same path it uses for `evaluate`.
     */
    reportMenuKeyboardActivation(): string[] {
        if (this.menuKeyboardSteps < KEYBOARD_MENU_STEPS_REQUIRED) return [];
        if (!this.unlock('what-is-a-mouse')) return [];

        // This one is not derived from progress, so nothing else will re-run the
        // rules afterwards — if it was the last trophy left, the meta one has to
        // be settled here or it would not land until the next completed run.
        return ['what-is-a-mouse', ...this.awardMetaTrophy()];
    }

    /**
     * Sharing the card from the route-complete modal. Like the keyboard trophy
     * this is an action rather than a stat, so nothing will re-run the derived
     * rules afterwards and the meta trophy has to be settled here.
     */
    reportScoreShared(): string[] {
        if (!this.unlock('shared-score')) return [];

        return ['shared-score', ...this.awardMetaTrophy()];
    }

    toSnapshot(): AchievementsSnapshot {
        return {
            version: 1,
            // Written in catalog order rather than unlock order, so the stored
            // payload does not churn purely on ordering.
            unlockedIds: ACHIEVEMENT_DEFINITIONS
                .filter((definition) => this.unlockedIds.has(definition.id))
                .map((definition) => definition.id)
        };
    }

    /** Returns true only when this call is what unlocked it. */
    private unlock(id: string): boolean {
        const definition = this.definitionsById.get(id);
        if (!definition || this.unlockedIds.has(id)) return false;

        this.unlockedIds.add(id);
        this.dispatchEvent(new CustomEvent('achievement-unlocked', { detail: { definition } }));

        return true;
    }

    // Always run after everything else has had its turn, from every path that can
    // unlock the last remaining trophy.
    private awardMetaTrophy(): string[] {
        const hasEveryOther = ACHIEVEMENT_DEFINITIONS
            .filter((definition) => definition.id !== ALL_TROPHIES_ID)
            .every((definition) => this.unlockedIds.has(definition.id));

        return hasEveryOther && this.unlock(ALL_TROPHIES_ID) ? [ALL_TROPHIES_ID] : [];
    }

    private hasRoute(routeIds: Set<string>, routeId: string | null): boolean {
        return routeId !== null && routeIds.has(routeId);
    }

    // A tier is a share of the routes that exist, rounded up so 10% of anything
    // is at least one route and 100% is genuinely all of them.
    private meetsTier(count: number, total: number, fraction: number): boolean {
        if (total <= 0) return false;
        return count >= Math.ceil(total * fraction);
    }

    // Guards against a stale save claiming more completions than there are routes.
    private countIn(routeIds: Set<string>, total: number): number {
        return Math.min(routeIds.size, total);
    }
}

export { Achievements, KEYBOARD_MENU_STEPS_REQUIRED };
export type { AchievementProgressContext, AchievementsSnapshot };
