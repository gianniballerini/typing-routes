const COMBINING_MARKS = /[̀-ͯ]/g;

/**
 * Reduces a character to its base letter: lowercase, accents and tildes
 * removed (`ñ` -> `n`, `Á` -> `a`, `ü` -> `u`).
 */
function foldChar(char: string): string {
    return char.normalize('NFD').replace(COMBINING_MARKS, '').toLocaleLowerCase();
}

export { foldChar };
