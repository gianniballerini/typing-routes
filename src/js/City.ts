class City {
    id: string;
    name: string;
    typing: string;
    lat: number;
    lon: number;
    province: string;
    tier: string;
    kind: string | null;
    visited: boolean;

    constructor() {
        this.id = "";
        this.name = "";
        this.typing = "";
        this.lat = 0;
        this.lon = 0;
        this.province = "";
        this.tier = "";
        this.kind = null;
        this.visited = false;
    }
}

export { City };
