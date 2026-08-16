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
        // Completed with no stars earned yet.
        visited: '#FFB81C',
        // Gold ramp by star rating (see Settings.starRating).
        stars1: '#E8A317',
        stars2: '#FFC93C',
        stars3: '#FFE27A',
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

    // Three axes, one star each, awarded in half-star steps: a route is worth
    // 0 to 3 stars. Scored against the stored best record, never a single run.
    this.starRating = {
      maxStars: 3,
      accuracy: { full: 100, half: 97 },
      mistakes: { full: 0, half: 2 },
      netWpm: { full: 50, half: 30 }
    };

    // Warm-up beat before the clock starts, so the first city can be read.
    this.runCountdown = {
      seconds: 3,
      goLabel: '¡Ya!',
      goHoldMs: 600
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

    this.audio = {
      // Applied on top of each sound's own volume, then persisted per user.
      defaultMasterVolume: 0.8,
      categoryVolumes: {
        music: 1,
        sfx: 1,
        keys: 0.6
      },
      // Ramped rather than switched so mute and volume changes never click.
      volumeRampMs: 30,
      key: {
        // Fast typists overlap voices; past this the graph is doing more harm
        // than the extra layer adds, so the oldest voice is stopped.
        maxVoices: 12,
        // Envelope around each sprite slice, so its cut edges do not pop.
        attackMs: 4,
        releaseMs: 10,
        // Mobile virtual keyboards emit no usable `code`, so the hidden input's
        // `input` event doubles as a trigger. On desktop both fire for the same
        // keystroke; anything this soon after a real keydown is that duplicate.
        virtualKeyDedupeMs: 40,
        // Slight per-press variation, so a repeated key does not sound looped.
        gainJitter: 0.08
      },
      ui: {
        // Mechvibes keycodes into the UI sprite (see KeycodeMap). 28 is Enter — a
        // solid thunk that reads as "button"; 30 is 'A', light enough for hover.
        clickKeycode: 28,
        clickVolume: 1,
        hoverKeycode: 30,
        hoverVolume: 0.3,
        // Sweeping the pointer across the route grid crosses a tile every few
        // milliseconds; below this the hover click becomes a rattle.
        hoverThrottleMs: 40
      },
      music: {
        // Name of the manifest entry played over the menu.
        menuTrack: 'menu-music',
        // Long enough to duck under the countdown rather than cut on the "3".
        fadeOutMs: 400
      }
    };
  }
}

const settings = new Settings();
export { settings as Settings };

