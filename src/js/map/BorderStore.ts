import borderIndex from '../../assets/data/argentina_border.json';
import borderBinaryUrl from '../../assets/data/argentina_border.bin?url';

/**
 * Argentina's international boundary, pre-projected to Web Mercator world units.
 *
 * Replaces the `demotiles.maplibre.org` vector tileset the MapLibre version
 * filtered down to one country, so the map no longer reaches a third-party host
 * at runtime. Built by `data/build_border.py`.
 */

type BorderIndex = {
    quantMax: number;
    bbox: number[];
    parts: number[];
};

const INDEX = borderIndex as BorderIndex;

export const loadBorderBuffer = (): Promise<ArrayBuffer> =>
    fetch(borderBinaryUrl).then((response) => {
        if (!response.ok) throw new Error(`Border fetch failed: ${response.status}`);
        return response.arrayBuffer();
    });

/** Dequantizes into one Float64Array of interleaved x,y per boundary segment. */
export const decodeBorder = (buffer: ArrayBuffer): Float64Array[] => {
    const quantized = new Int16Array(buffer);
    const [minX, minY, maxX, maxY] = INDEX.bbox;
    const scaleX = (maxX - minX) / INDEX.quantMax;
    const scaleY = (maxY - minY) / INDEX.quantMax;

    const parts: Float64Array[] = [];
    let cursor = 0;

    for (const pointCount of INDEX.parts) {
        const part = new Float64Array(pointCount * 2);
        for (let i = 0; i < pointCount; i += 1) {
            part[i * 2] = minX + quantized[cursor * 2] * scaleX;
            part[i * 2 + 1] = minY + quantized[cursor * 2 + 1] * scaleY;
            cursor += 1;
        }
        parts.push(part);
    }

    return parts;
};
