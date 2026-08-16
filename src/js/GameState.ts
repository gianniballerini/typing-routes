const GameState = {
    MENU: 'menu',
    COUNTDOWN: 'countdown',
    PLAYING: 'playing',
    PAUSED: 'paused'
} as const;

type GameStateType = (typeof GameState)[keyof typeof GameState];

// Every run goes through COUNTDOWN: the menu can no longer reach PLAYING
// directly, so the read-the-first-city beat can never be skipped by accident.
const ALLOWED_TRANSITIONS: Record<GameStateType, GameStateType[]> = {
    [GameState.MENU]: [GameState.COUNTDOWN],
    [GameState.COUNTDOWN]: [GameState.PLAYING, GameState.MENU],
    [GameState.PLAYING]: [GameState.PAUSED, GameState.MENU],
    [GameState.PAUSED]: [GameState.PLAYING, GameState.MENU]
};

export { GameState, ALLOWED_TRANSITIONS };
export type { GameStateType as GameStateValue };
