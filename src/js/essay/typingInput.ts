import { bindTextInput } from '../input/TextInputForwarder';
import { TypingController } from '../TypingController';

/**
 * Forwards what lands in a real <input> to a TypingController, one character at
 * a time, and clears the field. Same approach (and same composition/replacement
 * handling) as the game's hidden typing input.
 */
export function bindTypingInput(input: HTMLInputElement, controller: TypingController): void {
	bindTextInput(input, {
		onText: (text) => { for (const char of text) controller.handleInput(char); },
		onReplacement: (text) => { for (const char of text) controller.handleReplacement(char); },
	});
}

/** Draws `target` into `el`, marking the typed prefix and the next character. */
export function renderTarget(el: HTMLElement, target: string, typed: string): void {
	el.replaceChildren();
	for (let i = 0; i < target.length; i++) {
		const span = document.createElement('span');
		span.textContent = target[i];
		if (i < typed.length) span.className = 'essay-target__done';
		else if (i === typed.length) span.className = 'essay-target__current';
		el.append(span);
	}
}

/** Words per minute using the usual convention of 5 characters per word. */
export function wordsPerMinute(characters: number, elapsedMs: number): number {
	if (elapsedMs <= 0) return 0;
	return (characters / 5) / (elapsedMs / 60000);
}

export function formatNumber(value: number, digits = 0): string {
	return value.toLocaleString('es-AR', { maximumFractionDigits: digits, minimumFractionDigits: digits });
}
