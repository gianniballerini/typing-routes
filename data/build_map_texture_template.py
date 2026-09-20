#!/usr/bin/env python3
"""
Generates the Argentina background texture placeholder, and the template an
artist draws the real one against.

The texture has to line up with routes that are drawn in Web Mercator, so it is
rendered in Web Mercator too, at a fixed bounding box recorded in
`Settings.mapTexture.bounds`. Alignment is then exact by construction — there is
no eyeballing and no offset to tune. Draw the artwork to the same bbox at the
same aspect ratio and it will land correctly at every zoom.

An equirectangular (plate carrée) image will NOT work: Mercator stretches
latitude by 1/cos(lat), and Argentina spans 35 degrees of it, so the south would
drift badly against the routes.

Outputs into <out_dir>:
  argentina_texture.png           the placeholder the game loads
  argentina_texture_template.png  the same, plus tracing guides and labels

Usage:
    python3 build_map_texture_template.py <border.json> <border.bin> <routes.json> <routes.bin> <out_dir> [--width 2048]
"""

import argparse
import json
import math
import os
import struct

from PIL import Image, ImageDraw

# Must match `Settings.mapTexture.bounds`.
WEST, EAST = -74.0, -53.0
NORTH, SOUTH = -21.0, -56.0

MAX_LATITUDE = 85.05112878


def project(lon, lat):
    lat = max(-MAX_LATITUDE, min(MAX_LATITUDE, lat))
    sin_lat = math.sin(math.radians(lat))
    return (lon + 180.0) / 360.0, 0.5 - math.log((1 + sin_lat) / (1 - sin_lat)) / (4 * math.pi)


def load_quantized(index_path, bin_path):
    """Reads one of the Int16 payloads the other build scripts emit."""
    with open(index_path, encoding="utf-8") as f:
        index = json.load(f)
    with open(bin_path, "rb") as f:
        raw = f.read()
    values = struct.unpack(f"<{len(raw) // 2}h", raw)

    def dequantize(bbox, offset, counts):
        min_x, min_y, max_x, max_y = bbox
        scale_x = (max_x - min_x) / index["quantMax"]
        scale_y = (max_y - min_y) / index["quantMax"]
        lines, cursor = [], offset
        for count in counts:
            line = []
            for _ in range(count):
                line.append((min_x + values[cursor * 2] * scale_x,
                             min_y + values[cursor * 2 + 1] * scale_y))
                cursor += 1
            lines.append(line)
        return lines

    if "routes" in index:  # route payload: one entry per route
        out = []
        for entry in index["routes"]:
            out.extend(dequantize(entry["bbox"], entry["offset"], entry["parts"]))
        return out
    return dequantize(index["bbox"], 0, index["parts"])  # border payload


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("border_index")
    parser.add_argument("border_bin")
    parser.add_argument("routes_index")
    parser.add_argument("routes_bin")
    parser.add_argument("out_dir")
    parser.add_argument("--width", type=int, default=2048)
    args = parser.parse_args()

    x0, y0 = project(WEST, NORTH)
    x1, y1 = project(EAST, SOUTH)
    span_x, span_y = x1 - x0, y1 - y0

    width = args.width
    height = round(width * span_y / span_x)

    def to_px(point):
        return ((point[0] - x0) / span_x * width, (point[1] - y0) / span_y * height)

    border = load_quantized(args.border_index, args.border_bin)
    routes = load_quantized(args.routes_index, args.routes_bin)

    # --- placeholder: border only, transparent, so it reads as a backdrop -----
    placeholder = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(placeholder)
    stroke = max(2, width // 400)
    for line in border:
        points = [to_px(p) for p in line]
        if len(points) >= 2:
            draw.line(points, fill=(255, 255, 255, 60), width=stroke, joint="curve")

    os.makedirs(args.out_dir, exist_ok=True)
    placeholder_path = os.path.join(args.out_dir, "argentina_texture.png")
    placeholder.save(placeholder_path, optimize=True)

    # --- template: adds the route network and the numbers an artist needs ----
    template = Image.new("RGBA", (width, height), (18, 22, 28, 255))
    draw = ImageDraw.Draw(template)
    for line in routes:
        points = [to_px(p) for p in line]
        if len(points) >= 2:
            draw.line(points, fill=(255, 184, 28, 130), width=max(1, width // 900), joint="curve")
    for line in border:
        points = [to_px(p) for p in line]
        if len(points) >= 2:
            draw.line(points, fill=(255, 255, 255, 220), width=stroke, joint="curve")

    # Crop marks, so the artwork can be aligned to the canvas edge.
    mark = width // 20
    for cx, cy in ((0, 0), (width, 0), (0, height), (width, height)):
        draw.line([(cx - mark, cy), (cx + mark, cy)], fill=(255, 80, 80, 255), width=stroke)
        draw.line([(cx, cy - mark), (cx, cy + mark)], fill=(255, 80, 80, 255), width=stroke)

    label = (f"ARGENTINA MAP TEXTURE TEMPLATE\n"
             f"{width} x {height} px   Web Mercator (EPSG:3857)\n"
             f"lon {WEST} .. {EAST}   lat {NORTH} .. {SOUTH}\n"
             f"White = international border   Amber = national routes\n"
             f"Draw to this exact canvas. Do NOT crop or change aspect.")
    draw.multiline_text((width * 0.05, height * 0.012), label, fill=(255, 255, 255, 230), spacing=8)

    template_path = os.path.join(args.out_dir, "argentina_texture_template.png")
    template.save(template_path, optimize=True)

    print(f"canvas           {width} x {height} px")
    print(f"mercator aspect  w/h = {span_x / span_y:.5f}  (h = w * {span_y / span_x:.5f})")
    print(f"bounds           lon {WEST}..{EAST}  lat {NORTH}..{SOUTH}")
    print(f"{placeholder_path}  {os.path.getsize(placeholder_path):,} bytes")
    print(f"{template_path}  {os.path.getsize(template_path):,} bytes")


if __name__ == "__main__":
    main()
