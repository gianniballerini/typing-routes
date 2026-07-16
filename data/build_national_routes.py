#!/usr/bin/env python3
"""
Reads the DNV "Rutas_Nacionales" GeoJSON (WFS ows export) and builds
three files with one entry per national route (RTN), keeping a single Sentido
(direction) per route to avoid duplicate dual-carriageway lines:
- national_routes.json (route metadata)
- national_routes_cities.json (cities to be filled manually)
- national_routes_geometries.json (geometry payload)

Usage:
    python3 build_national_routes.py <input_ows.json> <output_national_routes.json> [--sentido A]
"""

import json
import argparse
import os
from collections import defaultdict


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("input", help="Path to the raw DNV ows/GeoJSON file")
    parser.add_argument("output", help="Path to write national_routes.json")
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

    routes_out = []
    cities_out = []
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
        route_id = f"rn-{rtn}"

        route_entry = {
            "id": route_id,
            "route": rtn,
            "name": props.get("FNA", f"RN {rtn}"),
            "sentido": props.get("Sentido"),
            "length_km": props.get("Progresiva_Final"),
            "tipo_calzada": props.get("Tipo_Calzada")
        }
        cities_entry = {
            "id": route_id,
            "route": rtn,
            "cities": []
        }
        geometry_entry = {
            "id": route_id,
            "route": rtn,
            "geometry": chosen["geometry"]
        }

        routes_out.append(route_entry)
        cities_out.append(cities_entry)
        geometries_out.append(geometry_entry)

    routes_payload = {
        "source": "DNV - Rutas Nacionales (ows export)",
        "sentido_preferred": args.sentido,
        "total_routes": len(routes_out),
        "routes": routes_out
    }

    cities_payload = {
        "total_routes": len(cities_out),
        "routes": cities_out
    }

    geometries_payload = {
        "source": "DNV - Rutas Nacionales (ows export)",
        "sentido_preferred": args.sentido,
        "total_routes": len(geometries_out),
        "routes": geometries_out
    }

    output_dir = os.path.dirname(args.output) or "."
    cities_path = os.path.join(output_dir, "national_routes_cities.json")
    geometries_path = os.path.join(output_dir, "national_routes_geometries.json")

    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(routes_payload, f, ensure_ascii=False, indent=2)

    with open(cities_path, "w", encoding="utf-8") as f:
        json.dump(cities_payload, f, ensure_ascii=False, indent=2)

    with open(geometries_path, "w", encoding="utf-8") as f:
        json.dump(geometries_payload, f, ensure_ascii=False, indent=2)

    print(f"Total routes written: {len(routes_out)}")
    print(f"Routes using fallback Sentido (preferred '{args.sentido}' not found): {fallback_count}")
    print(f"Wrote routes: {args.output}")
    print(f"Wrote cities: {cities_path}")
    print(f"Wrote geometries: {geometries_path}")


if __name__ == "__main__":
    main()
