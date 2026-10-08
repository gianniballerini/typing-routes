import citiesData from '../../assets/data/cities.json';
import { TypingController } from '../TypingController';
import { bindTypingInput, renderTarget } from './typingInput';

const SVG_NS = 'http://www.w3.org/2000/svg';

// Consecutive stops of Ruta Nacional 3, in traversal order (ids from routes.json).
const SEGMENT_IDS = [
	'caba/buenos-aires',
	'buenos-aires/canuelas',
	'buenos-aires/san-miguel-del-monte',
	'buenos-aires/las-flores',
	'buenos-aires/azul',
];

type Stop = { name: string; typing: string };
type CityEntry = { id: string; name: string; typing: string };

function svgEl<K extends keyof SVGElementTagNameMap>(
	tag: K,
	attributes: Record<string, string | number>,
	text?: string
): SVGElementTagNameMap[K] {
	const el = document.createElementNS(SVG_NS, tag);
	for (const [name, value] of Object.entries(attributes)) el.setAttribute(name, String(value));
	if (text !== undefined) el.textContent = text;
	return el;
}

/** Type a short route segment, then recall the order of its stops. */
export class MiniRoute {
	private readonly typing = new TypingController();
	private readonly stops: Stop[];
	private readonly svg: SVGSVGElement;
	private readonly pathEl: SVGPathElement;
	private readonly markerEl: SVGCircleElement;
	private readonly statusEl: HTMLElement;
	private readonly targetEl: HTMLElement;
	private readonly inputEl: HTMLInputElement;
	private readonly typeBox: HTMLElement;
	private readonly recallBox: HTMLElement;
	private readonly chipsEl: HTMLElement;
	private readonly scoreEl: HTMLElement;

	private labelEls: SVGTextElement[] = [];
	private stopIndex = 0;
	private typedBefore = 0;
	private readonly totalChars: number;
	private answers: number[] = [];

	constructor(root: HTMLElement) {
		const byId = new Map((citiesData.cities as CityEntry[]).map((city) => [city.id, city]));
		this.stops = SEGMENT_IDS.map((id) => {
			const city = byId.get(id);
			if (!city) throw new Error(`MiniRoute: unknown city ${id}`);
			return { name: city.name, typing: city.name.normalize('NFC') };
		});
		this.totalChars = this.stops.reduce((sum, stop) => sum + stop.typing.length, 0);

		this.svg = root.querySelector('[data-role="svg"]') as SVGSVGElement;
		this.pathEl = this.svg.querySelector('[data-role="path"]') as SVGPathElement;
		this.statusEl = root.querySelector('[data-role="status"]') as HTMLElement;
		this.targetEl = root.querySelector('[data-role="target"]') as HTMLElement;
		this.inputEl = root.querySelector('[data-role="input"]') as HTMLInputElement;
		this.typeBox = root.querySelector('[data-role="type"]') as HTMLElement;
		this.recallBox = root.querySelector('[data-role="recall"]') as HTMLElement;
		this.chipsEl = root.querySelector('[data-role="chips"]') as HTMLElement;
		this.scoreEl = root.querySelector('[data-role="score"]') as HTMLElement;

		this.markerEl = svgEl('circle', { class: 'essay-route__marker', r: 7 });
		this.drawStops();

		bindTypingInput(this.inputEl, this.typing);
		this.typing.addEventListener('progress', this.handleProgress);
		this.typing.addEventListener('city-complete', this.handleCityComplete);
		root.querySelector('[data-role="reset"]')?.addEventListener('click', () => this.reset());

		this.reset();
	}

	private pointAt(fraction: number): DOMPoint {
		return this.pathEl.getPointAtLength(this.pathEl.getTotalLength() * Math.min(Math.max(fraction, 0), 1));
	}

	private drawStops(): void {
		const last = this.stops.length - 1;
		this.stops.forEach((stop, i) => {
			const point = this.pointAt(i / last);
			const above = i % 2 === 0;
			this.svg.append(svgEl('circle', { class: 'essay-route__dot', cx: point.x, cy: point.y, r: 5 }));
			const label = svgEl('text', {
				class: 'essay-route__label',
				x: point.x,
				y: point.y + (above ? -12 : 20),
				'text-anchor': 'middle',
			}, stop.name);
			this.labelEls.push(label);
			this.svg.append(label);
		});
		this.svg.append(this.markerEl);
	}

	private moveMarker(typedChars: number): void {
		const point = this.pointAt(typedChars / this.totalChars);
		this.markerEl.setAttribute('cx', String(point.x));
		this.markerEl.setAttribute('cy', String(point.y));
	}

	private readonly handleProgress = (): void => {
		renderTarget(this.targetEl, this.typing.target, this.typing.typed);
		this.moveMarker(this.typedBefore + this.typing.typed.length);
	};

	private readonly handleCityComplete = (): void => {
		this.typedBefore += this.typing.target.length;
		this.stopIndex += 1;
		if (this.stopIndex < this.stops.length) {
			this.loadStop();
		} else {
			this.startRecall();
		}
	};

	private loadStop(): void {
		const stop = this.stops[this.stopIndex];
		this.typing.setTarget(stop.typing);
		renderTarget(this.targetEl, stop.typing, '');
		this.statusEl.textContent = `Localidad ${this.stopIndex + 1} de ${this.stops.length}: tipeala para seguir por el camino.`;
	}

	private startRecall(): void {
		this.typeBox.hidden = true;
		this.recallBox.hidden = false;
		this.scoreEl.textContent = '';
		this.statusEl.textContent = 'Ahora sin mirar: tocá las localidades en el orden en que aparecen en el recorrido, de izquierda a derecha.';
		this.labelEls.forEach((label) => {
			label.textContent = '?';
			label.classList.remove('essay-route__label--right', 'essay-route__label--wrong');
		});

		this.answers = [];
		const order = this.stops.map((_, i) => i);
		for (let i = order.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[order[i], order[j]] = [order[j], order[i]];
		}

		this.chipsEl.replaceChildren();
		for (const stopIdx of order) {
			const chip = document.createElement('button');
			chip.type = 'button';
			chip.className = 'essay-widget__chip';
			chip.textContent = this.stops[stopIdx].name;
			chip.addEventListener('click', () => this.pickChip(chip, stopIdx));
			this.chipsEl.append(chip);
		}
	}

	private pickChip(chip: HTMLButtonElement, stopIdx: number): void {
		const slot = this.answers.length;
		this.answers.push(stopIdx);
		chip.disabled = true;

		const label = this.labelEls[slot];
		label.textContent = this.stops[stopIdx].name;
		label.classList.add(stopIdx === slot ? 'essay-route__label--right' : 'essay-route__label--wrong');

		if (this.answers.length === this.stops.length) {
			const correct = this.answers.filter((answer, i) => answer === i).length;
			this.scoreEl.textContent = `Acertaste ${correct} de ${this.stops.length}.`;
			this.statusEl.textContent = 'Esto es una prueba de recuperación en miniatura: repetirla es lo que fija el orden.';
		}
	}

	private reset(): void {
		this.stopIndex = 0;
		this.typedBefore = 0;
		this.answers = [];
		this.typeBox.hidden = false;
		this.recallBox.hidden = true;
		this.labelEls.forEach((label, i) => {
			label.textContent = this.stops[i].name;
			label.classList.remove('essay-route__label--right', 'essay-route__label--wrong');
		});
		this.moveMarker(0);
		this.inputEl.value = '';
		this.loadStop();
	}
}
