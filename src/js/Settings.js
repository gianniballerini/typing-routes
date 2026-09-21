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

    // Background artwork for the country. The image is rendered in Web Mercator
    // at exactly these bounds (see data/build_map_texture_template.py), so it
    // aligns with the routes by construction — no offset to tune. An
    // equirectangular image would NOT line up: Mercator stretches latitude by
    // 1/cos(lat), and Argentina spans 35 degrees of it.
    this.mapTexture = {
      src: '/images/map/argentina_texture.svg',
      bounds: { west: -74.0, east: -53.0, north: -21.0, south: -56.0 },
      opacity: 1
    };

    // The opening framing, and the floor the camera may zoom out to. Shares the
    // texture's bbox on purpose: artwork and framing stay in lockstep, so the
    // country is fully on screen with no separate value to keep in sync.
    //
    // This is a *contain* fit, unlike `maxBounds`, which only limits panning.
    // Argentina is ~0.45 as wide as it is tall in Mercator, against a landscape
    // viewport of ~1.78, so fitting it whole leaves map either side of it — the
    // menu's left column and right info card sit in exactly that space.
    this.countryView = {
      bounds: { west: -74.0, east: -53.0, north: -21.0, south: -56.0 },
      // Breathing room around the fit, as a fraction of the shorter viewport axis.
      paddingRatio: 0.06
    };

    // Depth bands hugging the coastline, outermost first. Each one is the
    // country border stroked at a wider line width: the texture is drawn on top
    // afterwards and covers the inward half, so only an offset halo survives.
    // Lighter towards the shore, which is how a bathymetric map reads depth.
    //
    // `baseColor` is the open sea behind them, and the value that actually
    // paints. `$sea-deep` in `_colors.scss` mirrors it only so the page does not
    // flash a different colour before the first frame.
    this.sea = {
      baseColor: '#2B4A5C',
      bands: [
        { color: '#335768', width: 46 },
        { color: '#3D6579', width: 28 },
        { color: '#4A768B', width: 13 }
      ],
      // Band widths are screen pixels, so the halo does not grow with the
      // country. This ramp lets it gain a little weight when zoomed in without
      // following the land 1:1, which would swallow the map.
      scaleByZoom: {
        minZoom: 1,
        minScale: 1,
        maxZoom: 9,
        maxScale: 1.5
      },
      // Each band swells and settles around its width, the inner one first, so
      // the shallows read as a slow tide rolling out from the coast.
      // `amplitude` is a fraction of the width; kept low enough that no band
      // ever grows past the one outside it. `phaseStep` is the lag, in radians,
      // between neighbouring bands. The sea sits on its own canvas, and
      // `maxFps` caps how often it repaints: the swell is slow enough that
      // more frames buy nothing.
      breathing: {
        amplitude: 0.12,
        periodMs: 6000,
        phaseStep: 0.9,
        maxFps: 30
      }
    };

    // A flat, blurless offset shadow under the country, so the landmass reads
    // as a sticker lying on the water. Baked once from the texture's own alpha
    // (see `CountrySilhouette`), so its edge is exactly the coastline.
    this.countryShadow = {
      color: '#152833',
      opacity: 0.5,
      // Screen pixels: a fixed offset keeps the lift constant at every zoom.
      offsetX: 7,
      offsetY: 9,
      // Longest side of the baked silhouette. The texture is 2048x4526 and
      // `drawImage` already upscales it past this at high zoom, so a larger
      // bake buys nothing but memory.
      maxSize: 2048
    };

    // Warm and dark, to separate sand from sea. A near-white line was readable
    // while the country was a dark silhouette; on the sand it is not.
    this.argentinaBorder = {
      color: '#3A2A188C',
      width: 2
    };

    this.routeLine = {
      colors: {
        default: '#8a6948',
        // Completed with no stars earned yet.
        visited: '#9C6B1E',
        // Gold ramp by star rating (see Settings.starRating).
        stars1: '#C08415',
        stars2: '#E0A21B',
        stars3: '#F5C542',
        selected: '#1E5C8A'
      },
      // Pulsing outline around the hovered route, the line counterpart of
      // `cityCircle.hoverRing`. It traces the hit width, so it also shows the
      // real click area, and the route keeps its own colour underneath.
      hoverOutline: {
        color: '#E8761C',
        strokeWidth: 1.5,
        // How far past the hit width each side reaches at the pulse peak.
        growthPx: 3,
        minOpacity: 0.25,
        maxOpacity: 0.9,
        periodMs: 1100
      },
      // Dark outline stroked under every line. The country is sand (#dec6a5),
      // and nothing lighter than ~16% luminance reaches 3:1 against it — white
      // itself only manages 1.57:1. The casing gives each line its own
      // background to read against, so the gold star ramp can stay bright
      // instead of being darkened until it disappears into the land.
      casing: {
        color: '#3A2A18',
        // Added to the line width on each side.
        widthByZoom: {
          minZoom: 3,
          minWidth: 0.6,
          maxZoom: 7,
          maxWidth: 1.6
        }
      },
      // Opaque on purpose: a translucent line would let its own casing bleed
      // through and mud every colour above.
      opacity: 1,
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
      // The debug pane composites the pick buffer over the frame at this
      // opacity, so every hit target becomes visible at once.
      hitboxDebug: {
        visible: false,
        opacity: 0.45
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
      // Ring drawn around the hovered city. It sits at the same radius the
      // hitbox debug helper outlines, so hover feedback doubles as a hint of
      // the real click area.
      hoverRing: {
        // Reads against both the sand and the sea, unlike the white it replaces:
        // a coastal city puts this ring half on each.
        color: '#E8761C',
        strokeWidth: 1.5,
        // How far past the hitbox radius the ring reaches at the pulse peak.
        growthPx: 4,
        minOpacity: 0.25,
        maxOpacity: 0.85,
        periodMs: 1100
      },
      colors: {
        default: '#FFF7E8',
        // Same gold as a three-star route: a finished city reads as a reward.
        visited: '#F5C542',
        selected: '#C2410C'
      },
      // Completed cities are drawn as small medals: larger than a plain dot,
      // with a light centre so they stay distinct from the gold route ramp.
      visited: {
        radiusScale: 1.35,
        highlightColor: '#FFF7E8',
        highlightScale: 0.38
      },
      // Played once when a city is completed: the medal pops and a gold ring
      // ripples out from it.
      completionBurst: {
        durationMs: 750,
        popScale: 1.8,
        ringColor: '#F5C542',
        ringStrokeWidth: 2,
        ringGrowthPx: 16
      },
      // The dark ring is what makes a light city dot readable on the sand; it
      // is the city equivalent of the route casing above.
      stroke: {
        width: 1.5,
        color: '#3A2A18'
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

    // Warm-up beat before the clock starts, so the first city can be read. The
    // offsets are the beep onsets measured off `countdown.m4a`, so every digit
    // lands on its beep instead of on a round second — re-measure them if the
    // cue is ever re-cut.
    this.runCountdown = {
      soundName: 'countdown',
      beatsMs: [405, 1280, 2145],
      goAtMs: 3010,
      goLabel: '¡Ya!',
      // Holds '¡Ya!' while the cue's tail rings out (it ends at 4125ms).
      goHoldMs: 1115,
      // Short enough to read as a cut, long enough not to pop, for when the
      // player skips the countdown or abandons the run part-way through it.
      soundFadeOutMs: 100
    };

    this.progressMarker = {
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
        // A composed character emits no usable `code`, so the hidden input's
        // `input` event doubles as a trigger. Both fire for an ordinary keystroke;
        // anything this soon after a real keydown is that duplicate.
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

