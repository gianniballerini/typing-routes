const ModalState = {
    NONE: 'none',
    ROUTE_COMPLETE: 'route-complete',
    HOW_TO_PLAY: 'how-to-play',
    ROUTE_LIST: 'route-list',
    ACHIEVEMENTS: 'achievements',
    SETTINGS: 'settings'
} as const;

type ModalStateType = (typeof ModalState)[keyof typeof ModalState];
type OpenModalStateType = Exclude<ModalStateType, typeof ModalState.NONE>;

export { ModalState };
export type { ModalStateType as ModalStateValue, OpenModalStateType as OpenModalStateValue };

