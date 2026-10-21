// Settings, saved in the browser. Sound arrives with roadmap M5.3 (audio).
// Opened from the title screen, or from the pause menu (then without the language row: language is only changed on
// the title screen, not in the middle of a level).
import Phaser from 'phaser';
import { getLanguage, languageName, LANGUAGES, setLanguage, t } from '../i18n';
import { loadSettings, resetProgress, saveLanguage, saveSettings, type Settings } from '../persistence';
import { TOUCH_CONTROLS_SETTINGS } from '../input/touch';
import { Menu, type MenuItem } from '../ui/Menu';
import { addBackdrop, addGroundStrip } from './art';
import { FONT_FAMILY, SceneKey, SKY_COLOR, TEXT_STYLE, VIEW } from './shared';

const GROUND_Y = 520;

/** Data passed to scene.launch(SceneKey.Settings, …) */
export interface SettingsSceneData {
    /** The sleeping scene to wake on Back; without it, Back starts the title screen */
    returnTo?: typeof SceneKey.Pause;
    /** Show the "really reset progress?" question instead of the settings */
    confirmReset?: boolean;
    /** Show a short "progress reset" note */
    resetDone?: boolean;
}

export class SettingsScene extends Phaser.Scene {
    private settings!: Settings;
    private returnTo: SettingsSceneData['returnTo'];
    private confirmReset = false;
    private resetDone = false;

    constructor() {
        super(SceneKey.Settings);
    }

    /** Runs before create() on every start; restart() (after a language change) keeps the same data */
    init(data: SettingsSceneData = {}) {
        this.returnTo = data.returnTo;
        this.confirmReset = data.confirmReset ?? false;
        this.resetDone = data.resetDone ?? false;
    }

    create() {
        this.settings = loadSettings();
        this.cameras.main.setBackgroundColor(SKY_COLOR);
        addBackdrop(this, VIEW.width, GROUND_Y);
        addGroundStrip(this, 0, GROUND_Y, VIEW.width);

        this.add.text(VIEW.width / 2, 90, t('settings.title'), {
            fontFamily: FONT_FAMILY, fontSize: '48px', fontStyle: 'bold', color: '#ffe082', stroke: '#5d3a1a', strokeThickness: 8,
        }).setOrigin(0.5);

        if (this.confirmReset) return this.createResetQuestion();
        if (this.resetDone) {
            this.add.text(VIEW.width / 2, 145, t('settings.resetDone'), { ...TEXT_STYLE, fontSize: '18px', color: '#ffe082' }).setOrigin(0.5);
        }

        const back = () => {
            if (!this.returnTo) return this.scene.start(SceneKey.Title);
            this.scene.wake(this.returnTo);
            this.scene.stop();
        };
        const items: MenuItem[] = [
            {
                label: this.hitboxLabel(),
                onSelect: () => {
                    this.settings = { ...this.settings, showHitboxes: !this.settings.showHitboxes };
                    saveSettings(this.settings);
                    menu.setLabel(0, this.hitboxLabel());
                },
            },
            {
                label: this.touchLabel(),
                onSelect: () => {
                    const index = TOUCH_CONTROLS_SETTINGS.indexOf(this.settings.touchControls);
                    const touchControls = TOUCH_CONTROLS_SETTINGS[(index + 1) % TOUCH_CONTROLS_SETTINGS.length] ?? 'auto';
                    this.settings = { ...this.settings, touchControls };
                    saveSettings(this.settings);
                    menu.setLabel(1, this.touchLabel());
                },
            },
            { label: t('settings.sound'), enabled: false },
            // Language and reset only from the title screen, not in the middle of a level
            ...(this.returnTo ? [] : [
                { label: t('settings.language', { language: languageName(getLanguage()) }), onSelect: () => this.nextLanguage() },
                { label: t('settings.reset'), onSelect: () => this.scene.restart({ confirmReset: true } satisfies SettingsSceneData) },
            ]),
            { label: t('menu.back'), onSelect: back },
        ];
        const menu = new Menu(this, VIEW.width / 2, 190, items, 420);

        this.input.keyboard?.on('keydown-ESC', back);
        this.add.text(VIEW.width / 2, 580, t('settings.hint'), { ...TEXT_STYLE, fontSize: '14px' }).setOrigin(0.5);
    }

    /** "Delete all best times and treats?" with No focused first, so a quick double press doesn't wipe progress */
    private createResetQuestion() {
        const backToSettings = () => this.scene.restart({} satisfies SettingsSceneData);
        this.add.text(VIEW.width / 2, 200, t('settings.resetQuestion'), {
            ...TEXT_STYLE, fontSize: '24px', align: 'center', wordWrap: { width: 560 },
        }).setOrigin(0.5);
        new Menu(this, VIEW.width / 2, 290, [
            { label: t('settings.resetNo'), onSelect: backToSettings },
            {
                label: t('settings.resetYes'),
                onSelect: () => {
                    resetProgress();
                    this.scene.restart({ resetDone: true } satisfies SettingsSceneData);
                },
            },
        ], 320);
        this.input.keyboard?.on('keydown-ESC', backToSettings);
    }

    /** "On-screen controls: Auto / On / Off" */
    private touchLabel(): string {
        const state = { auto: t('settings.auto'), on: t('settings.on'), off: t('settings.off') }[this.settings.touchControls];
        return t('settings.touch', { state });
    }

    private hitboxLabel(): string {
        return t('settings.hitboxes', { state: t(this.settings.showHitboxes ? 'settings.on' : 'settings.off') });
    }

    /** Cycles English → Українська → Polski, saves it, and rebuilds this screen in the new language. */
    private nextLanguage() {
        const index = LANGUAGES.findIndex(l => l.code === getLanguage());
        const next = LANGUAGES[(index + 1) % LANGUAGES.length]?.code ?? 'en';
        setLanguage(next);
        saveLanguage(next);
        this.scene.restart({ returnTo: this.returnTo } satisfies SettingsSceneData);
    }
}
