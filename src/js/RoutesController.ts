import type { FeatureCollection, Geometry } from 'geojson';
import citiesData from '../assets/data/national_cities.json';
import routesData from '../assets/data/national_routes.json';
import routesCitiesData from '../assets/data/national_routes_cities.json';
import geometriesData from '../assets/data/national_routes_geometries.json';
import { City } from './City';
import { Route } from './Route';

// Type interfaces for raw JSON data
interface RawRoute {
    id: string;
    route: string;
    name: string;
    sentido: string;
    length_km: number;
    tipo_calzada: string;
}

interface RawRouteCity {
    id: string;
    route: string;
    city_refs: string[];
}

interface RawCity {
    id: string;
    name: string;
    typing: string;
    lat: number;
    lon: number;
    province: string;
    tier: string;
}

interface RawRouteGeometry {
    id: string;
    route: string;
    geometry: Geometry;
}

interface RawRoutesData {
    source: string;
    sentido_preferred: string;
    total_routes: number;
    routes: RawRoute[];
}

interface RawRoutesCitiesData {
    total_routes: number;
    routes: RawRouteCity[];
}

interface RawCitiesData {
    total_cities: number;
    cities: RawCity[];
}

interface RawRoutesGeometriesData {
    source: string;
    sentido_preferred: string;
    total_routes: number;
    routes: RawRouteGeometry[];
}

class RoutesController {
    routes: { [key: string]: Route };
    private geometriesMap: { [key: string]: Geometry };

    constructor() {
        this.routes = {};
        this.geometriesMap = {};
    }

    private toCity(raw: any): City {
        const city = new City();
        city.id = String(raw?.id ?? '');
        city.name = String(raw?.name ?? '');
        city.typing = String(raw?.typing ?? '');
        city.lat = Number(raw?.lat ?? 0);
        city.lon = Number(raw?.lon ?? 0);
        city.province = String(raw?.province ?? '');
        city.tier = String(raw?.tier ?? '');
        return city;
    }

    init() {
        const routesDataTyped: RawRoutesData = routesData;
        const routesCitiesDataTyped: RawRoutesCitiesData = routesCitiesData;
        const citiesDataTyped: RawCitiesData = citiesData;
        const geometriesDataTyped = geometriesData as RawRoutesGeometriesData;

        const sharedCitiesById: { [key: string]: RawCity } = {};
        for (const cityEntry of citiesDataTyped.cities) {
            if (sharedCitiesById[cityEntry.id]) {
                console.warn(`Duplicate city id in national_cities.json: ${cityEntry.id}`);
                continue;
            }
            sharedCitiesById[cityEntry.id] = cityEntry;
        }

        // Create a map of city refs by route id for quick lookup
        const citiesMap: { [key: string]: RawCity[] } = {};
        for (const citiesEntry of routesCitiesDataTyped.routes) {
            const resolvedCities: RawCity[] = [];
            for (const cityId of citiesEntry.city_refs ?? []) {
                const rawCity = sharedCitiesById[cityId];
                if (!rawCity) {
                    console.warn(`Missing city reference: route ${citiesEntry.id} -> city ${cityId}`);
                    continue;
                }
                resolvedCities.push(rawCity);
            }
            citiesMap[citiesEntry.id] = resolvedCities;
        }

        // Create a map of geometries by route id for quick lookup
        for (const geometryEntry of geometriesDataTyped.routes) {
            this.geometriesMap[geometryEntry.id] = geometryEntry.geometry;
        }

        // Populate routes with data from national_routes.json and national_routes_cities.json
        for (const routeEntry of routesDataTyped.routes) {
            const route = new Route();
            route.route_id = routeEntry.id;
            route.route_number = routeEntry.route;
            route.route_name = routeEntry.name;
            route.direction = routeEntry.sentido;
            route.length_km = routeEntry.length_km;
            route.road_type = routeEntry.tipo_calzada;

            // Assign cities from cities data
            if (citiesMap[routeEntry.id]) {
                route.cities = citiesMap[routeEntry.id].map((rawCity) => this.toCity(rawCity));
            }

            this.routes[routeEntry.id] = route;
        }

        console.log(`RoutesController initialized with ${Object.keys(this.routes).length} routes`);
    }

    /**
     * Get geometry for a specific route by route id
     * @param routeId - The route id (e.g., 'rn-0001')
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
                    name: this.routes[id]?.route_name ?? '',
                    cities_count: this.routes[id]?.cities.length ?? 0,
                    visited: this.routes[id]?.visited ?? false
                },
                geometry
            }))
        };
    }

    setRouteVisited(routeId: string, visited: boolean): FeatureCollection {
        if (this.routes[routeId]) this.routes[routeId].visited = visited;
        return this.getRoutesFeatureCollection();
    }

    getCitiesFeatureCollection(): FeatureCollection {
        const allCities: City[] = Object.values(this.routes).flatMap((r) => r.cities);
        return {
            type: 'FeatureCollection',
            features: allCities.map((city) => ({
                type: 'Feature',
                properties: {
                    id: city.id,
                    name: city.name,
                    visited: city.visited,
                    tier: city.tier
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
