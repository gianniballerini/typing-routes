export type CarMarkerIconOptions = {
    /** Car length in CSS pixels; the icon points north (bearing 0). */
    length: number;
    bodyColor: string;
    roofColor: string;
    glassColor: string;
    lightColor: string;
    strokeColor: string;
    strokeWidth: number;
};

export type CarMarkerIcon = {
    width: number;
    height: number;
    data: Uint8ClampedArray;
    pixelRatio: number;
};

const MAX_PIXEL_RATIO = 3;

const getPixelRatio = (): number => {
    const ratio = typeof window !== 'undefined' ? window.devicePixelRatio : 1;
    if (!Number.isFinite(ratio) || ratio <= 0) return 1;
    return Math.min(Math.max(ratio, 1), MAX_PIXEL_RATIO);
};

const roundedRectPath = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
): void => {
    const r = Math.min(radius, width / 2, height / 2);

    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
};

const fillRoundedRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    color: string
): void => {
    roundedRectPath(ctx, x, y, width, height, radius);
    ctx.fillStyle = color;
    ctx.fill();
};

/**
 * Draws a top-down car sprite (front facing up) that MapLibre can consume through
 * `map.addImage`. Returns null when a 2D canvas context is unavailable.
 */
export const createCarMarkerIcon = (options: CarMarkerIconOptions): CarMarkerIcon | null => {
    const pixelRatio = getPixelRatio();

    const carLength = options.length;
    const carWidth = carLength * 0.52;
    const padding = options.strokeWidth + 2;

    const cssWidth = carWidth + padding * 2;
    const cssHeight = carLength + padding * 2;

    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(cssWidth * pixelRatio);
    canvas.height = Math.ceil(cssHeight * pixelRatio);

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.scale(pixelRatio, pixelRatio);

    // Body.
    roundedRectPath(ctx, padding, padding, carWidth, carLength, carWidth * 0.3);
    ctx.fillStyle = options.bodyColor;
    ctx.fill();
    if (options.strokeWidth > 0) {
        ctx.lineWidth = options.strokeWidth;
        ctx.strokeStyle = options.strokeColor;
        ctx.stroke();
    }

    // Headlights, at the front bumper.
    const lightWidth = carWidth * 0.22;
    const lightHeight = carLength * 0.05;
    const lightY = padding + carLength * 0.035;
    fillRoundedRect(ctx, padding + carWidth * 0.12, lightY, lightWidth, lightHeight, lightHeight / 2, options.lightColor);
    fillRoundedRect(
        ctx,
        padding + carWidth * 0.88 - lightWidth,
        lightY,
        lightWidth,
        lightHeight,
        lightHeight / 2,
        options.lightColor
    );

    // Roof, drawn before the windows so both glass panels sit on top of it.
    fillRoundedRect(
        ctx,
        padding + carWidth * 0.11,
        padding + carLength * 0.24,
        carWidth * 0.78,
        carLength * 0.5,
        carWidth * 0.16,
        options.roofColor
    );

    // Windshield and rear window.
    fillRoundedRect(
        ctx,
        padding + carWidth * 0.16,
        padding + carLength * 0.26,
        carWidth * 0.68,
        carLength * 0.14,
        carWidth * 0.1,
        options.glassColor
    );
    fillRoundedRect(
        ctx,
        padding + carWidth * 0.18,
        padding + carLength * 0.6,
        carWidth * 0.64,
        carLength * 0.12,
        carWidth * 0.1,
        options.glassColor
    );

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    return {
        width: imageData.width,
        height: imageData.height,
        data: imageData.data,
        pixelRatio
    };
};
