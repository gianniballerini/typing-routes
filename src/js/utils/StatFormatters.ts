// Shared run-stat formatting so every surface prints the same numbers the same way.
const EMPTY_VALUE = '--';
const EMPTY_TIME = '--:--';

function formatElapsedTime(elapsedMs: number | null | undefined): string {
    if (elapsedMs == null || !Number.isFinite(elapsedMs)) return EMPTY_TIME;

    const totalSeconds = Math.floor(Math.max(0, elapsedMs) / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function formatOneDecimal(value: number | null | undefined): string {
    if (value == null || !Number.isFinite(value)) return EMPTY_VALUE;
    return Math.max(0, value).toFixed(1);
}

function formatAccuracy(value: number | null | undefined): string {
    const formatted = formatOneDecimal(value);
    return formatted === EMPTY_VALUE ? EMPTY_VALUE : `${formatted}%`;
}

function formatInteger(value: number | null | undefined): string {
    if (value == null || !Number.isFinite(value)) return EMPTY_VALUE;
    return `${Math.max(0, Math.round(value))}`;
}

const RATING_LABELS: Record<1 | 2 | 3, readonly string[]> = {
    3: [
        '¡Perfecto!',
        '¡Teclado en llamas!',
        '¡Ni el GPS es tan preciso!',
        '¡Llegaste antes que el micro!',
        '¡Sos un Fangio del teclado!',
        '¡Cero baches!'
    ],
    2: [
        '¡Muy bien!',
        '¡Buen viaje!',
        'Casi sin pozos',
        '¡Vas en quinta!',
        'Un par de lomas de burro nomás',
        '¡Te faltó poquito!'
    ],
    1: [
        'Mejorable',
        'Llegaste... que es lo importante',
        'Viaje con escalas',
        'Hubo desvíos',
        'Ripio en el camino',
        'El mate se enfrió en el viaje'
    ]
};

// The stars come from the stored best record, so a slower repeat run keeps the
// rating it already earned instead of appearing to lose stars. Shared because
// the route-complete panel and the share card have to agree on the wording:
// the variant is picked from `seed` (e.g. the run's elapsed time) rather than
// `Math.random()`, so both surfaces land on the same label for the same run.
function buildRatingLabel(stars: number, seed: number): string {
    const tier = stars >= 3 ? 3 : stars >= 2 ? 2 : stars >= 1 ? 1 : null;
    if (tier === null) return '';

    const labels = RATING_LABELS[tier];
    const index = Number.isFinite(seed) ? Math.floor(Math.abs(seed)) % labels.length : 0;
    return labels[index];
}

export { buildRatingLabel, EMPTY_TIME, EMPTY_VALUE, formatAccuracy, formatElapsedTime, formatInteger, formatOneDecimal };
