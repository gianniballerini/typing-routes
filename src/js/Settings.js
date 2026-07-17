class Settings
{
  constructor()
  {
    this.center = [-63.6167, -38.4161];
    this.initialZoom = 1;
    this.minZoom = 1;
    this.maxZoom = 7;
    this.maxBounds = [
      [-90.0, -57.0],
      [-40.0, -20.0]
    ];

    this.sourceIds = {
      openmaptiles: 'openmaptiles',
      nationalRoutes: 'national-routes',
      cities: 'cities'
    };

    this.layerIds = {
      argentinaLimits: 'argentina-limits',
      nationalRoutesLine: 'national-routes-line',
      citiesCircle: 'cities-circle'
    };

    this.argentinaBorder = {
      color: '#32323222',
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
      }
    };

    this.cityCircle = {
      radiusByZoom: {
        minZoom: 3,
        minRadius: 2,
        maxZoom: 7,
        maxRadius: 6
      },
      colors: {
        default: '#cccccc',
        visited: '#2a9d8f',
        selected: '#E88D00'
      },
      stroke: {
        width: 1,
        color: '#ffffff'
      }
    };
  }
}

const settings = new Settings();
export { settings as Settings };

