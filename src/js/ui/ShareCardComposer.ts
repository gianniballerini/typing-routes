import { copyElementImageToClipboard, shareElementAsImage } from '../utils/ShareUtils';
import { buildRatingLabel, formatAccuracy, formatElapsedTime, formatInteger, formatOneDecimal } from '../utils/StatFormatters';
import { renderStars } from './StarsView';

// Fixed on purpose rather than following `window.devicePixelRatio`: the whole
// point of the card is that the same run produces the same image, whoever
// copied it.
const CAPTURE_PIXEL_RATIO = 2;

// Ceiling on the wait for a layout frame. `requestAnimationFrame` is the right
// signal while the tab is on screen, but it never fires when the tab is hidden
// and is throttled hard in the background — without a timer to fall back on, a
// share started there would never settle and would latch the caller's in-flight
// guard for good.
const LAYOUT_FRAME_TIMEOUT_MS = 50;

// html-to-image rasterises through an <img> whose `decode()` never settles while
// the document is hidden. A share that gets backgrounded mid-capture would
// otherwise hang for good and take the caller's in-flight guard with it, leaving
// the share button dead until a reload. A real capture is well under a second.
const CAPTURE_TIMEOUT_MS = 15000;

/**
 * What the card needs to draw itself — deliberately its own shape rather than
 * the modal's payload, so the card and the results panel can diverge without
 * dragging each other along. The modal's payload is a superset, so the
 * coordinator can hand the same object to both.
 */
interface ShareCardPayload {
    routeTitle: string;
    stars: number;
    netWpm: number;
    accuracy: number;
    elapsedMs: number;
    combo: number;
    citiesTotal: number;
}

/**
 * `copied`  — it is on the clipboard, ready to paste.
 * `shared`  — the clipboard refused and we handed the image to the share/download
 *             path instead. Best effort: that path still reports nothing back.
 * `failed`  — nothing reached the player.
 */
type ShareCardResult = 'copied' | 'shared' | 'failed';

/**
 * Owns the off-screen share card: fills it from a finished run, turns it into a
 * PNG and puts that on the clipboard.
 *
 * The card it draws into is never shown to the player. It cannot be hidden with
 * `.hidden` either — that is `display: none`, and an element with no layout box
 * has nothing for html-to-image to measure or clone. `_share_card.scss` parks it
 * off-screen instead, fully laid out. See that file before changing how it hides.
 *
 * Reports what actually happened and shows nothing itself; the caller owns the
 * wording, so the message can never drift from the outcome.
 */
class ShareCardComposer {
    private cardEl: HTMLElement | null;
    private routeTitleEl: HTMLElement | null;
    private starsEl: HTMLElement | null;
    private ratingLabelEl: HTMLElement | null;
    private wpmEl: HTMLElement | null;
    private accuracyEl: HTMLElement | null;
    private elapsedEl: HTMLElement | null;
    private comboEl: HTMLElement | null;
    private citiesEl: HTMLElement | null;

    constructor() {
        this.cardEl = document.querySelector('.share-card');
        this.routeTitleEl = document.querySelector('.share-card__route-title');
        this.starsEl = document.querySelector('.share-card__stars');
        this.ratingLabelEl = document.querySelector('.share-card__rating-label');
        this.wpmEl = document.querySelector('.share-card__stat-value--wpm');
        this.accuracyEl = document.querySelector('.share-card__stat-value--accuracy');
        this.elapsedEl = document.querySelector('.share-card__stat-value--elapsed');
        this.comboEl = document.querySelector('.share-card__stat-value--combo');
        this.citiesEl = document.querySelector('.share-card__stat-value--cities');
    }

    async renderAndCopy(payload: ShareCardPayload): Promise<ShareCardResult> {
        if (!this.cardEl) return 'failed';

        this.render(payload);
        // The stars are rebuilt as fresh SVG nodes a line earlier; capturing in
        // the same tick can catch the card before the browser has laid them out.
        await this.waitForNextFrame();

        return this.capture(this.cardEl, payload.routeTitle);
    }

    render(payload: ShareCardPayload): void {
        if (this.routeTitleEl) this.routeTitleEl.textContent = payload.routeTitle || 'Ruta completada';

        // Never animated here: a staggered reveal would be captured mid-flight
        // and the image would go out with the wrong number of stars lit.
        renderStars(this.starsEl, payload.stars, { animate: false });
        if (this.ratingLabelEl) this.ratingLabelEl.textContent = buildRatingLabel(payload.stars);

        if (this.wpmEl) this.wpmEl.textContent = formatOneDecimal(payload.netWpm);
        if (this.accuracyEl) this.accuracyEl.textContent = formatAccuracy(payload.accuracy);
        if (this.elapsedEl) this.elapsedEl.textContent = formatElapsedTime(payload.elapsedMs);
        if (this.comboEl) this.comboEl.textContent = formatInteger(payload.combo);
        if (this.citiesEl) this.citiesEl.textContent = formatInteger(payload.citiesTotal);
    }

    private async capture(cardEl: HTMLElement, routeTitle: string): Promise<ShareCardResult> {
        try {
            await this.withTimeout(
                copyElementImageToClipboard(cardEl, { pixelRatio: CAPTURE_PIXEL_RATIO }),
                'Copying the share card'
            );
            return 'copied';
        } catch (error) {
            console.error('Could not copy the share card to the clipboard:', error);
        }

        // Fallback for the browsers where the clipboard refuses images: the card
        // gets downloaded instead. It still swallows its own errors, so `shared`
        // is best effort.
        try {
            await this.withTimeout(
                shareElementAsImage(cardEl, `TipeAndo - ${routeTitle}.png`),
                'Sharing the share card'
            );
            return 'shared';
        } catch (error) {
            console.error('Could not share the share card as an image:', error);
            return 'failed';
        }
    }

    private withTimeout<T>(work: Promise<T>, label: string): Promise<T> {
        return Promise.race([
            work,
            new Promise<T>((_resolve, reject) => {
                window.setTimeout(
                    () => reject(new Error(`${label} timed out after ${CAPTURE_TIMEOUT_MS}ms`)),
                    CAPTURE_TIMEOUT_MS
                );
            })
        ]);
    }

    private waitForNextFrame(): Promise<void> {
        return new Promise((resolve) => {
            let hasSettled = false;
            const settle = (): void => {
                if (hasSettled) return;
                hasSettled = true;
                resolve();
            };

            window.requestAnimationFrame(settle);
            window.setTimeout(settle, LAYOUT_FRAME_TIMEOUT_MS);
        });
    }
}

export { ShareCardComposer };
export type { ShareCardPayload, ShareCardResult };
