import type { FeatureCollection, Geometry } from 'geojson';
import citiesData from '../assets/data/cities.json';
import routesData from '../assets/data/routes.json';
import { City } from './City';
import { Route } from './Route';

// Type interfaces for raw JSON data
interface RawRoute {
    id: string;
    full_name?: string;
    length_km: number;
    description?: string;
    cities: string[];
}

interface RawCity {
    id: string;
    name: string;
    typing: string;
    lat: number;
    lon: number;
    province: string;
    tier: string;
    kind?: string;
}

interface RawRoutesData {
    routes: RawRoute[];
}

interface RawCitiesData {
    cities: RawCity[];
}

class RoutesController {
    routes: { [key: string]: Route };
    private geometriesMap: { [key: string]: Geometry };
    private routeCityIdsMap: { [key: string]: string[] };
    private cityRoutesMap: { [key: string]: Array<{ id: string; displayName: string }> };
    private routeImageUrlCache: { [key: string]: Promise<string | null> | undefined };

    constructor() {
        this.routes = {};
        this.geometriesMap = {};
        this.routeCityIdsMap = {};
        this.cityRoutesMap = {};
        this.routeImageUrlCache = {};
    }

    private sanitizeRouteNumber(routeNumber: string): string {
        const normalized = String(routeNumber ?? '').trim();
        return normalized.replace(/^0+(?!$)/, '');
    }

    private formatRouteDisplayName(routeNumber: string): string {
        return `RN${this.sanitizeRouteNumber(routeNumber)}`;
    }

    private resolveRouteImageUrl(routeNumber: string): Promise<string | null> {
        const sanitizedRouteNumber = this.sanitizeRouteNumber(routeNumber);
        if (!sanitizedRouteNumber) return Promise.resolve(null);

        const imagePath = `/images/routes/RN${sanitizedRouteNumber}.webp`;
        const cacheKey = imagePath;
        if (this.routeImageUrlCache[cacheKey]) return this.routeImageUrlCache[cacheKey];

        this.routeImageUrlCache[cacheKey] = new Promise((resolve) => {
            const imageProbe = new Image();
            imageProbe.onload = () => resolve(imagePath);
            imageProbe.onerror = () => resolve(null);
            imageProbe.src = imagePath;
        });

        return this.routeImageUrlCache[cacheKey];
    }

    private toCity(raw: any): City {
        const city = new City();
        city.id = String(raw?.id ?? '');
        city.name = String(raw?.name ?? '');
        city.typing = String(raw?.typing ?? '');
        city.lat = Number(raw?.lat ?? 0);
        city.lon = Number(raw?.lon ?? 0);
        return city;
    }

    /**
     * @param geometries - Route geometry keyed by route id, already decoded from the
     *   binary payload (see `data/RouteGeometryStore`). Passed in rather than imported
     *   so the blob can be fetched in parallel with the app chunk instead of being
     *   inlined into it.
     */
    init(geometries: { [routeId: string]: Geometry }) {
        const routesDataTyped: RawRoutesData = routesData;
        const citiesDataTyped: RawCitiesData = citiesData;

        const sharedCitiesById: { [key: string]: RawCity } = {};
        for (const cityEntry of citiesDataTyped.cities) {
            if (sharedCitiesById[cityEntry.id]) {
                console.warn(`Duplicate city id in cities.json: ${cityEntry.id}`);
                continue;
            }
            sharedCitiesById[cityEntry.id] = cityEntry;
        }

        this.geometriesMap = geometries;

        // Populate routes with data from routes.json, resolving each city id
        // against the shared cities.json catalog.
        for (const routeEntry of routesDataTyped.routes) {
            const route = new Route();
            route.route_id = routeEntry.id;
            route.route_number = routeEntry.id.slice(3);
            route.route_name = `RN ${route.route_number}`;
            route.full_name = routeEntry.full_name ?? '';
            route.length_km = routeEntry.length_km;
            route.description = routeEntry.description ?? '';

            // Assign cities, resolved from the shared catalog
            for (const cityId of routeEntry.cities ?? []) {
                const rawCity = sharedCitiesById[cityId];
                if (!rawCity) {
                    console.warn(`Missing city reference: route ${routeEntry.id} -> city ${cityId}`);
                    continue;
                }
                route.cities.push(this.toCity(rawCity));
            }

            this.resolveRouteImageUrl(route.route_number)
                .then((imageUrl) => {
                    route.image_url = imageUrl;
                })
                .catch(() => {
                    route.image_url = null;
                });

            this.routeCityIdsMap[routeEntry.id] = route.cities.map((city) => city.id);

            const routeDisplayName = this.formatRouteDisplayName(route.route_number);
            for (const city of route.cities) {
                if (!this.cityRoutesMap[city.id]) this.cityRoutesMap[city.id] = [];
                this.cityRoutesMap[city.id].push({
                    id: route.route_id,
                    displayName: routeDisplayName
                });
            }

            this.routes[routeEntry.id] = route;
        }

        console.log(`RoutesController initialized with ${Object.keys(this.routes).length} routes`);
    }

