/**
 * Draw-ready forms of the GeoJSON `MapController` is handed.
 *
 * Coordinates are pre-projected to Web Mercator world units once, at ingest, so
 * the per-frame cost is a multiply and an add per vertex rather than a `log`/`tan`.
 */

export type RouteProperties = {
    routeDisplay: string;
    name: string;
    citiesCount: number;
    visited: boolean;
    stars: number;
};

export type RouteFeature = {
    id: string;
    /** One Float64Array of interleaved x,y per subpath (routes can be MultiLineStrings). */
    parts: Float64Array[];
    /** World-unit extent, used to skip routes entirely off-screen. */
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    properties: RouteProperties;
    hovered: boolean;
    selected: boolean;
};

export type CityProperties = {
    name: string;
    visited: boolean;
    tier: string;
};

export type CityFeature = {
    id: string;
    x: number;
    y: number;
    properties: CityProperties;
    /** True while this city belongs to the selected route. */
    selected: boolean;
};

export type PickResult =
    | { kind: 'route'; id: string }
    | { kind: 'city'; id: string };
