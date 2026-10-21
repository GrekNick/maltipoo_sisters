// Things several scenes share: screen size, scene keys, the events GameScene sends to UIScene, text styles.
import type { CharacterKey } from '../characters';
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

/** Events UIScene emits on its own `events` emitter when on-screen buttons are tapped; GameScene listens. */
export const UIEvent = {
    /** Swap sisters (same as Q/Tab) */
    Swap: 'swap',
} as const;

export interface HudState {
    character: CharacterKey;
    seconds: number;
    falls: number;
    treats: number;
    totalTreats: number;
    x: number;
    y: number;
}

export interface FinishedState {
    seconds: number;
    falls: number;
    treats: number;
    totalTreats: number;
    best: BestTime | null;
}

/**
 * One font for all game text. Phaser's default (Courier) has no Cyrillic on many systems, so Ukrainian fell back to
 * a different font mid-word. These are installed everywhere and cover Latin, Polish and Cyrillic.
 * (A bundled pixel font is an option for the art pass, M7.)
 */
export const FONT_FAMILY = '"Trebuchet MS", "Segoe UI", Verdana, Arial, sans-serif';

export const TEXT_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
    fontFamily: FONT_FAMILY,
    fontSize: '16px',
    color: '#ffffff',
    stroke: '#2c3e50',
    strokeThickness: 3,
};
