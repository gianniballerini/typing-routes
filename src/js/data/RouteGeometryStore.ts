import type { Geometry } from 'geojson';
import renderIndex from '../../assets/data/national_routes_render.json';
import renderBinaryUrl from '../../assets/data/national_routes_render.bin?url';

/**
 * Loads the route geometry that `data/simplify_geometries.py` produces.
 *
 * The raw DNV export is 247k coordinates of survey-grade detail (19.7 MB of JSON
 * inlined straight into the bundle). The game never draws finer than a pixel at
 * `Settings.maxZoom`, so the build step simplifies to ~17.6k coordinates, projects
 * them to Web Mercator and quantizes each route to Int16 against its own bounding
 * box — 70 KB of binary fetched alongside the app instead of megabytes parsed
 * before the first frame.
 *
 * Coordinates are stored projected because that is what the renderer ultimately
 * wants; `toGeoJsonGeometries` unprojects them back to lon/lat for the consumers
 * that still speak GeoJSON.
 */

type RenderIndexEntry = {
    id: string;
    // Index of this route's first coordinate pair in the Int16 blob.
    offset: number;
    // Point count per subpath, in order. A route can be a MultiLineString.
    parts: number[];
    // [minX, minY, maxX, maxY] in Web Mercator world units, the quantization range.
    bbox: number[];
};

type RenderIndex = {
    quantMax: number;
    tileSize: number;
    maxZoom: number;
    tolerancePx: number;
    routes: RenderIndexEntry[];
};

/** A route's geometry in Web Mercator world units ([0,1], y growing south). */
export type ProjectedRoute = {
    id: string;
    // One Float64Array of interleaved x,y per subpath.
    parts: Float64Array[];
};

const INDEX = renderIndex as RenderIndex;

export const getRouteGeometryUrl = (): string => renderBinaryUrl;

/** Fetches the geometry blob. Start this as early as possible — it is on the critical path. */
export const loadRouteGeometryBuffer = (): Promise<ArrayBuffer> =>
    fetch(renderBinaryUrl).then((response) => {
        if (!response.ok) {
            throw new Error(`Route geometry fetch failed: ${response.status} ${response.statusText}`);
        }
        return response.arrayBuffer();
    });

/**
 * Dequantizes the blob into Web Mercator world units.
 *
 * Each route is quantized against its own bbox rather than a shared one, so a
 * short route keeps the full Int16 range over its own extent instead of losing
 * precision to the longest route in the country.
 */
export const decodeProjectedRoutes = (buffer: ArrayBuffer): ProjectedRoute[] => {
    const quantized = new Int16Array(buffer);
    const { quantMax } = INDEX;

    return INDEX.routes.map((entry) => {
        const [minX, minY, maxX, maxY] = entry.bbox;
        const scaleX = (maxX - minX) / quantMax;
        const scaleY = (maxY - minY) / quantMax;

        const parts: Float64Array[] = [];
        let cursor = entry.offset;

        for (const pointCount of entry.parts) {
            const part = new Float64Array(pointCount * 2);
            for (let i = 0; i < pointCount; i += 1) {
                part[i * 2] = minX + quantized[cursor * 2] * scaleX;
                part[i * 2 + 1] = minY + quantized[cursor * 2 + 1] * scaleY;
                cursor += 1;
            }
            parts.push(part);
        }

        return { id: entry.id, parts };
    });
};

// Inverse Web Mercator. `y` is normalized to [0,1] growing south, which is the
// form the build step writes.
const unprojectLon = (x: number): number => x * 360 - 180;
const unprojectLat = (y: number): number =>
    Math.atan(Math.sinh(Math.PI * (1 - 2 * y))) * 180 / Math.PI;

/**
 * Unprojects back to lon/lat GeoJSON, keyed by route id.
 *
 * Kept separate from the projected form on purpose: anything drawing to a canvas
 * wants `decodeProjectedRoutes`, and only the GeoJSON consumers pay for this.
 */
export const toGeoJsonGeometries = (routes: ProjectedRoute[]): { [routeId: string]: Geometry } => {
    const geometries: { [routeId: string]: Geometry } = {};

    for (const route of routes) {
        const lines: number[][][] = route.parts.map((part) => {
            const line: number[][] = new Array(part.length / 2);
            for (let i = 0; i < part.length; i += 2) {
                line[i / 2] = [unprojectLon(part[i]), unprojectLat(part[i + 1])];
            }
            return line;
        });

        geometries[route.id] = lines.length === 1
            ? { type: 'LineString', coordinates: lines[0] }
            : { type: 'MultiLineString', coordinates: lines };
    }

    return geometries;
};

export const decodeRouteGeometries = (buffer: ArrayBuffer): { [routeId: string]: Geometry } =>
    toGeoJsonGeometries(decodeProjectedRoutes(buffer));
