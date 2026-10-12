// Things several scenes share: screen size, scene keys, the events GameScene sends to UIScene, text styles.
import type { BestTime } from '../persistence';

export const VIEW = { width: 800, height: 600 } as const;
export const TILE = 32;
export const SKY_COLOR = '#87ceeb';

/** Scenes are started by key, like routes. */
export const SceneKey = {
    Preload: 'Preload',
    Title: 'Title',
    Settings: 'Settings',
    Game: 'Game',
    UI: 'UI',
} as const;

/** Events GameScene emits on its own `events` emitter; UIScene listens and draws the HUD. */
export const GameEvent = {
    /** Every frame while playing */
    Hud: 'hud',
    /** Once, when the dog reaches the goal */
    Finished: 'finished',
} as const;

export interface HudState {
    characterName: string;
    seconds: number;
    falls: number;
    x: number;
    y: number;
}

export interface FinishedState {
    seconds: number;
    falls: number;
    best: BestTime | null;
}

export const TEXT_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
    fontSize: '16px',
    color: '#ffffff',
    stroke: '#2c3e50',
    strokeThickness: 3,
};
