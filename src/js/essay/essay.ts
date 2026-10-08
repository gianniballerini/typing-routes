// Entry for /ensayo.html. Standalone: it must not import the game.
// It only reuses the game's input pieces (TypingController, the text input
// forwarder) and the city catalog.

import '@fontsource-variable/inter/index.css';
import '@fontsource-variable/source-serif-4/index.css';
import '@fontsource-variable/source-serif-4/wght-italic.css';
import { initHoursCalculator } from '../info/hoursCalculator';
import { DualTaskDemo } from './DualTaskDemo';
import { MiniRoute } from './MiniRoute';
import { SpeedTest } from './SpeedTest';

function mount(id: string, create: (root: HTMLElement) => unknown): void {
	const root = document.getElementById(id);
	if (root) create(root);
}

mount('dual-task', (root) => new DualTaskDemo(root));
mount('speed-test', (root) => new SpeedTest(root));
mount('mini-route', (root) => new MiniRoute(root));
initHoursCalculator();
