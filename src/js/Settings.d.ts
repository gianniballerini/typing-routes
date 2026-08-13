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
    progressMarkerIcon: string;
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
  runCountdown: {
    seconds: number;
    goLabel: string;
    goHoldMs: number;
  };
  progressMarker: {
    iconId: string;
    size: number;
    color: string;
    roofColor: string;
    glassColor: string;
    lightColor: string;
    opacity: number;
    strokeColor: string;
    strokeWidth: number;
    sizeByZoom: {
      minZoom: number;
      minSize: number;
      maxZoom: number;
      maxSize: number;
    };
  };
}

export const Settings: SettingsShape;
