import { toStarSlots } from '../utils/StarRating';
import type { StarSlot } from '../utils/StarRating';

interface RenderStarsOptions {
    // Staggered pop-in, used by the route-complete reveal.
    animate?: boolean;
    // Label for screen readers; defaults to "{n} de {max} estrellas".
    label?: string;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
const STAR_PATH = 'M12 2.6l2.9 5.88 6.49.95-4.7 4.58 1.11 6.46L12 17.42l-5.8 3.05 1.1-6.46-4.69-4.58 6.49-.95L12 2.6z';

/**
 * Fills a container with one star element per slot. Every star surface (picker
 * tiles, menu card, route-complete modal) goes through here so half stars and
 * markup stay identical across the app.
 *
 * `stars === null` means the route was never completed: all slots render empty.
 */
function renderStars(containerEl: HTMLElement | null, stars: number | null, options: RenderStarsOptions = {}): void {
    if (!containerEl) return;

    const slots = toStarSlots(stars);

    containerEl.textContent = '';
    containerEl.classList.toggle('stars--animate', Boolean(options.animate));
    containerEl.classList.toggle('stars--empty', stars === null || stars === 0);
    containerEl.setAttribute('role', 'img');
    containerEl.setAttribute('aria-label', options.label ?? buildStarsLabel(stars, slots.length));

    for (const [index, slot] of slots.entries()) {
        containerEl.appendChild(buildStarElement(slot, index));
    }
}

function buildStarsLabel(stars: number | null, maxStars: number): string {
    if (stars === null) return 'Sin jugar';
    return `${formatStarCount(stars)} de ${maxStars} estrellas`;
}

function formatStarCount(stars: number): string {
    return Number.isInteger(stars) ? `${stars}` : stars.toFixed(1).replace('.', ',');
}

function buildStarElement(slot: StarSlot, index: number): HTMLElement {
    const starEl = document.createElement('span');
    starEl.className = `stars__star stars__star--${slot}`;
    // Drives the stagger in _stars.scss without a per-index rule.
    starEl.style.setProperty('--star-index', `${index}`);

    starEl.appendChild(buildStarSvg('stars__star-shape'));

    const fillEl = document.createElement('span');
    fillEl.className = 'stars__star-fill';
    fillEl.appendChild(buildStarSvg('stars__star-shape'));
    starEl.appendChild(fillEl);

    return starEl;
}

function buildStarSvg(className: string): SVGSVGElement {
    const svgEl = document.createElementNS(SVG_NS, 'svg');
    svgEl.setAttribute('class', className);
    svgEl.setAttribute('viewBox', '0 0 24 24');
    svgEl.setAttribute('aria-hidden', 'true');
    svgEl.setAttribute('focusable', 'false');

    const pathEl = document.createElementNS(SVG_NS, 'path');
    pathEl.setAttribute('d', STAR_PATH);
    svgEl.appendChild(pathEl);

    return svgEl;
}

export { renderStars };
export type { RenderStarsOptions };
