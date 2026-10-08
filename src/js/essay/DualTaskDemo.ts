import { TypingController } from '../TypingController';
import { bindTypingInput, formatNumber, renderTarget, wordsPerMinute } from './typingInput';

// Has a tilde on purpose: like the game, accents are accepted but optional.
const PHRASE = 'las rutas unen pueblos de norte a sur del país';

const ROUND_LABELS = [
	'Ronda 1: tipeá normalmente',
	'Ronda 2: tipeá contando en voz alta de 100 hacia atrás de a 3',
];

/** Types one phrase twice (plain, then while counting backwards) and compares speeds. */
export class DualTaskDemo {
	private readonly typing = new TypingController();
	private readonly roundEl: HTMLElement;
	private readonly targetEl: HTMLElement;
	private readonly inputEl: HTMLInputElement;
	private readonly resultEls: HTMLElement[];
	private readonly resultsEl: HTMLElement;

	private round = 0;
	private startedAt: number | null = null;
	private readonly speeds: number[] = [];

	constructor(root: HTMLElement) {
		this.roundEl = root.querySelector('[data-role="round"]') as HTMLElement;
		this.targetEl = root.querySelector('[data-role="target"]') as HTMLElement;
		this.inputEl = root.querySelector('[data-role="input"]') as HTMLInputElement;
		this.resultsEl = root.querySelector('[data-role="results"]') as HTMLElement;
		this.resultEls = Array.from(root.querySelectorAll<HTMLElement>('[data-role="result"]'));

		// Registered first so the clock starts before the keystroke is matched.
		this.inputEl.addEventListener('input', () => this.markStarted());
		bindTypingInput(this.inputEl, this.typing);
		this.typing.addEventListener('progress', () => renderTarget(this.targetEl, PHRASE, this.typing.typed));
		this.typing.addEventListener('city-complete', this.handleRoundComplete);
		root.querySelector('[data-role="reset"]')?.addEventListener('click', () => this.reset());

		this.reset();
	}

	private markStarted(): void {
		if (this.startedAt === null) this.startedAt = performance.now();
	}

	private readonly handleRoundComplete = (): void => {
		const elapsed = performance.now() - (this.startedAt ?? performance.now());
		this.speeds.push(wordsPerMinute(PHRASE.length, elapsed));
		this.renderResults();

		this.round += 1;
		this.startedAt = null;
		if (this.round < ROUND_LABELS.length) {
			this.startRound();
		} else {
			this.roundEl.textContent = 'Listo. Mirá las dos velocidades:';
			this.inputEl.disabled = true;
		}
	};

	private startRound(): void {
		this.roundEl.textContent = ROUND_LABELS[this.round];
		this.typing.setTarget(PHRASE);
		renderTarget(this.targetEl, PHRASE, '');
		this.inputEl.value = '';
		this.inputEl.disabled = false;
	}

	private renderResults(): void {
		this.resultsEl.hidden = this.speeds.length === 0;
		this.resultEls.forEach((el, i) => {
			const value = el.querySelector('[data-role="value"]') as HTMLElement;
			value.textContent = i < this.speeds.length ? `${formatNumber(this.speeds[i], 0)} ppm` : '–';
		});
	}

	private reset(): void {
		this.round = 0;
		this.startedAt = null;
		this.speeds.length = 0;
		this.renderResults();
		this.startRound();
	}
}
