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

export { EMPTY_TIME, EMPTY_VALUE, formatAccuracy, formatElapsedTime, formatInteger, formatOneDecimal };
