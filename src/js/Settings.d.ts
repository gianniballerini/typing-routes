export interface SettingsShape {
  center: [number, number];
  initialZoom: number;
  minZoom: number;
  maxZoom: number;
  maxBounds: [[number, number], [number, number]];
  mapTexture: {
    src: string;
    bounds: { west: number; east: number; north: number; south: number };
    opacity: number;
  };
  argentinaBorder: {
    color: string;
    width: number;
  };
  routeLine: {
    colors: {
      default: string;
      visited: string;
      stars1: string;
      stars2: string;
      stars3: string;
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
    hoverRing: {
      color: string;
      strokeWidth: number;
      growthPx: number;
      minOpacity: number;
      maxOpacity: number;
      periodMs: number;
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
  starRating: {
    maxStars: number;
    accuracy: { full: number; half: number };
    mistakes: { full: number; half: number };
    netWpm: { full: number; half: number };
  };
  runCountdown: {
    soundName: string;
    beatsMs: number[];
    goAtMs: number;
    goLabel: string;
    goHoldMs: number;
    soundFadeOutMs: number;
  };
  progressMarker: {
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
  audio: {
    defaultMasterVolume: number;
    categoryVolumes: {
      music: number;
      sfx: number;
      keys: number;
    };
    volumeRampMs: number;
    key: {
      maxVoices: number;
      attackMs: number;
      releaseMs: number;
      virtualKeyDedupeMs: number;
      gainJitter: number;
    };
    ui: {
      clickKeycode: number;
      clickVolume: number;
      hoverKeycode: number;
      hoverVolume: number;
      hoverThrottleMs: number;
    };
    music: {
      menuTrack: string;
      fadeOutMs: number;
    };
  };
}

export const Settings: SettingsShape;
