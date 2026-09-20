import { loadRouteGeometryBuffer } from './data/RouteGeometryStore';
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
    // This entry is deliberately tiny. `MainApplication` drags in MapLibre, and while
    // that is one static import graph the browser has to fetch and parse *all* of it
    // before a single frame of the intro can run. Importing it dynamically keeps the
    // entry chunk down to the loading screen, so the title starts animating while the
    // rest of the app is still downloading.
    const loading_manager = new LoadingManager();

    // Kicked off here rather than inside `MainApplication` so the geometry blob
    // downloads *alongside* the app chunk instead of after it. Both are on the
    // critical path and neither depends on the other.
    const route_geometry = loadRouteGeometryBuffer();

    void Promise.all([
        import('./app/MainApplication'),
        route_geometry,
    ]).then(([{ MainApplication }, geometry_buffer]) => {
        window.app = new MainApplication(loading_manager, geometry_buffer); // Exposed for debugging purposes
    });
}
