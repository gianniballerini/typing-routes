#!/usr/bin/env python3
"""
Validates src/assets/data/routes.json, cities.json and routes_render.json
against the shape RoutesController/RouteGeometryStore expect.

Exits non-zero only on hard errors (broken references, malformed ids,
duplicate ids, invalid enum values). Content gaps that the app can still run
with (routes with fewer than 2 cities, orphan cities not referenced by any
route) are reported as warnings, never failures.

Usage:
    python3 data/validate_data.py
"""

import json
import os
import re
import sys
import unicodedata

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "src", "assets", "data")

ROUTE_ID_RE = re.compile(r"^rn-[1-9][0-9]*$")
CITY_ID_RE = re.compile(r"^[a-z0-9-]+/[a-z0-9-]+$")
ALLOWED_TIERS = {"major", "medium", "minor"}
ALLOWED_KINDS = {"bridge", "ferry", "detour", "endpoint"}


def slugify(value: str) -> str:
    """lowercase, strip accents, non-alnum -> '-', collapse/trim dashes."""
    normalized = unicodedata.normalize("NFKD", value)
    ascii_only = normalized.encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_only.lower())
    return slug.strip("-")


def strip_accents(value: str) -> str:
    """Removes diacritics only, keeping every other character (spaces, punctuation) as-is."""
    normalized = unicodedata.normalize("NFKD", value)
    return "".join(ch for ch in normalized if not unicodedata.combining(ch))


def derive_typing(name: str) -> str:
    """Best-effort reconstruction of `typing` from `name`, for the mismatch warning."""
    ascii_only = strip_accents(name)
    cleaned = re.sub(r"[^a-z0-9 ]+", " ", ascii_only.lower())
    return re.sub(r"\s+", " ", cleaned).strip()


def load_json(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def main() -> int:
    errors = []
    warnings = []

    routes_path = os.path.join(DATA_DIR, "routes.json")
    cities_path = os.path.join(DATA_DIR, "cities.json")
    render_path = os.path.join(DATA_DIR, "routes_render.json")

    routes = load_json(routes_path)["routes"]
    cities = load_json(cities_path)["cities"]
    render_index = load_json(render_path)["routes"]

    # --- Route ids -------------------------------------------------------
    route_ids_seen = set()
    for route in routes:
        route_id = route.get("id", "")
        if route_id in route_ids_seen:
            errors.append(f"Duplicate route id: {route_id}")
        route_ids_seen.add(route_id)

        if not ROUTE_ID_RE.match(route_id):
            errors.append(f"Route id does not match ^rn-[1-9][0-9]*$: {route_id!r}")

    # --- City ids, province prefix, tier/kind, typing ---------------------
    city_ids_seen = set()
    city_ids = set()
    for city in cities:
        city_id = city.get("id", "")
        if city_id in city_ids_seen:
            errors.append(f"Duplicate city id: {city_id}")
        city_ids_seen.add(city_id)
        city_ids.add(city_id)

        if not CITY_ID_RE.match(city_id):
            errors.append(f"City id does not match ^[a-z0-9-]+/[a-z0-9-]+$: {city_id!r}")
        else:
            province_slug = city_id.split("/", 1)[0]
            expected_slug = slugify(city.get("province", ""))
            # CABA's province displays as "Ciudad Autónoma de Buenos Aires" but
            # its id prefix is the short-hand "caba" by design.
            if city.get("province") == "Ciudad Autónoma de Buenos Aires":
                expected_slug = "caba"
            if province_slug != expected_slug:
                errors.append(
                    f"City id prefix {province_slug!r} does not match slug(province) "
                    f"{expected_slug!r} for city {city_id!r} (province={city.get('province')!r})"
                )

        tier = city.get("tier")
        if tier not in ALLOWED_TIERS:
            errors.append(f"City {city_id!r} has invalid tier: {tier!r}")

        kind = city.get("kind")
        if kind is not None and kind not in ALLOWED_KINDS:
            errors.append(f"City {city_id!r} has invalid kind: {kind!r}")

        typing = city.get("typing", "")
        if typing != typing.lower():
            errors.append(f"City {city_id!r} typing is not lowercase: {typing!r}")
        if typing != strip_accents(typing):
            errors.append(f"City {city_id!r} typing is not accent-free: {typing!r}")

        derived_from_name = derive_typing(city.get("name", ""))
        if typing != derived_from_name:
            warnings.append(
                f"City {city_id!r} typing {typing!r} differs from name-derived {derived_from_name!r}"
            )

    # --- Route -> city references + content-gap warnings ------------------
    render_ids = {entry["id"] for entry in render_index}

    for route in routes:
        route_id = route.get("id", "")
        cities_refs = route.get("cities", [])

        for city_id in cities_refs:
            if city_id not in city_ids:
                errors.append(f"Route {route_id!r} references unknown city id {city_id!r}")

        if len(cities_refs) < 2:
            warnings.append(f"Route {route_id!r} has fewer than 2 cities ({len(cities_refs)})")

        if route_id not in render_ids:
            errors.append(f"Route {route_id!r} has no render entry in routes_render.json")

    # --- Orphan cities (not referenced by any route) -----------------------
    referenced_city_ids = {city_id for route in routes for city_id in route.get("cities", [])}
    orphans = sorted(city_ids - referenced_city_ids)
    if orphans:
        warnings.append(f"Orphan cities (not referenced by any route): {orphans}")

    # --- Report -------------------------------------------------------------
    if warnings:
        print(f"Warnings ({len(warnings)}):")
        for warning in warnings:
            print(f"  - {warning}")

    if errors:
        print(f"Errors ({len(errors)}):")
        for error in errors:
            print(f"  - {error}")
        print(f"\nFAILED: {len(errors)} error(s), {len(warnings)} warning(s)")
        return 1

    print(f"\nOK: 0 errors, {len(warnings)} warning(s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
