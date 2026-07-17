class City {
    id: string;
    name: string;
    typing: string;
    lat: number;
    lon: number;
    province: string;
    tier: string;

    constructor() {
        this.id = "";
        this.name = "";
        this.typing = "";
        this.lat = 0;
        this.lon = 0;
        this.province = "";
        this.tier = "";
    }
}

export { City };
