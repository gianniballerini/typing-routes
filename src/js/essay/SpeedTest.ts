import citiesData from '../../assets/data/cities.json';
import { TypingController } from '../TypingController';
import { bindTypingInput, formatNumber, renderTarget, wordsPerMinute } from './typingInput';

const DURATION_MS = 30000;
const SCALE_MAX = 140;
const MAX_NAME_LENGTH = 16;

type CityEntry = { name: string; typing: string; kind?: string };

/** City names as displayed (accented, NFC), shuffled. */
function pickCityNames(): string[] {
	const names = (citiesData.cities as CityEntry[])
		.filter((city) => !city.kind && city.typing.length <= MAX_NAME_LENGTH)
		.map((city) => city.name.normalize('NFC'));

	for (let i = names.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[names[i], names[j]] = [names[j], names[i]];
	}
	return names;
}

/**
 * 30-second typing test over city names. Reuses TypingController so matching
 * is identical to the game (case-insensitive, accents optional).
 * Nothing is stored or sent.
 */
export class SpeedTest {
	private readonly typing = new TypingController();
	private readonly statusEl: HTMLElement;
	private readonly targetEl: HTMLElement;
	private readonly inputEl: HTMLInputElement;
	private readonly resultEl: HTMLElement;
	private readonly wpmEl: HTMLElement;
	private readonly accuracyEl: HTMLElement;
	private readonly markerEl: HTMLElement;

	private names: string[] = [];
	private nameIndex = 0;
	private completedChars = 0;
	private mistakes = 0;
	private startedAt: number | null = null;
	private timerId: number | null = null;

	constructor(root: HTMLElement) {
		this.statusEl = root.querySelector('[data-role="status"]') as HTMLElement;
		this.targetEl = root.querySelector('[data-role="target"]') as HTMLElement;
		this.inputEl = root.querySelector('[data-role="input"]') as HTMLInputElement;
		this.resultEl = root.querySelector('[data-role="result"]') as HTMLElement;
		this.wpmEl = root.querySelector('[data-role="wpm"]') as HTMLElement;
		this.accuracyEl = root.querySelector('[data-role="accuracy"]') as HTMLElement;
		this.markerEl = root.querySelector('[data-role="marker"]') as HTMLElement;

		// Registered first so the clock starts before the keystroke is matched.
		this.inputEl.addEventListener('input', () => this.start());
		bindTypingInput(this.inputEl, this.typing);
		this.typing.addEventListener('progress', () => renderTarget(this.targetEl, this.typing.target, this.typing.typed));
		this.typing.addEventListener('mistake', () => { this.mistakes += 1; });
		this.typing.addEventListener('city-complete', this.handleCityComplete);
		root.querySelector('[data-role="reset"]')?.addEventListener('click', () => this.reset());

		this.reset();
	}

	private readonly handleCityComplete = (): void => {
		this.completedChars += this.typing.target.length;
		this.nextName();
	};

	private nextName(): void {
		const name = this.names[this.nameIndex % this.names.length];
		this.nameIndex += 1;
		this.typing.setTarget(name);
		renderTarget(this.targetEl, name, '');
	}

	private start(): void {
		if (this.startedAt !== null || this.timerId !== null) return;
		this.startedAt = performance.now();
		this.timerId = window.setInterval(() => this.tick(), 100);
	}

	private tick(): void {
		if (this.startedAt === null) return;
		const remaining = DURATION_MS - (performance.now() - this.startedAt);
		if (remaining <= 0) {
			this.finish();
			return;
		}
		this.statusEl.textContent = `Quedan ${Math.ceil(remaining / 1000)} s`;
	}

	private finish(): void {
		if (this.timerId !== null) window.clearInterval(this.timerId);
		this.timerId = null;
		this.typing.reset();
		this.inputEl.disabled = true;

		const correct = this.completedChars + this.typing.typed.length;
		const attempts = correct + this.mistakes;
		const wpm = wordsPerMinute(correct, DURATION_MS);
		const accuracy = attempts === 0 ? 0 : (correct / attempts) * 100;

		this.statusEl.textContent = 'Se acabó el tiempo.';
		this.wpmEl.textContent = `${formatNumber(wpm, 0)} ppm`;
		this.accuracyEl.textContent = `${formatNumber(accuracy, 0)} %`;
		this.markerEl.style.left = `${Math.min(wpm / SCALE_MAX, 1) * 100}%`;
		this.resultEl.hidden = false;
	}

	private reset(): void {
		if (this.timerId !== null) window.clearInterval(this.timerId);
		this.timerId = null;
		this.startedAt = null;
		this.completedChars = 0;
		this.mistakes = 0;
		this.nameIndex = 0;
		this.names = pickCityNames();
		this.resultEl.hidden = true;
		this.inputEl.disabled = false;
		this.inputEl.value = '';
		this.statusEl.textContent = 'Empezá a tipear: el reloj arranca con la primera tecla (30 s).';
		this.nextName();
	}
}
