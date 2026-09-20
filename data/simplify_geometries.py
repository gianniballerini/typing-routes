#!/usr/bin/env python3
"""
Simplifies and pre-projects national_routes_geometries.json for the Canvas 2D
renderer.

The raw DNV export carries survey-grade density (247k coordinates, RN40 alone
has 65k). The game never draws past `Settings.maxZoom`, where the whole Web
Mercator world is 256 * 2**9 = 131072 px wide, so anything finer than a pixel
at that zoom is invisible detail that still costs bundle bytes and draw time.

Output (written next to the input):
- national_routes_render.bin    flat Int16 pairs, quantized per route
- national_routes_render.json   per-route index: offset, count, bbox

Coordinates are Web Mercator normalized to [0, 1] (x east, y south) before
simplification, so the tolerance is expressed directly in screen pixels and the
runtime only has to do `(world - cameraWorld) * scale`.

Usage:
    python3 simplify_geometries.py <geometries.json> <out_dir> [--max-zoom 9] [--px 0.5]
"""

import argparse
import json
import math
import os
import struct

# Matches Settings.maxZoom / the 256px tile size MapLibre's zoom scale assumes.
TILE_SIZE = 256
# Web Mercator is undefined at the poles; this is the standard cutoff.
MAX_LATITUDE = 85.05112878
# Int16 range used for per-route quantization.
QUANT_MAX = 32767


def project(lon, lat):
    """lon/lat -> Web Mercator normalized to [0, 1], y growing south."""
    lat = max(-MAX_LATITUDE, min(MAX_LATITUDE, lat))
    x = (lon + 180.0) / 360.0
    sin_lat = math.sin(math.radians(lat))
    y = 0.5 - math.log((1 + sin_lat) / (1 - sin_lat)) / (4 * math.pi)
    return x, y


def rdp(points, tolerance):
    """Ramer-Douglas-Peucker, iterative so deep routes can't blow the stack."""
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

        worst_index = -1
        worst_dist_sq = 0.0

        for i in range(first + 1, last):
            px, py = points[i]
            if denom <= 0:
                # Degenerate span: fall back to distance from the anchor.
                ex, ey = px - ax, py - ay
            else:
                t = ((px - ax) * dx + (py - ay) * dy) / denom
                t = max(0.0, min(1.0, t))
                ex = px - (ax + dx * t)
                ey = py - (ay + dy * t)
            dist_sq = ex * ex + ey * ey
            if dist_sq > worst_dist_sq:
                worst_dist_sq = dist_sq
                worst_index = i

        if worst_index != -1 and worst_dist_sq > tol_sq:
            keep[worst_index] = True
            stack.append((first, worst_index))
            stack.append((worst_index, last))

    return [p for p, k in zip(points, keep) if k]


def iter_lines(geometry):
    if geometry["type"] == "LineString":
        yield geometry["coordinates"]
    elif geometry["type"] == "MultiLineString":
        for line in geometry["coordinates"]:
            yield line


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("input", help="Path to national_routes_geometries.json")
    parser.add_argument("out_dir", help="Directory to write the render payload into")
    parser.add_argument("--max-zoom", type=float, default=9.0,
                        help="Settings.maxZoom (default: 9)")
    parser.add_argument("--px", type=float, default=0.5,
                        help="Simplification tolerance in CSS px at max zoom "
                             "(default: 0.5, i.e. sub-pixel at DPR 1)")
    args = parser.parse_args()

    world_px = TILE_SIZE * (2 ** args.max_zoom)
    tolerance = args.px / world_px

    with open(args.input, encoding="utf-8") as f:
        data = json.load(f)

    routes = data["routes"]

    index = []
    blob = bytearray()
    total_before = 0
    total_after = 0

    for route in routes:
        parts = []
        for line in iter_lines(route["geometry"]):
            projected = [project(c[0], c[1]) for c in line]
            total_before += len(projected)
            simplified = rdp(projected, tolerance)
            if len(simplified) >= 2:
                parts.append(simplified)
                total_after += len(simplified)

        if not parts:
            continue

        flat = [p for part in parts for p in part]
        min_x = min(p[0] for p in flat)
        max_x = max(p[0] for p in flat)
        min_y = min(p[1] for p in flat)
        max_y = max(p[1] for p in flat)

        # Quantize against the route's own bbox: each route gets the full Int16
        # range over its own extent, so a short route loses no precision to a
        # long one.
        span_x = (max_x - min_x) or 1e-12
        span_y = (max_y - min_y) or 1e-12

        offset = len(blob) // 4  # in coordinate pairs
        part_counts = []
        for part in parts:
            part_counts.append(len(part))
            for x, y in part:
                qx = round((x - min_x) / span_x * QUANT_MAX)
                qy = round((y - min_y) / span_y * QUANT_MAX)
                blob += struct.pack("<hh", qx, qy)

        index.append({
            "id": route["id"],
            "offset": offset,
            "parts": part_counts,
            "bbox": [min_x, min_y, max_x, max_y],
        })

    os.makedirs(args.out_dir, exist_ok=True)
    bin_path = os.path.join(args.out_dir, "national_routes_render.bin")
    json_path = os.path.join(args.out_dir, "national_routes_render.json")

    with open(bin_path, "wb") as f:
        f.write(blob)

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump({
            "quantMax": QUANT_MAX,
            "tileSize": TILE_SIZE,
            "maxZoom": args.max_zoom,
            "tolerancePx": args.px,
            "routes": index,
        }, f, separators=(",", ":"))

    print(f"tolerance      {tolerance:.3e} world units ({args.px} px @ z{args.max_zoom:g})")
    print(f"routes         {len(index)}")
    print(f"coordinates    {total_before} -> {total_after} "
          f"({total_before / max(total_after, 1):.1f}x fewer)")
    print(f"{bin_path}  {len(blob):,} bytes")
    print(f"{json_path}  {os.path.getsize(json_path):,} bytes")


if __name__ == "__main__":
    main()
