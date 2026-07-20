import type { Geometry, Position } from 'geojson';

export type Coordinate = [number, number];

type RouteSegment = {
    start: Coordinate;
    end: Coordinate;
    startDistance: number;
    length: number;
};

export type RouteMetrics = {
    segments: RouteSegment[];
    totalLength: number;
    fallbackPoint: Coordinate;
};

export type SnappedRoutePoint = {
    coordinate: Coordinate;
    distanceAlongRoute: number;
};

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

const toCoordinate = (position: Position | undefined): Coordinate | null => {
    if (!position || position.length < 2) return null;

    const lon = Number(position[0]);
    const lat = Number(position[1]);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;

    return [lon, lat];
};

const appendSegments = (line: Position[], segments: RouteSegment[], startDistance: number): number => {
    let distanceCursor = startDistance;

    for (let i = 1; i < line.length; i += 1) {
        const start = toCoordinate(line[i - 1]);
        const end = toCoordinate(line[i]);
        if (!start || !end) continue;

        const dx = end[0] - start[0];
        const dy = end[1] - start[1];
        const length = Math.hypot(dx, dy);
        if (length <= 0) continue;

        segments.push({ start, end, startDistance: distanceCursor, length });
        distanceCursor += length;
    }

    return distanceCursor;
};

export const buildRouteMetrics = (geometry: Geometry | undefined): RouteMetrics | null => {
    if (!geometry) return null;

    const segments: RouteSegment[] = [];
    let totalLength = 0;
    let fallbackPoint: Coordinate | null = null;

    if (geometry.type === 'LineString') {
        const line = geometry.coordinates;
        fallbackPoint = toCoordinate(line[0]);
        totalLength = appendSegments(line, segments, totalLength);
    }

    if (geometry.type === 'MultiLineString') {
        for (const line of geometry.coordinates) {
            if (!fallbackPoint) fallbackPoint = toCoordinate(line[0]);
            totalLength = appendSegments(line, segments, totalLength);
        }
    }

    if (!fallbackPoint) return null;

    return {
        segments,
        totalLength,
        fallbackPoint
    };
};

export const projectPointOnRoute = (
    point: Coordinate,
    routeMetrics: RouteMetrics
): SnappedRoutePoint => {
    if (routeMetrics.segments.length === 0) {
        return {
            coordinate: routeMetrics.fallbackPoint,
            distanceAlongRoute: 0
        };
    }

    let bestDistanceSq = Number.POSITIVE_INFINITY;
    let bestProjection: SnappedRoutePoint = {
        coordinate: routeMetrics.fallbackPoint,
        distanceAlongRoute: 0
    };

    for (const segment of routeMetrics.segments) {
        const dx = segment.end[0] - segment.start[0];
        const dy = segment.end[1] - segment.start[1];
        const denominator = dx * dx + dy * dy;
        if (denominator <= 0) continue;

        const tRaw = ((point[0] - segment.start[0]) * dx + (point[1] - segment.start[1]) * dy) / denominator;
        const t = clamp(tRaw, 0, 1);

        const projected: Coordinate = [
            segment.start[0] + dx * t,
            segment.start[1] + dy * t
        ];

        const errX = point[0] - projected[0];
        const errY = point[1] - projected[1];
        const distanceSq = errX * errX + errY * errY;

        if (distanceSq >= bestDistanceSq) continue;

        bestDistanceSq = distanceSq;
        bestProjection = {
            coordinate: projected,
            distanceAlongRoute: segment.startDistance + segment.length * t
        };
    }

    return bestProjection;
};

export const interpolateOnRoute = (
    routeMetrics: RouteMetrics,
    distanceAlongRoute: number
): Coordinate => {
    if (routeMetrics.segments.length === 0) return routeMetrics.fallbackPoint;

    const clampedDistance = clamp(distanceAlongRoute, 0, routeMetrics.totalLength);

    for (const segment of routeMetrics.segments) {
        const segmentEndDistance = segment.startDistance + segment.length;
        if (clampedDistance > segmentEndDistance) continue;

        const localDistance = clampedDistance - segment.startDistance;
        const ratio = segment.length > 0 ? localDistance / segment.length : 0;

        return [
            segment.start[0] + (segment.end[0] - segment.start[0]) * ratio,
            segment.start[1] + (segment.end[1] - segment.start[1]) * ratio
        ];
    }

    const lastSegment = routeMetrics.segments[routeMetrics.segments.length - 1];
    return lastSegment.end;
};
