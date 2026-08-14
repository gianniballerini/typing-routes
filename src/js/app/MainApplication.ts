import { DebugPaneController } from './DebugPaneController';
import { GameFlowCoordinator } from './GameFlowCoordinator';
import { UserStatsStorage } from './UserStatsStorage';
import { Game } from '../Game';
import { KeyboardInputCoordinator } from '../input/KeyboardInputCoordinator';
import { LoadingManager } from '../LoadingManager';
import { MapController } from '../MapController';
import { MouseInfoCard } from '../MouseInfoCard';
import { RoutesController } from '../RoutesController';
import { GameUiPresenter } from '../ui/GameUiPresenter';
import { ModalController } from '../ui/ModalController';
import { UserStats } from '../UserStats';
import { calculateStarRating } from '../utils/StarRating';

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
    private readonly loading_manager: LoadingManager;

    // The loading screen is built by the entry module long before this class finishes
    // downloading, so the manager is handed in rather than constructed here.
    constructor(loading_manager: LoadingManager) {
        this.loading_manager = loading_manager;
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
        this.loading_manager.setProgress(25);
        this.map_controller.setRouteCityIdsMap(this.routes_controller.getRouteCityIdsMap());
        this.map_controller.setCityRoutesMap(this.routes_controller.getCityRoutesMap());

        const fc = this.routes_controller.getRoutesFeatureCollection();
        this.map_controller.renderRoutes(fc);

        const citiesFc = this.routes_controller.getCitiesFeatureCollection();
        this.map_controller.renderCities(citiesFc);

        this.game = new Game(this.routes_controller, this.map_controller);
        this.ui_presenter = new GameUiPresenter();
        this.modal_controller = new ModalController();
        this.game_flow_coordinator = new GameFlowCoordinator(
            this.game,
            this.routes_controller,
            this.map_controller,
            this.ui_presenter,
            this.modal_controller,
            this.user_stats,
            this.user_stats_storage
        );
        this.keyboard_input_coordinator = new KeyboardInputCoordinator(
            this.game,
            () => this.game_flow_coordinator.quitActiveRun(),
            () => this.game_flow_coordinator.skipCountdown()
        );

        this.game_flow_coordinator.init();
        this.keyboard_input_coordinator.bind();

        // The menu sits behind the loading screen at this point, so the signs are
        // parked out of sight now and only dropped once the loader has lifted —
        // parking any later and they would flash in their slots first.
        this.ui_presenter.prepareMenuSignsDrop();
        this.loading_manager.onFinished(() => this.ui_presenter.playMenuSignsDropAnimation());

        if (import.meta.env.DEV) {
            new DebugPaneController(this.map_controller).init();
        }

        this.loading_manager.setProgress(60);

        this.map_controller.onReady(() => {
            this.loading_manager.complete();
        });
    }

    private applySavedUserProgress(): void {
        for (const route of Object.values(this.routes_controller.routes)) {
            route.visited = this.user_stats.hasCompletedRoute(route.route_id);
            route.stars = calculateStarRating(
                this.user_stats.getRouteRecord(route.route_id),
                route.visited
            )?.stars ?? 0;

            for (const city of route.cities) {
                city.visited = this.user_stats.hasCompletedCity(city.id);
            }
        }
    }
}

export { MainApplication };
