import { City } from './City';

class Route {
    sections: any[];
    cities: City[];
    cities_cleared: City[];
    visited: boolean;

    route_id: string;
    route_number: string;
    route_name: string;
    full_name: string;
    direction: string;
    length_km: number;
    road_type: string;
    description: string;
    image_url: string | null;

    constructor() {
        this.sections = [];
        this.cities = [];
        this.cities_cleared = [];
        this.visited = false;

        this.route_id = "";
        this.route_number = "";
        this.route_name = "";
        this.full_name = "";
        this.direction = "";
        this.length_km = 0;
        this.road_type = "";
        this.description = "";
        this.image_url = null;
    }
}

export { Route };
