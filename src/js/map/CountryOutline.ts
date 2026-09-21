import { Settings } from '../Settings';
import type { MapCamera } from './MapCamera';
import { projectLat, projectLon } from './MercatorProjection';

/**
 * The country's outline, taken from the artwork itself.
 *
 * Replaces `argentina_border.bin`, which held only the international land
 * boundaries: its Atlantic coastline was missing from the Rio de la Plata all
 * the way south, so anything drawn from it stopped at the water. The artwork's
 * path is the whole silhouette — mainland plus islands — and, because it is the
 * same path that fills the land the player sees, an outline drawn from it lines
 * up with the coast exactly rather than approximately.
 */

export type CountryOutline = {
    path: Path2D;
    /**
     * The path's own coordinate box. The artwork is drawn into a rectangle on
     * screen, and this is what maps path coordinates into that rectangle.
     */
    viewBox: { minX: number; minY: number; width: number; height: number };
};

const parseViewBox = (svg: SVGSVGElement): CountryOutline['viewBox'] | null => {
    const raw = svg.getAttribute('viewBox');
    if (raw) {
        const parts = raw.trim().split(/[\s,]+/).map(Number);
        if (parts.length === 4 && parts.every((value) => Number.isFinite(value))) {
            const [minX, minY, width, height] = parts;
            if (width > 0 && height > 0) return { minX, minY, width, height };
        }
    }

    // No viewBox: the path is already in the element's own pixel space.
    const width = parseFloat(svg.getAttribute('width') || '');
    const height = parseFloat(svg.getAttribute('height') || '');
    if (width > 0 && height > 0) return { minX: 0, minY: 0, width, height };

    return null;
};

/** Builds the outline from an SVG document's path data. */
export const parseCountryOutline = (source: string): CountryOutline | null => {
    const svg = new DOMParser()
        .parseFromString(source, 'image/svg+xml')
        .querySelector('svg');
    if (!svg) return null;

    const viewBox = parseViewBox(svg);
    if (!viewBox) return null;

    // Every path, so an artwork split into mainland and islands still comes
    // through whole. They are collected into one Path2D because the sea bands
    // stroke it in a single pass: one stroke is one composite, so the
    // translucent bands cannot double-blend where two subpaths touch.
    const path = new Path2D();
    let found = false;
    for (const element of Array.from(svg.querySelectorAll('path'))) {
        const d = element.getAttribute('d');
        if (!d) continue;
        path.addPath(new Path2D(d));
        found = true;
    }

    return found ? { path, viewBox } : null;
};

export const loadCountryOutline = (url: string): Promise<CountryOutline | null> =>
    fetch(url)
        .then((response) => {
            if (!response.ok) throw new Error(`Country outline fetch failed: ${response.status}`);
            return response.text();
        })
        // The same URL the texture image loads, so this is served from cache.
        .then(parseCountryOutline);

export type ArtworkRect = { left: number; top: number; width: number; height: number };

/**
 * The screen rectangle the artwork occupies.
 *
 * The artwork is stored in the same projection as the routes, so its bounding
 * box projects to an axis-aligned rectangle and a plain `drawImage` lands it
 * exactly — no warping, no offset. Everything drawn from the outline goes
 * through this same rectangle, so it tracks the artwork by construction.
 */
export const artworkRect = (camera: MapCamera): ArtworkRect => {
    const bounds = Settings.mapTexture.bounds;
    const left = camera.projectWorldX(projectLon(bounds.west));
    const right = camera.projectWorldX(projectLon(bounds.east));
    const top = camera.projectWorldY(projectLat(bounds.north));
    const bottom = camera.projectWorldY(projectLat(bounds.south));
    return { left, top, width: right - left, height: bottom - top };
};

/**
 * Strokes the outline, in screen pixels, over the rectangle the artwork
 * occupies — once per width/colour pair, in order.
 *
 * The outline is in the artwork's own coordinates, so it is drawn through a
 * transform onto the same rectangle `drawImage` uses for the texture. That
 * is what keeps outline and artwork together at every zoom: they are the
 * same path mapped through the same rectangle, not two sources that happen
 * to agree.
 *
 * `lineWidth` is divided by the scale because it is measured in the
 * transformed space. The two axis scales differ by about 0.04% — the
 * artwork's pixel box is a rounded version of its Mercator aspect — which
 * is far below a pixel of stroke, so the horizontal one stands for both.
 */
export const strokeCountryOutline = (
    ctx: CanvasRenderingContext2D,
    outline: CountryOutline,
    rect: ArtworkRect,
    widths: number[],
    colors: string[]
): void => {
    const scaleX = rect.width / outline.viewBox.width;
    const scaleY = rect.height / outline.viewBox.height;

    ctx.save();
    ctx.transform(
        scaleX,
        0,
        0,
        scaleY,
        rect.left - outline.viewBox.minX * scaleX,
        rect.top - outline.viewBox.minY * scaleY
    );
    for (let i = 0; i < widths.length; i += 1) {
        ctx.strokeStyle = colors[i];
        ctx.lineWidth = widths[i] / scaleX;
        ctx.stroke(outline.path);
    }
    ctx.restore();
};
