import { GameFlowCoordinator } from './app/GameFlowCoordinator';
import { UserStatsStorage } from './app/UserStatsStorage';
import { Game } from './Game';
import { KeyboardInputCoordinator } from './input/KeyboardInputCoordinator';
import { MapController } from './MapController';
import { MouseInfoCard } from './MouseInfoCard';
import { RoutesController } from './RoutesController';
import { GameUiPresenter } from './ui/GameUiPresenter';
import { ModalController } from './ui/ModalController';
import { UserStats } from './UserStats';

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
    modal_controller: ModalController;
    keyboard_input_coordinator: KeyboardInputCoordinator;
    game_flow_coordinator: GameFlowCoordinator;
    user_stats_storage: UserStatsStorage;
    user_stats: UserStats;

    constructor() {
        this.map_controller = new MapController();
        this.mouse_info_card = new MouseInfoCard();
        this.mouse_info_card.hide();
        this.map_controller.setMouseInfoCard(this.mouse_info_card);
        this.map_controller.init();
        this.routes_controller = new RoutesController();
        this.routes_controller.init();
        this.user_stats_storage = new UserStatsStorage();
        this.user_stats = this.user_stats_storage.load();
        this.applySavedUserProgress();
        this.map_controller.setRouteCityIdsMap(this.routes_controller.getRouteCityIdsMap());

        const fc = this.routes_controller.getRoutesFeatureCollection();
        this.map_controller.renderRoutes(fc);

        const citiesFc = this.routes_controller.getCitiesFeatureCollection();
        this.map_controller.renderCities(citiesFc);

        this.game = new Game(this.routes_controller, this.map_controller);
        this.ui_presenter = new GameUiPresenter();
        this.modal_controller = new ModalController();
        this.keyboard_input_coordinator = new KeyboardInputCoordinator(this.game);
        this.game_flow_coordinator = new GameFlowCoordinator(
            this.game,
            this.routes_controller,
            this.map_controller,
            this.ui_presenter,
            this.modal_controller,
            this.user_stats,
            this.user_stats_storage
        );

        this.game_flow_coordinator.init();
        this.keyboard_input_coordinator.bind();
    }

    private applySavedUserProgress(): void {
        for (const route of Object.values(this.routes_controller.routes)) {
            route.visited = this.user_stats.hasCompletedRoute(route.route_id);

            for (const city of route.cities) {
                city.visited = this.user_stats.hasCompletedCity(city.id);
            }
        }
    }
}

const app = new MainApplication();
window.app = app; // Expose the app object to the global window object for debugging purposes
