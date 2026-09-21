import { Settings } from '../Settings';
import { artworkRect, strokeCountryOutline, type CountryOutline } from './CountryOutline';
import type { MapCamera } from './MapCamera';
import { interpolateByZoom } from './MercatorProjection';

/**
 * Draws the sea: the open water and the shallows around the coast.
 *
 * It paints its own canvas, underneath the map's, so the shallows can breathe
 * without dragging the texture, routes and cities through a redraw every
 * frame. The map canvas is transparent wherever it does not paint, so the two
 * read as one picture.
 */
class SeaRenderer {
    private readonly canvas: HTMLCanvasElement;
    private readonly ctx: CanvasRenderingContext2D | null;
    private outline: CountryOutline | null;
    private pixelRatio: number;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        // Opaque: the sea is the backmost layer, so it always covers its box.
        // `$sea-deep` on `body` mirrors only its base colour, so nothing else
        // shows through before the first frame lands.
        this.ctx = canvas.getContext('2d', { alpha: false });
        this.outline = null;
        this.pixelRatio = 1;
    }

    setCountryOutline(outline: CountryOutline | null): void {
        this.outline = outline;
    }

    /** Same sizing as `MapRenderer.resize`, so both layers share one grid. */
    resize(): void {
        const rect = this.canvas.getBoundingClientRect();
        const width = Math.max(1, Math.round(rect.width));
        const height = Math.max(1, Math.round(rect.height));

        this.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        const deviceWidth = Math.round(width * this.pixelRatio);
        const deviceHeight = Math.round(height * this.pixelRatio);

        if (this.canvas.width !== deviceWidth || this.canvas.height !== deviceHeight) {
            this.canvas.width = deviceWidth;
            this.canvas.height = deviceHeight;
        }
    }

    /**
     * `animate` false draws the shallows at rest, exactly their `Settings`
     * widths — what reduced motion gets.
     */
    draw(camera: MapCamera, timeMs: number, animate: boolean): void {
        const ctx = this.ctx;
        if (!ctx) return;

        ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        // 1. Open sea.
        ctx.fillStyle = Settings.sea.baseColor;
        ctx.fillRect(0, 0, camera.width, camera.height);

        // 2. Shallows: the coastline stroked at decreasing widths, outermost
        // first, so each band paints over the middle of the one before it. The
        // country artwork on the map canvas then covers the inward half of all
        // of them, leaving only the halo outside the coast.
        if (!this.outline) return;

        const bandScale = interpolateByZoom(
            camera.zoom,
            Settings.sea.scaleByZoom.minZoom,
            Settings.sea.scaleByZoom.minScale,
            Settings.sea.scaleByZoom.maxZoom,
            Settings.sea.scaleByZoom.maxScale
        );
        const bands = Settings.sea.bands;
        const breathing = Settings.sea.breathing;
        const phase = (timeMs / breathing.periodMs) * 2 * Math.PI;

        strokeCountryOutline(
            ctx,
            this.outline,
            artworkRect(camera),
            bands.map((band, i) => {
                // The innermost band leads and each one further out lags one
                // `phaseStep` behind, so the swell travels away from the coast.
                const lag = (bands.length - 1 - i) * breathing.phaseStep;
                const swell = animate ? breathing.amplitude * Math.sin(phase - lag) : 0;
                // Doubled: a stroke straddles the line, and only the outward
                // half of it survives the artwork drawn on top.
                return band.width * bandScale * 2 * (1 + swell);
            }),
            bands.map((band) => band.color)
        );
    }
}

export { SeaRenderer };
