// Hours-saved calculator shared by /por-que-tipear.html and /ensayo.html.
// Markup lives in `src/views/partials/hours_calculator.pug`.

function readNumber(id: string): number {
	const el = document.getElementById(id) as HTMLInputElement | null;
	return el ? Number.parseFloat(el.value) : Number.NaN;
}

function formatHours(hours: number): string {
	return `${hours.toLocaleString('es-AR', { maximumFractionDigits: 1 })} h`;
}

function computeHoursSaved(current: number, target: number, wordsPerDay: number, days: number): number | null {
	const valid = [current, target, wordsPerDay, days].every((value) => Number.isFinite(value) && value >= 0);
	if (!valid || current <= 0 || target <= 0 || target <= current) return null;

	const minutesSaved = wordsPerDay * days * (1 / current - 1 / target);
	return minutesSaved / 60;
}

/** Wires the calculator form; `onChange` receives the current and target ppm on every update. */
export function initHoursCalculator(onChange?: (current: number, target: number) => void): void {
	const resultEl = document.getElementById('calc-result');
	const formEl = document.getElementById('calc');
	if (!resultEl || !formEl) return;

	const update = (): void => {
		const current = readNumber('calc-current');
		const target = readNumber('calc-target');
		const hours = computeHoursSaved(current, target, readNumber('calc-words'), readNumber('calc-days'));

		resultEl.textContent = hours === null
			? 'Ingresá un objetivo mayor que tu velocidad actual'
			: formatHours(hours);

		onChange?.(current, target);
	};

	formEl.addEventListener('input', update);
	formEl.addEventListener('submit', (event) => event.preventDefault());
	update();
}
