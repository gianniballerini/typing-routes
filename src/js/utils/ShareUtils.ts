import { toBlob, toJpeg, toPixelData, toPng, toSvg } from 'html-to-image';

const SHARE_DESCRIPTION = 'Juego de mecanografia con rutas nacionales argentinas. https://tipeando.com.ar';
const SHARE_URL = 'https://tipeando.com.ar';

const isMobileDevice = (): boolean => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
        return false;
    }

    const hasCoarsePointer = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
    const mobileUserAgent = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    return hasCoarsePointer || mobileUserAgent;
};

export const shouldUseNativeShare = (): boolean => {
    return isMobileDevice() && typeof navigator.share === 'function';
};


// Taken off `toPng` rather than imported from a deep `html-to-image/lib` path, so
// the option shape follows whatever version of the library is installed.
type ElementToImageOptions = Parameters<typeof toPng>[1];

export const elementToImage = (
    element: HTMLElement,
    format: 'png' | 'jpeg' | 'blob' | 'pixelData' | 'svg',
    options?: ElementToImageOptions
) => {
    switch (format) {
        case 'png':
            return toPng(element, options);
        case 'jpeg':
            return toJpeg(element, options);
        case 'blob':
            return toBlob(element, options);
        case 'pixelData':
            return toPixelData(element, options);
        case 'svg':
            return toSvg(element, options);
        default:
            throw new Error('Unsupported format');
    }
};

export const downloadImage = (dataUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};


export const copyImageToClipboard = async (dataUrl: string) => {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const item = new ClipboardItem({ [blob.type]: blob });
    await navigator.clipboard.write([item]);
};

// Throws on failure on purpose. Swallowing the error here used to make the
// caller's fallback unreachable and let it report a successful copy that never
// happened — the caller is the only one that can tell the player the truth.
export const copyElementImageToClipboard = async (
    element: HTMLElement,
    options?: ElementToImageOptions
): Promise<void> => {
    const dataUrl = await elementToImage(element, 'png', options);
    if (typeof dataUrl !== 'string') throw new Error('Failed to convert element to image');

    await copyImageToClipboard(dataUrl);
};

export const shareImage = async (dataUrl: string, filename: string) => {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const file = new File([blob], filename, { type: blob.type });

    if (shouldUseNativeShare()) {
        try {
            if (!navigator.canShare || navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    text: SHARE_DESCRIPTION,
                    url: SHARE_URL
                });
                return;
            }
        } catch (error) {
            console.error('Error sharing:', error);
        }
    }

    downloadImage(dataUrl, filename);
}

export const shareElementAsImage = async (element: HTMLElement, filename: string) => {
    try {
        const dataUrl = await elementToImage(element, 'png');
        if (typeof dataUrl === 'string') {
            await shareImage(dataUrl, filename);
        } else {
            throw new Error('Failed to convert element to image');
        }
    } catch (error) {
        console.error('Error sharing element as image:', error);
    }
};
