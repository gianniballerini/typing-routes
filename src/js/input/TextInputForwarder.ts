interface TextInputCallbacks {
    /** Text the player typed (already NFC-normalized). */
    onText: (text: string) => void;
    /** Text that replaces the character just typed (macOS press-and-hold). */
    onReplacement: (text: string) => void;
}

// Safari fires `compositionend` before the trailing non-composing `input` that
// repeats the same text; Chrome only sends the composing one. Anything identical
// arriving this soon after `compositionend` is that duplicate.
const DUPLICATE_WINDOW_MS = 80;

/**
 * Forwards what lands in a (hidden) text <input> to callbacks and keeps the field
 * empty. Handles IME and dead-key composition (`´` + vowel, Option+N + N) and
 * replacement input, which a plain `input.value` read gets wrong:
 *
 * - composing `input` events are ignored and the field is left alone, so the
 *   composition isn't torn down mid-way;
 * - `compositionend` forwards the composed text once and clears the field;
 * - a same-text `input` right after `compositionend` is dropped (Safari order);
 * - `insertReplacementText` goes to `onReplacement` instead of `onText`.
 */
function bindTextInput(input: HTMLInputElement, callbacks: TextInputCallbacks): void {
    let lastComposedText = '';
    let lastComposedAt = -Infinity;

    const clear = (): void => {
        input.value = '';
    };

    input.addEventListener('compositionend', (event) => {
        const text = (event.data ?? '').normalize('NFC');
        clear();
        if (!text) return;

        lastComposedText = text;
        lastComposedAt = performance.now();
        callbacks.onText(text);
    });

    input.addEventListener('input', (event) => {
        const inputEvent = event as InputEvent;
        if (inputEvent.isComposing || inputEvent.inputType === 'insertCompositionText') return;

        const raw = typeof inputEvent.data === 'string' && inputEvent.data.length > 0
            ? inputEvent.data
            : input.value;
        const text = raw.normalize('NFC');
        clear();
        if (!text) return;

        if (text === lastComposedText && performance.now() - lastComposedAt < DUPLICATE_WINDOW_MS) {
            lastComposedText = '';
            return;
        }

        if (inputEvent.inputType === 'insertReplacementText') callbacks.onReplacement(text);
        else callbacks.onText(text);
    });
}

export { bindTextInput };
export type { TextInputCallbacks };
