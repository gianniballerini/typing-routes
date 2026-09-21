/**
 * Flattens an already-loaded image to a single solid colour, keeping its alpha.
 *
 * Used for the country's drop shadow: the silhouette is baked from the map
 * texture itself, so its edge is exactly the coastline the player sees, with no
 * second copy of the outline to keep in step.
 *
 * Baked once into its own canvas rather than produced per frame with
 * `ctx.filter`, which would re-filter a multi-megapixel raster on every draw.
 */
export const createTintedSilhouette = (
    image: HTMLImageElement,
    color: string,
    maxSize: number
): HTMLCanvasElement | null => {
    const sourceWidth = image.naturalWidth || image.width;
    const sourceHeight = image.naturalHeight || image.height;
    if (sourceWidth <= 0 || sourceHeight <= 0) return null;

    // The shadow is a flat shape with no interior detail, and the renderer
    // already upscales the texture past this size at high zoom, so baking any
    // larger costs memory and buys nothing.
    const scale = Math.min(1, maxSize / Math.max(sourceWidth, sourceHeight));
    const width = Math.max(1, Math.round(sourceWidth * scale));
    const height = Math.max(1, Math.round(sourceHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(image, 0, 0, width, height);
    // `source-in` keeps the alpha that is already on the canvas and replaces its
    // colour, which is what turns the artwork into a solid silhouette.
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, height);

    return canvas;
};
