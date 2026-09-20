/**
 * Web Mercator, in the same scale MapLibre used: the world is a unit square and
 * `worldSize = TILE_SIZE * 2**zoom`.
 *
 * Keeping TILE_SIZE at 512 is what lets every tuned value in `Settings` — zoom
 * ramps, `flyToZoom`, `minZoom`/`maxZoom` — keep the meaning it had under
 * MapLibre. Change it and every one of those numbers silently shifts by an octave.
 */

export const TILE_SIZE = 512;

/** Web Mercator is undefined at the poles; this is the standard cutoff. */
export const MAX_LATITUDE = 85.05112878;

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

export type Coordinate = [number, number];

/** World units: x and y both in [0, 1], y growing *south*. */
export type WorldPoint = { x: number; y: number };

export const clamp = (value: number, min: number, max: number): number =>
    Math.max(min, Math.min(max, value));

export const projectLon = (lon: number): number => (lon + 180) / 360;

export const projectLat = (lat: number): number => {
    const clamped = clamp(lat, -MAX_LATITUDE, MAX_LATITUDE);
    const sin = Math.sin(clamped * DEG_TO_RAD);
    return 0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI);
};

export const unprojectX = (x: number): number => x * 360 - 180;

export const unprojectY = (y: number): number =>
    Math.atan(Math.sinh(Math.PI * (1 - 2 * y))) * RAD_TO_DEG;

export const project = (lon: number, lat: number): WorldPoint => ({
    x: projectLon(lon),
    y: projectLat(lat)
});

export const unproject = (x: number, y: number): Coordinate => [unprojectX(x), unprojectY(y)];

/** Pixels across the whole world at a given zoom. */
export const worldSizeAtZoom = (zoom: number): number => TILE_SIZE * Math.pow(2, zoom);

/**
 * Linear ramp between two zoom stops, the plain-number equivalent of MapLibre's
 * `['interpolate', ['linear'], ['zoom'], ...]`. Every `*ByZoom` block in
 * `Settings` is one of these.
 */
export const interpolateByZoom = (
    zoom: number,
    minZoom: number,
    minValue: number,
    maxZoom: number,
    maxValue: number
): number => {
    const span = maxZoom - minZoom;
    if (span <= 0) return maxValue;
    const t = clamp((zoom - minZoom) / span, 0, 1);
    return minValue + (maxValue - minValue) * t;
};
