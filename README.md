# the-typing-routes
Simple juego de mecanografia usando rutas Argentinas

## Data model for cities

Cities are normalized to avoid duplicate city objects across routes.

- Shared city catalog: `src/assets/data/national_cities.json`
- Per-route city references: `src/assets/data/national_routes_cities.json` using `city_refs: string[]`

### Shared city catalog shape

```json
{
	"total_cities": 28,
	"cities": [
		{
			"id": "rn3-001",
			"name": "Ciudad Autónoma de Buenos Aires",
			"typing": "buenos aires",
			"lat": -34.6037,
			"lon": -58.3816,
			"province": "Buenos Aires (CABA)",
			"tier": "major"
		}
	]
}
```

### Route references shape

```json
{
	"id": "rn-0003",
	"route": "0003",
	"city_refs": ["rn3-001", "rn3-002", "rn3-003"],
	"city_meta": {
		"rn3-001": { "order": 1, "km_mark": 0 },
		"rn3-002": { "order": 2, "km_mark": 65 }
	}
}
```

The order of `city_refs` defines the route traversal order.
Use `city_meta` only for route-specific attributes that should not live in the shared catalog.
