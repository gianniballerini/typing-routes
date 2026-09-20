// Tipeando is a typing game: without a physical keyboard there is no game to play.
// `(pointer: coarse) and (hover: none)` asks about the machine's input capability
// rather than its screen size, so a touchscreen laptop still boots the app and a
// narrow desktop window is never mistaken for a phone.
//
// The same condition lives in `src/styles/common/_device_support.scss`, which paints
// the desktop-only sign. Keep the two expressions in sync.
const UNSUPPORTED_DEVICE_QUERY = '(pointer: coarse) and (hover: none)';

const isDesktopExperienceSupported = (): boolean => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true;

    return !window.matchMedia(UNSUPPORTED_DEVICE_QUERY).matches;
};

export { isDesktopExperienceSupported };
