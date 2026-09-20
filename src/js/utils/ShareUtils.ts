import { toBlob, toJpeg, toPixelData, toPng, toSvg } from 'html-to-image';

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

// The app is desktop-only, so there is no native share sheet to hand the image to:
// downloading it is the share.
export const shareElementAsImage = async (element: HTMLElement, filename: string) => {
    try {
        const dataUrl = await elementToImage(element, 'png');
        if (typeof dataUrl !== 'string') throw new Error('Failed to convert element to image');

        downloadImage(dataUrl, filename);
    } catch (error) {
        console.error('Error sharing element as image:', error);
    }
};
