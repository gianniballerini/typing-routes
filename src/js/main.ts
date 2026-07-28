import { LoadingManager } from './LoadingManager';
import type { MainApplication } from './app/MainApplication';

declare global {
    interface Window {
        app: MainApplication;
    }
}

// This entry is deliberately tiny. `MainApplication` drags in MapLibre and the route
// geometries (several MB of JSON), and while that is one static import graph the
// browser has to fetch and parse *all* of it before a single frame of the intro can
// run. Importing it dynamically keeps the entry chunk down to the loading screen, so
// the title starts animating while the rest of the app is still downloading.
const loading_manager = new LoadingManager();

import('./app/MainApplication').then(({ MainApplication }) => {
    window.app = new MainApplication(loading_manager); // Exposed for debugging purposes
});
