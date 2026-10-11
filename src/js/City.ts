class City {
    id: string;
    name: string;
    typing: string;
    lat: number;
    lon: number;
    /** Role of a non-town stop (`border`, `bridge`, ...), or null for a town. */
    kind: string | null;
    visited: boolean;

    constructor() {
        this.id = "";
        this.name = "";
        this.typing = "";
        this.lat = 0;
        this.lon = 0;
        this.kind = null;
        this.visited = false;
    }
}

export { City };
