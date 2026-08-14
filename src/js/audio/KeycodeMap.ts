// Mechvibes packs key their sprite regions by iohook keycodes, which are Windows
// scancode set 1 values (extended keys carry the `0xE0` prefix folded into the
// number, hence the 36xx / 574xx blocks). The browser gives us
// `KeyboardEvent.code` instead, so every physical key needs a translation here.
//
// `code` is layout-independent: on a Spanish keyboard the `ñ` key still reports
// `Semicolon`, so positional key sounds stay correct without a layout table.
const CODE_TO_KEYCODE: Record<string, number> = {
    Escape: 1,

    Digit1: 2, Digit2: 3, Digit3: 4, Digit4: 5, Digit5: 6,
    Digit6: 7, Digit7: 8, Digit8: 9, Digit9: 10, Digit0: 11,
    Minus: 12, Equal: 13, Backspace: 14, Tab: 15,

    KeyQ: 16, KeyW: 17, KeyE: 18, KeyR: 19, KeyT: 20, KeyY: 21,
    KeyU: 22, KeyI: 23, KeyO: 24, KeyP: 25,
    BracketLeft: 26, BracketRight: 27, Enter: 28, ControlLeft: 29,

    KeyA: 30, KeyS: 31, KeyD: 32, KeyF: 33, KeyG: 34, KeyH: 35,
    KeyJ: 36, KeyK: 37, KeyL: 38,
    Semicolon: 39, Quote: 40, Backquote: 41, ShiftLeft: 42, Backslash: 43,

    KeyZ: 44, KeyX: 45, KeyC: 46, KeyV: 47, KeyB: 48, KeyN: 49, KeyM: 50,
    Comma: 51, Period: 52, Slash: 53, ShiftRight: 54,

    NumpadMultiply: 55, AltLeft: 56, Space: 57, CapsLock: 58,

    F1: 59, F2: 60, F3: 61, F4: 62, F5: 63,
    F6: 64, F7: 65, F8: 66, F9: 67, F10: 68,
    NumLock: 69, ScrollLock: 70,

    Numpad7: 71, Numpad8: 72, Numpad9: 73, NumpadSubtract: 74,
    Numpad4: 75, Numpad5: 76, Numpad6: 77, NumpadAdd: 78,
    Numpad1: 79, Numpad2: 80, Numpad3: 81, Numpad0: 82, NumpadDecimal: 83,

    // The ISO extra key next to the left shift; absent from ANSI boards.
    IntlBackslash: 86,
    F11: 87, F12: 88,

    // Extended keys: `0x0E00 + scancode`.
    NumpadEnter: 3612, ControlRight: 3613, NumpadDivide: 3637, PrintScreen: 3639,
    AltRight: 3640, Pause: 3653,
    Home: 3655, PageUp: 3657, End: 3663, PageDown: 3665,
    Insert: 3666, Delete: 3667,
    MetaLeft: 3675, MetaRight: 3676, ContextMenu: 3677,

    // Arrows use the other extended encoding this pack ships, `0xE000 + scancode`.
    ArrowUp: 57416, ArrowLeft: 57419, ArrowRight: 57421, ArrowDown: 57424,
};

// Used when a key has no mapping, and for mobile virtual keyboards, which report
// `Unidentified` with no usable `code`. The home row keeps the fallback sounding
// like ordinary typing rather than a modifier thunk.
const FALLBACK_KEYCODES: number[] = [30, 31, 32, 33, 34, 35, 36, 37, 38];

function keycodeForEventCode(code: string): number | null {
    if (!code) return null;
    const keycode = CODE_TO_KEYCODE[code];
    return keycode === undefined ? null : keycode;
}

function randomFallbackKeycode(): number {
    const index = Math.floor(Math.random() * FALLBACK_KEYCODES.length);
    return FALLBACK_KEYCODES[index];
}

export { CODE_TO_KEYCODE, FALLBACK_KEYCODES, keycodeForEventCode, randomFallbackKeycode };
