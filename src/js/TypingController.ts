class TypingController extends EventTarget {
    target: string;
    typed: string;
    active: boolean;

    constructor() {
        super();
        this.target = '';
        this.typed = '';
        this.active = false;
    }

    setTarget(text: string): void {
        this.target = text;
        this.typed = '';
        this.active = true;
        this.autoCompleteSpaces();
        this.dispatchEvent(new CustomEvent('target-set', { detail: { target: text } }));

        if (this.typed.length > 0) {
            this.dispatchEvent(new CustomEvent('progress', {
                detail: { typed: this.typed, target: this.target }
            }));
        }
    }

    handleInput(char: string): void {
        if (!this.active) return;

        const expectedChar = this.target[this.typed.length];
        const matchesExpected = char.toLocaleLowerCase() === expectedChar.toLocaleLowerCase();
        if (matchesExpected) {
            this.typed += expectedChar;
            this.autoCompleteSpaces();
            this.dispatchEvent(new CustomEvent('progress', {
                detail: { typed: this.typed, target: this.target }
            }));

            if (this.typed === this.target) {
                this.active = false;
                this.dispatchEvent(new CustomEvent('city-complete', { detail: { target: this.target } }));
            }
            return;
        }

        this.dispatchEvent(new CustomEvent('mistake', {
            detail: { expected: expectedChar, got: char, typed: this.typed }
        }));
    }

    reset(): void {
        this.typed = '';
        this.active = false;
    }

    private autoCompleteSpaces(): void {
        while (this.typed.length < this.target.length && this.target[this.typed.length] === ' ') {
            this.typed += ' ';
        }
    }
}

export { TypingController };
