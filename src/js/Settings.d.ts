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
  };
  layerIds: {
    argentinaLimits: string;
    nationalRoutesLine: string;
    citiesCircle: string;
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
  };
  cityCircle: {
    radiusByZoom: {
      minZoom: number;
      minRadius: number;
      maxZoom: number;
      maxRadius: number;
    };
    colors: {
      default: string;
      visited: string;
    };
    stroke: {
      width: number;
      color: string;
    };
  };
}

export const Settings: SettingsShape;
