#!/usr/bin/env python3
"""
Reads the DNV "Rutas_Nacionales" GeoJSON (WFS ows export) and builds:
- routes.json (route metadata + city ids, in src/assets/data/routes.json shape)
- data/raw/national_routes_geometries.json (raw geometry payload, input for
  data/simplify_geometries.py)

keeping a single Sentido (direction) per route to avoid duplicate
dual-carriageway lines.

`cities` is always emitted empty for a route this script has not seen before —
cities are curated manually afterward (see data/README.md) and are never
sourced from the DNV export. If `--output` already points at an existing
routes.json, this script preserves that route's `full_name`, `description`
and `cities` instead of overwriting them, so re-running against a refreshed
DNV export doesn't discard curated data.

Usage:
    python3 build_national_routes.py <input_ows.json> <output_routes.json> [--sentido A]
"""

import json
import argparse
import os
from collections import defaultdict

PLACEHOLDER_FULL_NAME = "Ruta Nacional {n}"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("input", help="Path to the raw DNV ows/GeoJSON file")
    parser.add_argument("output", help="Path to write routes.json (e.g. src/assets/data/routes.json)")
    parser.add_argument("--sentido", default="A",
                         help="Preferred Sentido to keep per route (default: A). "
                              "Falls back to whatever is available if the "
                              "preferred one is missing for a given route.")
    args = parser.parse_args()

    with open(args.input, encoding="utf-8") as f:
        data = json.load(f)

    features = data["features"]

    # Group all features by route number (RTN)
    by_route = defaultdict(list)
    for feat in features:
        rtn = feat["properties"]["RTN"]
        by_route[rtn].append(feat)

    existing_routes_by_id = {}
    if os.path.exists(args.output):
        with open(args.output, encoding="utf-8") as f:
            existing_routes_by_id = {r["id"]: r for r in json.load(f).get("routes", [])}

    routes_out = []
    geometries_out = []
    fallback_count = 0

    for rtn in sorted(by_route.keys()):
        feats = by_route[rtn]

        # Prefer the requested Sentido; fall back to the first available one
        chosen = next((f for f in feats if f["properties"]["Sentido"] == args.sentido), None)
        if chosen is None:
            chosen = feats[0]
            fallback_count += 1

        props = chosen["properties"]
        route_number = int(rtn)
        route_id = f"rn-{route_number}"
        existing = existing_routes_by_id.get(route_id)

        full_name = props.get("FNA") or f"RN {route_number}"
        placeholder = PLACEHOLDER_FULL_NAME.format(n=route_number)

        route_entry = {"id": route_id}
        if existing and "full_name" in existing:
            route_entry["full_name"] = existing["full_name"]
        elif full_name and full_name != placeholder:
            route_entry["full_name"] = full_name
        route_entry["length_km"] = props.get("Progresiva_Final")
        route_entry["description"] = existing["description"] if existing else ""
        route_entry["cities"] = existing["cities"] if existing else []

        geometry_entry = {
            "id": route_id,
            "geometry": chosen["geometry"]
        }

        routes_out.append(route_entry)
        geometries_out.append(geometry_entry)

    routes_payload = {"routes": routes_out}

    geometries_payload = {
        "source": "DNV - Rutas Nacionales (ows export)",
        "sentido_preferred": args.sentido,
        "total_routes": len(geometries_out),
        "routes": geometries_out
    }

    script_dir = os.path.dirname(os.path.abspath(__file__))
    raw_dir = os.path.join(script_dir, "raw")
    os.makedirs(raw_dir, exist_ok=True)
    geometries_path = os.path.join(raw_dir, "national_routes_geometries.json")

    output_dir = os.path.dirname(args.output) or "."
    os.makedirs(output_dir, exist_ok=True)

    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(routes_payload, f, ensure_ascii=False, indent=2)
        f.write("\n")

    with open(geometries_path, "w", encoding="utf-8") as f:
        json.dump(geometries_payload, f, ensure_ascii=False, indent=2)

    print(f"Total routes written: {len(routes_out)}")
    print(f"Routes using fallback Sentido (preferred '{args.sentido}' not found): {fallback_count}")
    print(f"Wrote routes: {args.output}")
    print(f"Wrote geometries: {geometries_path}")
    print("Cities are curated manually — see data/README.md — and were "
          "preserved from the existing routes.json where present, otherwise left empty.")


if __name__ == "__main__":
    main()
