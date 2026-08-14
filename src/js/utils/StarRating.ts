import { Settings } from '../Settings';
import type { RouteRecordSnapshot } from '../UserStats';

// Each axis is worth one star and can be earned in halves, so a route lands on
// 0, 0.5, ... 3 stars.
type StarAxisScore = 0 | 0.5 | 1;
type StarSlot = 'full' | 'half' | 'empty';

interface StarRatingResult {
    stars: number;
    accuracy: StarAxisScore;
    mistakes: StarAxisScore;
    speed: StarAxisScore;
}

/**
 * Rates a route from its stored best record. Returns null when the route has
 * never been completed: there is nothing to rate yet, which reads differently
 * from "completed and earned zero stars".
 *
 * Records migrated from v2 have null accuracy/WPM (see UserStatsStorage), so a
 * missing metric scores zero rather than being treated as perfect.
 */
function calculateStarRating(record: RouteRecordSnapshot | null, completed: boolean): StarRatingResult | null {
    if (!completed) return null;

    const accuracy = scoreHigherIsBetter(record?.bestAccuracy, Settings.starRating.accuracy);
    const mistakes = scoreLowerIsBetter(record?.fewestMistakes, Settings.starRating.mistakes);
    const speed = scoreHigherIsBetter(record?.bestNetWpm, Settings.starRating.netWpm);

    return {
        stars: accuracy + mistakes + speed,
        accuracy,
        mistakes,
        speed
    };
}

/**
 * Expands a star count into one slot per star, so renderers never have to think
 * about halves themselves.
 */
function toStarSlots(stars: number | null, maxStars: number = Settings.starRating.maxStars): StarSlot[] {
    const safeStars = Number.isFinite(stars) ? Math.max(0, Math.min(maxStars, stars as number)) : 0;

    return Array.from({ length: maxStars }, (_unused, index) => {
        const remaining = safeStars - index;
        if (remaining >= 1) return 'full';
        if (remaining >= 0.5) return 'half';
        return 'empty';
    });
}

function scoreHigherIsBetter(value: number | null | undefined, thresholds: { full: number; half: number }): StarAxisScore {
    if (value == null || !Number.isFinite(value)) return 0;
    if (value >= thresholds.full) return 1;
    if (value >= thresholds.half) return 0.5;
    return 0;
}

function scoreLowerIsBetter(value: number | null | undefined, thresholds: { full: number; half: number }): StarAxisScore {
    if (value == null || !Number.isFinite(value)) return 0;
    if (value <= thresholds.full) return 1;
    if (value <= thresholds.half) return 0.5;
    return 0;
}

export { calculateStarRating, toStarSlots };
export type { StarAxisScore, StarRatingResult, StarSlot };