    /**
     * Get geometry for a specific route by route id
     * @param routeId - The route id (e.g., 'rn-1')
     * @returns The GeoJSON geometry object or undefined if not found
     */
    getGeometryById(routeId: string): Geometry | undefined {
        return this.geometriesMap[routeId];
    }

    /**
     * Get all geometries for all routes
     * @returns Array of objects with route id and geometry
     */
    getAllGeometries(): Array<{ id: string; geometry: Geometry }> {
        return Object.entries(this.geometriesMap).map(([id, geometry]) => ({
            id,
            geometry
        }));
    }

    getRoutesFeatureCollection(): FeatureCollection {
        return {
            type: 'FeatureCollection',
            features: Object.entries(this.geometriesMap).map(([id, geometry]) => ({
                type: 'Feature',
                properties: {
                    id,
                    route: this.routes[id]?.route_number ?? '',
                    route_display: this.formatRouteDisplayName(this.routes[id]?.route_number ?? ''),
                    name: this.routes[id]?.route_name ?? '',
                    cities_count: this.routes[id]?.cities.length ?? 0,
                    visited: this.routes[id]?.visited ?? false,
                    stars: this.routes[id]?.stars ?? 0
                },
                geometry
            }))
        };
    }

    setRouteVisited(routeId: string, visited: boolean): FeatureCollection {
        if (this.routes[routeId]) this.routes[routeId].visited = visited;
        return this.getRoutesFeatureCollection();
    }

    getRouteCityIdsMap(): { [key: string]: string[] } {
        return Object.fromEntries(
            Object.entries(this.routeCityIdsMap).map(([routeId, cityIds]) => [routeId, [...cityIds]])
        );
    }

    getCityRoutesMap(): { [key: string]: Array<{ id: string; displayName: string }> } {
        return Object.fromEntries(
            Object.entries(this.cityRoutesMap).map(([cityId, routes]) => [
                cityId,
                routes.map((route) => ({ ...route }))
            ])
        );
    }

    getCitiesFeatureCollection(): FeatureCollection {
        const cityAggregates: {
            [key: string]: {
                city: City;
                visited: boolean;
            };
        } = {};

        for (const route of Object.values(this.routes)) {
            for (const city of route.cities) {
                const existing = cityAggregates[city.id];
                const derivedVisited = city.visited || route.visited;

                if (!existing) {
                    cityAggregates[city.id] = {
                        city,
                        visited: derivedVisited
                    };
                    continue;
                }

                existing.visited = existing.visited || derivedVisited;
            }
        }

        const aggregatedCities = Object.values(cityAggregates);
        return {
            type: 'FeatureCollection',
            features: aggregatedCities.map(({ city, visited }) => ({
                type: 'Feature',
                id: city.id,
                properties: {
                    id: city.id,
                    name: city.name,
                    visited
                },
                geometry: {
                    type: 'Point',
                    coordinates: [city.lon, city.lat]
                }
            }))
        };
    }
}

export { RoutesController };
