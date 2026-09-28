import { City } from './City';

class Route {
    cities: City[];
    visited: boolean;
    // 0 to 3 in half steps, derived from the stored best record (see StarRating).
    stars: number;

    route_id: string;
    route_number: string;
    route_name: string;
    full_name: string;
    length_km: number;
    description: string;
    image_url: string | null;

    constructor() {
        this.cities = [];
        this.visited = false;
        this.stars = 0;

        this.route_id = "";
        this.route_number = "";
        this.route_name = "";
        this.full_name = "";
        this.length_km = 0;
        this.description = "";
        this.image_url = null;
    }
}

export { Route };
