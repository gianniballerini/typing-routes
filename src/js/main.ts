import { Game } from './Game';
import { MapController } from './MapController';
import { MouseInfoCard } from './MouseInfoCard';
import { RoutesController } from './RoutesController';
import { GameFlowCoordinator } from './app/GameFlowCoordinator';
import { KeyboardInputCoordinator } from './input/KeyboardInputCoordinator';
import { GameUiPresenter } from './ui/GameUiPresenter';

declare global {
    interface Window {
        app: MainApplication;
    }
}

class MainApplication {
    map_controller: MapController;
    mouse_info_card: MouseInfoCard;
    routes_controller: RoutesController;
    game: Game;
    ui_presenter: GameUiPresenter;
    keyboard_input_coordinator: KeyboardInputCoordinator;
    game_flow_coordinator: GameFlowCoordinator;

    constructor() {
        this.map_controller = new MapController();
        this.mouse_info_card = new MouseInfoCard();
        this.mouse_info_card.hide();
        this.map_controller.setMouseInfoCard(this.mouse_info_card);
        this.map_controller.init();
        this.routes_controller = new RoutesController();
        this.routes_controller.init();
        this.map_controller.setRouteCityIdsMap(this.routes_controller.getRouteCityIdsMap());

        const fc = this.routes_controller.getRoutesFeatureCollection();
        this.map_controller.renderRoutes(fc);

        const citiesFc = this.routes_controller.getCitiesFeatureCollection();
        this.map_controller.renderCities(citiesFc);

        this.game = new Game(this.routes_controller, this.map_controller);
        this.ui_presenter = new GameUiPresenter();
        this.keyboard_input_coordinator = new KeyboardInputCoordinator(this.game);
        this.game_flow_coordinator = new GameFlowCoordinator(
            this.game,
            this.routes_controller,
            this.map_controller,
            this.ui_presenter
        );

        this.game_flow_coordinator.init();
        this.keyboard_input_coordinator.bind();
    }
}

const app = new MainApplication();
window.app = app; // Expose the app object to the global window object for debugging purposes
