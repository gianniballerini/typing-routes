import { isDesktopExperienceSupported } from './DeviceSupport';
import { LoadingManager } from './LoadingManager';
import type { MainApplication } from './app/MainApplication';

declare global {
    interface Window {
        app: MainApplication;
    }
}

// Touch-only devices never boot the app: the desktop-only sign is painted by CSS alone
// (see `src/styles/common/_device_support.scss`), so there is no reason to construct the
// loading screen or pay for the download below just to tell someone to come back later.
if (isDesktopExperienceSupported()) {
    // This entry is deliberately tiny. `MainApplication` drags in MapLibre and the route
    // geometries (several MB of JSON), and while that is one static import graph the
    // browser has to fetch and parse *all* of it before a single frame of the intro can
    // run. Importing it dynamically keeps the entry chunk down to the loading screen, so
    // the title starts animating while the rest of the app is still downloading.
    const loading_manager = new LoadingManager();

    import('./app/MainApplication').then(({ MainApplication }) => {
        window.app = new MainApplication(loading_manager); // Exposed for debugging purposes
    });
}
