#!/usr/bin/env python3
"""
Builds the Argentina border outline the map draws behind the routes.

Replaces the remote `demotiles.maplibre.org` vector tileset the MapLibre version
filtered down to one country, so the app stops depending on a third-party host at
runtime. Same treatment as the routes: simplify, project to Web Mercator, quantize
to Int16 — see `simplify_geometries.py`, whose tolerance reasoning applies here too.

The IGN export is *international boundary lines only*: it carries no Atlantic
coastline, so these strokes cannot be assembled into a closed polygon. The Antarctic
sector is dropped, since drawing it would put the camera bounds in the wrong place.

Usage:
    python3 build_border.py <limite_internacional.json> <out_dir> [--px 0.5]
"""

import argparse
import json
import math
import os
import struct

TILE_SIZE = 512
MAX_LATITUDE = 85.05112878
QUANT_MAX = 32767
# Matches `Settings.maxZoom`; the tolerance below is pixels at that zoom.
MAX_ZOOM = 9.0
EXCLUDE_TOKENS = ("antártico", "antartico")

# Maritime boundaries are ruled lines drawn between a handful of survey points,
# so they run hundreds of km with a dozen vertices; surveyed land borders are
# dense (median 0.09 km per segment). Measured on this export the land borders
# top out at 3.97 km/segment and the maritime ones start at 13.1, so this cuts
# cleanly between them. Without it the Rio de la Plata limit and the line south
# of Tierra del Fuego render as strays trailing off into open ocean.
MAX_KM_PER_SEGMENT = 5.0
EARTH_KM_PER_DEGREE = 111.32


def project(lon, lat):
    lat = max(-MAX_LATITUDE, min(MAX_LATITUDE, lat))
    sin_lat = math.sin(math.radians(lat))
    return (lon + 180.0) / 360.0, 0.5 - math.log((1 + sin_lat) / (1 - sin_lat)) / (4 * math.pi)


def rdp(points, tolerance):
    if len(points) < 3:
        return list(points)
    keep = [False] * len(points)
    keep[0] = keep[-1] = True
    stack = [(0, len(points) - 1)]
    tol_sq = tolerance * tolerance
    while stack:
        first, last = stack.pop()
        if last <= first + 1:
            continue
        ax, ay = points[first]
        bx, by = points[last]
        dx, dy = bx - ax, by - ay
        denom = dx * dx + dy * dy
        worst_i, worst_d = -1, 0.0
        for i in range(first + 1, last):
            px, py = points[i]
            if denom <= 0:
                ex, ey = px - ax, py - ay
            else:
                t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / denom))
                ex, ey = px - (ax + dx * t), py - (ay + dy * t)
            d = ex * ex + ey * ey
            if d > worst_d:
                worst_d, worst_i = d, i
        if worst_i != -1 and worst_d > tol_sq:
            keep[worst_i] = True
            stack.append((first, worst_i))
            stack.append((worst_i, last))
    return [p for p, k in zip(points, keep) if k]


def mean_segment_km(line):
    """Average spacing between consecutive vertices, in km."""
    if len(line) < 2:
        return 0.0
    total = 0.0
    for i in range(1, len(line)):
        dx = (line[i][0] - line[i - 1][0]) * math.cos(math.radians(line[i][1]))
        dy = line[i][1] - line[i - 1][1]
        total += math.hypot(dx, dy) * EARTH_KM_PER_DEGREE
    return total / (len(line) - 1)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("input")
    parser.add_argument("out_dir")
    parser.add_argument("--px", type=float, default=0.5,
                        help="Simplification tolerance in CSS px at max zoom (default: 0.5)")
    args = parser.parse_args()

    tolerance = args.px / (TILE_SIZE * (2 ** MAX_ZOOM))

    with open(args.input, encoding="utf-8") as f:
        data = json.load(f)

    lines = []
    before = 0
    dropped = 0
    for feature in data["features"]:
        props = feature.get("properties") or {}
        label = f"{props.get('fna', '')} {props.get('nam', '')}".lower()
        if any(token in label for token in EXCLUDE_TOKENS):
            continue
        geometry = feature.get("geometry") or {}
        if geometry.get("type") != "MultiLineString":
            continue
        for line in geometry["coordinates"]:
            if mean_segment_km(line) > MAX_KM_PER_SEGMENT:
                dropped += 1
                continue
            projected = [project(c[0], c[1]) for c in line]
            before += len(projected)
            simplified = rdp(projected, tolerance)
            if len(simplified) >= 2:
                lines.append(simplified)

    flat = [p for line in lines for p in line]
    min_x = min(p[0] for p in flat)
    max_x = max(p[0] for p in flat)
    min_y = min(p[1] for p in flat)
    max_y = max(p[1] for p in flat)
    span_x = (max_x - min_x) or 1e-12
    span_y = (max_y - min_y) or 1e-12

    blob = bytearray()
    parts = []
    for line in lines:
        parts.append(len(line))
        for x, y in line:
            blob += struct.pack(
                "<hh",
                round((x - min_x) / span_x * QUANT_MAX),
                round((y - min_y) / span_y * QUANT_MAX),
            )

    os.makedirs(args.out_dir, exist_ok=True)
    bin_path = os.path.join(args.out_dir, "argentina_border.bin")
    json_path = os.path.join(args.out_dir, "argentina_border.json")
    with open(bin_path, "wb") as f:
        f.write(blob)
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump({"quantMax": QUANT_MAX, "bbox": [min_x, min_y, max_x, max_y], "parts": parts},
                  f, separators=(",", ":"))

    after = sum(parts)
    print(f"lines        {len(lines)}  ({dropped} maritime line(s) dropped)")
    print(f"coordinates  {before} -> {after} ({before / max(after, 1):.1f}x fewer)")
    print(f"{bin_path}  {len(blob):,} bytes")
    print(f"{json_path}  {os.path.getsize(json_path):,} bytes")


if __name__ == "__main__":
    main()
