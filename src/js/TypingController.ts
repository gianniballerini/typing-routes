import { foldChar } from './utils/TextFolding';

interface LastInput {
    // `accepted`: the previous character advanced the target. `near-miss`: it was the
    // plain base letter of an accented expected one (strict mode only).
    kind: 'accepted' | 'near-miss';
    expected: string;
}

class TypingController extends EventTarget {
    target: string;
    typed: string;
    active: boolean;
    // Lenient (default): `n` and `ñ` both match `ñ`. Strict: only `ñ` does, and `n`
    // is reported as a `near-miss` (no progress, no mistake).
    strict: boolean;
    // Survives `setTarget` on purpose: the replacement of a plain letter that
    // completed a city arrives after the next city's target is already set.
    private lastInput: LastInput | null;

    constructor() {
        super();
        this.target = '';
        this.typed = '';
        this.active = false;
        this.strict = false;
        this.lastInput = null;
    }

    setStrict(strict: boolean): void {
        this.strict = strict;
    }

    setTarget(text: string): void {
        this.target = text;
        this.typed = '';
        this.active = true;
        this.dispatchEvent(new CustomEvent('target-set', { detail: { target: text } }));

        if (this.typed.length > 0) {
            this.dispatchEvent(new CustomEvent('progress', {
                detail: { typed: this.typed, target: this.target }
            }));
        }
    }

    handleInput(char: string): void {
        if (!this.active) return;
        // A lone combining mark (decomposed accent) is never a keystroke on its own.
        if (foldChar(char) === '') return;

        const expectedChar = this.target[this.typed.length];
        const exact = char.toLocaleLowerCase() === expectedChar.toLocaleLowerCase();
        const sameBaseLetter = foldChar(char) === foldChar(expectedChar);

        if (exact || (!this.strict && sameBaseLetter)) {
            this.lastInput = { kind: 'accepted', expected: expectedChar };
            this.typed += expectedChar;
            this.dispatchEvent(new CustomEvent('progress', {
                detail: { typed: this.typed, target: this.target }
            }));

            if (this.typed === this.target) {
                this.active = false;
                this.dispatchEvent(new CustomEvent('city-complete', { detail: { target: this.target } }));
            }
            return;
        }

        if (this.strict && sameBaseLetter) {
            this.lastInput = { kind: 'near-miss', expected: expectedChar };
            this.dispatchEvent(new CustomEvent('near-miss', {
                detail: { expected: expectedChar, got: char, typed: this.typed }
            }));
            return;
        }

        this.lastInput = null;
        this.dispatchEvent(new CustomEvent('mistake', {
            detail: { expected: expectedChar, got: char, typed: this.typed }
        }));
    }

    /**
     * A character that replaces the one just typed (macOS press-and-hold: the plain
     * `a` lands first, then the player picks `á`). The previous character was already
     * judged, so unless it was a strict-mode near miss this must not be judged again
     * against the next letter: if it folds to the same base letter as what was just
     * accepted, it is dropped. Otherwise it is an ordinary character.
     */
    handleReplacement(char: string): void {
        const last = this.lastInput;
        this.lastInput = null;

        if (last?.kind === 'accepted' && foldChar(char) === foldChar(last.expected)) return;

        this.handleInput(char);
    }

    reset(): void {
        this.typed = '';
        this.active = false;
        this.lastInput = null;
    }
}

export { TypingController };
