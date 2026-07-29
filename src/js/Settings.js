class Settings
{
  constructor()
  {
    this.center = [-63.6167, -38.4161];
    this.initialZoom = 1;
    this.minZoom = 1;
    this.maxZoom = 9;
    this.maxBounds = [
      [-90.0, -57.0],
      [-40.0, -20.0]
    ];

    this.sourceIds = {
      openmaptiles: 'openmaptiles',
      nationalRoutes: 'national-routes',
      cities: 'cities',
      progressMarker: 'progress-marker'
    };

    this.layerIds = {
      argentinaLimits: 'argentina-limits',
      nationalRoutesLine: 'national-routes-line',
      nationalRoutesHitbox: 'national-routes-hitbox',
      citiesCircle: 'cities-circle',
      citiesCircleHitbox: 'cities-circle-hitbox',
      progressMarkerIcon: 'progress-marker-icon'
    };

    this.argentinaBorder = {
      color: '#e1e1e184',
      width: 2
    };

    this.routeLine = {
      colors: {
        default: '#cccccc',
        visited: '#FFB81C',
        hovered: '#777777',
        selected: '#6CACE4'
      },
      opacity: 0.9,
      widthByZoom: {
        minZoom: 3,
        minWidth: 2.4,
        maxZoom: 7,
        maxWidth: 8
      },
      hitWidthByZoom: {
        minZoom: 3,
        minWidth: 8,
        maxZoom: 7,
        maxWidth: 18
      },
      hitboxDebug: {
        visible: false,
        color: '#00bcd4',
        opacity: 0.28
      }
    };

    this.cityCircle = {
      radiusByZoom: {
        minZoom: 3,
        minRadius: 2,
        maxZoom: 7,
        maxRadius: 6
      },
      hitRadiusByZoom: {
        minZoom: 3,
        minRadius: 7,
        maxZoom: 7,
        maxRadius: 13
      },
      hitboxDebug: {
        // Toggle to visualize city interaction hotspots.
        visible: false,
        color: '#ff0066',
        opacity: 0.2,
        strokeColor: '#ffffff',
        strokeOpacity: 0.8,
        strokeWidth: 1
      },
      colors: {
        default: '#cccccc',
        visited: '#6CACE4',
        selected: '#E88D00'
      },
      stroke: {
        width: 1,
        color: '#ffffff'
      }
    };

    this.routeSelection = {
      flyToZoom: 6,
      veryShortRouteThresholdKm: 120,
      veryShortRouteZoom: 30
    };

    this.progressMarker = {
      iconId: 'progress-marker-car',
      // Car length in px (the sprite points north and is rotated by the route heading).
      size: 26,
      color: '#FFB81C',
      roofColor: '#cf7d09',
      glassColor: '#2A3440',
      lightColor: '#FFF3D6',
      opacity: 0.95,
      strokeColor: '#ffffff',
      strokeWidth: 1,
      sizeByZoom: {
        minZoom: 4,
        minSize: 1.2,
        maxZoom: 9,
        maxSize: 2
      }
    };
  }
}

const settings = new Settings();
export { settings as Settings };

