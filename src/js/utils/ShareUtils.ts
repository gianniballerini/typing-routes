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


export const elementToImage = (element: HTMLElement, format: 'png' | 'jpeg' | 'blob' | 'pixelData' | 'svg') => {
    switch (format) {
        case 'png':
            return toPng(element);
        case 'jpeg':
            return toJpeg(element);
        case 'blob':
            return toBlob(element);
        case 'pixelData':
            return toPixelData(element);
        case 'svg':
            return toSvg(element);
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

export const copyElementImageToClipboard = async (element: HTMLElement) => {
    try {
        const dataUrl = await elementToImage(element, 'png');
        if (typeof dataUrl === 'string') {
            await copyImageToClipboard(dataUrl);
        } else {
            throw new Error('Failed to convert element to image');
        }
    } catch (error) {
        console.error('Error copying element image to clipboard:', error);
    }
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
