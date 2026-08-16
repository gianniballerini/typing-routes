import { DebugPaneController } from './DebugPaneController';
import { GameFlowCoordinator } from './GameFlowCoordinator';
import { UserStatsStorage } from './UserStatsStorage';
import soundManifest from '../../assets/data/sounds.json';
import { Achievements } from '../achievements/Achievements';
import { AchievementsStorage } from '../achievements/AchievementsStorage';
import { AudioManager } from '../audio/AudioManager';
import { AudioPreferencesStorage } from '../audio/AudioPreferencesStorage';
import type { SoundManifest } from '../audio/types';
import { UiSoundController } from '../audio/UiSoundController';
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
    achievements_storage: AchievementsStorage;
    achievements: Achievements;
    audio_preferences_storage: AudioPreferencesStorage;
    audio_manager: AudioManager;
    ui_sound_controller: UiSoundController;
    private readonly loading_manager: LoadingManager;

    // The loading screen is built by the entry module long before this class finishes
    // downloading, so the manager is handed in rather than constructed here.
    constructor(loading_manager: LoadingManager) {
        this.loading_manager = loading_manager;

        // Kicked off first: the keyboard sprite is a couple of MB and its
        // download runs alongside the map tiles rather than after them.
        this.audio_preferences_storage = new AudioPreferencesStorage();
        this.audio_manager = new AudioManager(this.audio_preferences_storage);
        const audio_loading = this.audio_manager.load(soundManifest as SoundManifest);
        this.audio_manager.bindKeyboardSounds();
        this.ui_sound_controller = new UiSoundController(this.audio_manager);
        this.ui_sound_controller.init();
        this.loading_manager.onStartGesture(() => {
            this.audio_manager.unlock();
            // The start CTA is a click like any other, and the menu music has no
            // earlier legal moment to begin.
            this.audio_manager.playUiClick();
            this.audio_manager.playMusic();
        });

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
        this.achievements_storage = new AchievementsStorage();
        this.achievements = this.achievements_storage.load();
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
        this.ui_presenter.setModalOpenPredicate(() => this.modal_controller.isOpen());
        this.game_flow_coordinator = new GameFlowCoordinator({
            game: this.game,
            routes_controller: this.routes_controller,
            map_controller: this.map_controller,
            ui_presenter: this.ui_presenter,
            modal_controller: this.modal_controller,
            user_stats: this.user_stats,
            user_stats_storage: this.user_stats_storage,
            achievements: this.achievements,
            achievements_storage: this.achievements_storage,
            audio_manager: this.audio_manager,
        });
        this.keyboard_input_coordinator = new KeyboardInputCoordinator(
            this.game,
            () => this.game_flow_coordinator.quitActiveRun(),
            () => this.game_flow_coordinator.skipCountdown()
        );

        // Silent by construction: nothing is subscribed to the unlock event until
        // `init()` runs, so a saved game catches up without a wall of toasts.
        this.game_flow_coordinator.catchUpAchievements();

        this.game_flow_coordinator.init();
        this.keyboard_input_coordinator.bind();

        // The menu sits behind the loading screen at this point, so the signs are
        // parked out of sight now and only dropped once the loader has lifted —
        // parking any later and they would flash in their slots first.
        this.ui_presenter.prepareMenuSignsDrop();
        this.loading_manager.onFinished(() => this.ui_presenter.playMenuSignsDropAnimation());

        if (import.meta.env.DEV) {
            new DebugPaneController(
                this.map_controller,
                this.audio_manager,
                this.achievements_storage,
                this.user_stats_storage
            ).init();
        }

        this.loading_manager.setProgress(60);

        // The counter is coarse on purpose: each `setProgress` kills the previous
        // 1.2s tween, so a step per byte would only stutter.
        const map_ready = new Promise<void>((resolve) => this.map_controller.onReady(() => resolve()));
        void map_ready.then(() => this.loading_manager.setProgress(80));

        // `blocking` never rejects, so a missing or undecodable sprite cannot
        // wedge the loading screen.
        void Promise.all([map_ready, audio_loading.blocking]).then(() => {
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
