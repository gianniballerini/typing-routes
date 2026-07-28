export interface SettingsShape {
  center: [number, number];
  initialZoom: number;
  minZoom: number;
  maxZoom: number;
  maxBounds: [[number, number], [number, number]];
  sourceIds: {
    openmaptiles: string;
    nationalRoutes: string;
    cities: string;
    progressMarker: string;
  };
  layerIds: {
    argentinaLimits: string;
    nationalRoutesLine: string;
    nationalRoutesHitbox: string;
    citiesCircle: string;
    citiesCircleHitbox: string;
    progressMarkerSquare: string;
  };
  argentinaBorder: {
    color: string;
    width: number;
  };
  routeLine: {
    colors: {
      default: string;
      visited: string;
      hovered: string;
      selected: string;
    };
    opacity: number;
    widthByZoom: {
      minZoom: number;
      minWidth: number;
      maxZoom: number;
      maxWidth: number;
    };
    hitWidthByZoom: {
      minZoom: number;
      minWidth: number;
      maxZoom: number;
      maxWidth: number;
    };
    hitboxDebug: {
      visible: boolean;
      color: string;
      opacity: number;
    };
  };
  cityCircle: {
    radiusByZoom: {
      minZoom: number;
      minRadius: number;
      maxZoom: number;
      maxRadius: number;
    };
    hitRadiusByZoom: {
      minZoom: number;
      minRadius: number;
      maxZoom: number;
      maxRadius: number;
    };
    hitboxDebug: {
      visible: boolean;
      color: string;
      opacity: number;
      strokeColor: string;
      strokeOpacity: number;
      strokeWidth: number;
    };
    colors: {
      default: string;
      visited: string;
      selected: string;
    };
    stroke: {
      width: number;
      color: string;
    };
  };
  routeSelection: {
    flyToZoom: number;
    veryShortRouteThresholdKm: number;
    veryShortRouteZoom: number;
  };
  progressMarker: {
    size: number;
    color: string;
    opacity: number;
    strokeColor: string;
    strokeWidth: number;
  };
}

export const Settings: SettingsShape;
