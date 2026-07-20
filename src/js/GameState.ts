const GameState = {
    MENU: 'menu',
    PLAYING: 'playing',
    PAUSED: 'paused'
} as const;

type GameStateType = (typeof GameState)[keyof typeof GameState];

const ALLOWED_TRANSITIONS: Record<GameStateType, GameStateType[]> = {
    [GameState.MENU]: [GameState.PLAYING],
    [GameState.PLAYING]: [GameState.PAUSED, GameState.MENU],
    [GameState.PAUSED]: [GameState.PLAYING, GameState.MENU]
};

export { GameState, ALLOWED_TRANSITIONS };
export type { GameStateType as GameStateValue };
