// Entry for /por-que-tipear.html. Standalone: it must not import the game, so
// the page stays light.

import { initHoursCalculator } from './hoursCalculator';

const SVG_NS = 'http://www.w3.org/2000/svg';

const CHART_WIDTH = 320;
const CHART_HEIGHT = 190;
const PLOT_LEFT = 34;
const PLOT_RIGHT = 306;
const PLOT_TOP = 16;
const PLOT_BOTTOM = 158;
const CURVE_WEEKS = 12;
// How quickly the illustrative curve flattens out; purely cosmetic.
const CURVE_DECAY_WEEKS = 3.5;

function svgEl<K extends keyof SVGElementTagNameMap>(
	tag: K,
	attributes: Record<string, string | number>,
	text?: string
): SVGElementTagNameMap[K] {
	const el = document.createElementNS(SVG_NS, tag);
	for (const [name, value] of Object.entries(attributes)) {
		el.setAttribute(name, String(value));
	}
	if (text !== undefined) el.textContent = text;
	return el;
}

function renderCurve(svg: SVGSVGElement, current: number, target: number): void {
	// Keep the <title>/<desc> the markup ships with, redraw the rest.
	for (const child of Array.from(svg.children)) {
		if (child.tagName !== 'title' && child.tagName !== 'desc') child.remove();
	}

	const low = Number.isFinite(current) && current > 0 ? current : 0;
	const high = Number.isFinite(target) && target > low ? target : low;
	const yMax = Math.max(high, 1) * 1.1;

	const x = (week: number) => PLOT_LEFT + (week / CURVE_WEEKS) * (PLOT_RIGHT - PLOT_LEFT);
	const y = (ppm: number) => PLOT_BOTTOM - (ppm / yMax) * (PLOT_BOTTOM - PLOT_TOP);

	svg.setAttribute('viewBox', `0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`);

	svg.append(
		svgEl('line', { class: 'chart__axis', x1: PLOT_LEFT, y1: PLOT_BOTTOM, x2: PLOT_RIGHT, y2: PLOT_BOTTOM }),
		svgEl('line', { class: 'chart__axis', x1: PLOT_LEFT, y1: PLOT_TOP, x2: PLOT_LEFT, y2: PLOT_BOTTOM })
	);

	for (const week of [0, 4, 8, 12]) {
		svg.append(svgEl('text', { class: 'chart__tick', x: x(week), y: PLOT_BOTTOM + 16, 'text-anchor': 'middle' }, String(week)));
	}
	svg.append(svgEl('text', { class: 'chart__tick', x: (PLOT_LEFT + PLOT_RIGHT) / 2, y: PLOT_BOTTOM + 31, 'text-anchor': 'middle' }, 'Semanas de práctica'));
	svg.append(svgEl('text', { class: 'chart__tick', x: PLOT_LEFT - 6, y: y(low) + 4, 'text-anchor': 'end' }, String(Math.round(low))));
	if (high > low) {
		svg.append(svgEl('text', { class: 'chart__tick', x: PLOT_LEFT - 6, y: y(high) + 4, 'text-anchor': 'end' }, String(Math.round(high))));
	}

	const points: string[] = [];
	for (let week = 0; week <= CURVE_WEEKS; week += 0.5) {
		const progress = 1 - Math.exp(-week / CURVE_DECAY_WEEKS);
		const ppm = low + (high - low) * progress;
		points.push(`${week === 0 ? 'M' : 'L'}${x(week).toFixed(1)} ${y(ppm).toFixed(1)}`);
	}

	svg.append(
		svgEl('path', { class: 'chart__line', d: points.join(' ') }),
		svgEl('circle', { class: 'chart__dot', cx: x(0), cy: y(low), r: 4 }),
		svgEl('circle', { class: 'chart__dot', cx: x(CURVE_WEEKS), cy: y(high - (high - low) * Math.exp(-CURVE_WEEKS / CURVE_DECAY_WEEKS)), r: 4 })
	);
}

function init(): void {
	const curveEl = document.getElementById('curve') as SVGSVGElement | null;

	initHoursCalculator((current, target) => {
		if (curveEl) renderCurve(curveEl, current, target);
	});
}

init();
