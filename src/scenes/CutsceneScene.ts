// Plays a cutscene script (src/cutscenes/, design in docs/cutscenes.md): actors on a backdrop, speech bubbles that
// type in, full-screen panels. A tap (or Enter/Space) finishes what's happening, or goes on when a line is fully
// shown; Skip (or Esc) ends the scene. Afterwards it's remembered as seen, and the scene it was started for runs.
import Phaser from 'phaser';
import { CHARACTERS, type CharacterKey } from '../characters';
import { CUTSCENES, type CutsceneId } from '../cutscenes';
import type { ActorId, BackdropId, Beat, Facing, PanelId } from '../cutscenes/types';
import { t } from '../i18n';
import { markCutsceneSeen } from '../persistence';
import { addBackdrop, addGroundStrip } from './art';
import { FONT_FAMILY, SceneKey, SKY_COLOR, TEXT_STYLE, VIEW } from './shared';

type SceneKeyValue = (typeof SceneKey)[keyof typeof SceneKey];

/** Data passed to scene.start(SceneKey.Cutscene, …) */
export interface CutsceneSceneData {
    id: CutsceneId;
    /** Where to go when the scene ends or is skipped */
    then: { key: SceneKeyValue; data?: object };
}

/** Feet line of the actors */
const FLOOR_Y = 470;
/** Typewriter speed: one letter every 25 ms = 40 per second */
const LETTER_MS = 25;
const SPEED = { walk: 130, run: 260 } as const; // px/s
const BUBBLE = { maxWidth: 340, padding: 14, gapAboveHead: 8 } as const;

function isCharacter(actor: ActorId): actor is CharacterKey {
    return Object.hasOwn(CHARACTERS, actor);
}

/** Animation keys per pose: the sisters walk with `move` and have no talking pose */
function animationKey(actor: ActorId, pose: 'idle' | 'walk' | 'talk'): string {
    if (isCharacter(actor)) return `${actor}_${pose === 'walk' ? 'move' : 'idle'}`;
    return `${actor}_${pose}`;
}

export class CutsceneScene extends Phaser.Scene {
    private id: CutsceneId = 'intro';
    private then: CutsceneSceneData['then'] = { key: SceneKey.Map };
    private beats: readonly Beat[] = [];
    private index = -1;
    private ended = false;
    private actors = new Map<ActorId, Phaser.GameObjects.Sprite>();
    /** Each finishes one running action at once (a tap while text types or someone walks) */
    private finishers: Array<() => void> = [];
    /** The current beat is done and waits for a tap (a line was shown) */
    private awaitingTap = false;
    private bubble!: Phaser.GameObjects.Container;
    private panel!: Phaser.GameObjects.Container;
    private continueHint!: Phaser.GameObjects.Text;

    constructor() {
        super(SceneKey.Cutscene);
    }

    /** Runs before create() on every start; fields survive restarts, so reset them here */
    init(data: CutsceneSceneData) {
        this.id = data.id;
        this.then = data.then;
        this.beats = CUTSCENES[data.id].beats;
        this.index = -1;
        this.ended = false;
        this.actors = new Map();
        this.finishers = [];
        this.awaitingTap = false;
    }

    create() {
        const script = CUTSCENES[this.id];
        this.drawBackdrop(script.backdrop);
        for (const [actor, stage] of Object.entries(script.actors) as Array<[ActorId, { x: number; face?: Facing }]>) {
            const sprite = this.add.sprite(stage.x, FLOOR_Y, actor, 0).setOrigin(0.5, 1).play(animationKey(actor, 'idle'));
            sprite.setFlipX(stage.face === 'left');
            sprite.vertexRoundMode = 'fullAuto'; // pixel-sharp while walking, as in the game
            this.actors.set(actor, sprite);
        }
        this.bubble = this.add.container(0, 0).setVisible(false);
        this.panel = this.add.container(0, 0).setVisible(false);
        this.createSkipButton();
        this.continueHint = this.add.text(VIEW.width / 2, VIEW.height - 22, `${t('cutscene.continue')} ▸`, { ...TEXT_STYLE, fontSize: '15px' })
            .setOrigin(0.5).setAlpha(0);
        this.tweens.add({ targets: this.continueHint, alpha: { from: 0.4, to: 1 }, duration: 600, yoyo: true, repeat: -1 });
        this.continueHint.setVisible(false);

        this.input.on(Phaser.Input.Events.POINTER_DOWN, (_pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
            if (over.length === 0) this.tap(); // taps on the Skip button are its own
        });
        this.input.keyboard?.on('keydown-ENTER', () => this.tap());
        this.input.keyboard?.on('keydown-SPACE', () => this.tap());
        this.input.keyboard?.on('keydown-ESC', () => this.end());
        this.next();
    }

    /** A tap finishes whatever is running; if nothing is, and a line is shown, it goes on */
    private tap() {
        if (this.finishers.length > 0) {
            const finishers = this.finishers;
            this.finishers = [];
            finishers.forEach(finish => finish());
            return;
        }
        if (this.awaitingTap) {
            this.awaitingTap = false;
            this.continueHint.setVisible(false);
            this.next();
        }
    }

    private next() {
        if (this.ended) return;
        this.index++;
        const beat = this.beats[this.index];
        this.bubble.setVisible(false);
        if (!beat) return this.end();
        if (!('panel' in beat)) this.panel.setVisible(false);
        this.run(beat, needsTap => {
            if (!needsTap) return this.next();
            this.awaitingTap = true;
            this.continueHint.setVisible(true);
        });
    }

    /** Starts a beat; `done(needsTap)` is called once it has played out (or was finished by a tap) */
    private run(beat: Beat, done: (needsTap: boolean) => void) {
        if ('together' in beat) {
            let left = beat.together.length;
            let needsTap = false;
            if (left === 0) return done(false);
            for (const part of beat.together) {
                this.run(part, partNeedsTap => {
                    needsTap ||= partNeedsTap;
                    if (--left === 0) done(needsTap);
                });
            }
            return;
        }
        if ('say' in beat) return this.say(beat.say, t(beat.line), () => done(true));
        if ('panel' in beat) return this.showPanel(beat.panel, beat.line ? t(beat.line) : '', () => done(true));
        if ('move' in beat) return this.move(beat.move, beat.to, beat.speed ?? 'walk', () => done(false));
        if ('face' in beat) {
            this.actors.get(beat.face)?.setFlipX(beat.dir === 'left');
            return done(false);
        }
        const timer = this.time.delayedCall(beat.wait, () => done(false));
        this.finishers.push(() => timer.remove(true));
    }

    private say(actor: ActorId, text: string, done: () => void) {
        const sprite = this.actors.get(actor);
        if (!sprite) return done();
        sprite.play(animationKey(actor, 'talk'), true);
        const label = this.layoutBubble(sprite, text);
        this.typeText(label, text, () => {
            sprite.play(animationKey(actor, 'idle'), true);
            done();
        });
    }

    /** Draws the bubble for the whole text (so it doesn't grow while typing) and returns its empty text object */
    private layoutBubble(sprite: Phaser.GameObjects.Sprite, text: string): Phaser.GameObjects.Text {
        this.bubble.removeAll(true);
        const { maxWidth, padding, gapAboveHead } = BUBBLE;
        const label = this.add.text(0, 0, text, {
            fontFamily: FONT_FAMILY, fontSize: '20px', color: '#2c3e50', wordWrap: { width: maxWidth - 2 * padding },
        });
        const width = Math.ceil(label.width) + 2 * padding;
        const height = Math.ceil(label.height) + 2 * padding;
        const head = sprite.getBounds().top + 10; // frames have a little empty space above the head
        const x = Phaser.Math.Clamp(sprite.x - width / 2, 10, VIEW.width - width - 10);
        const y = Math.max(60, head - gapAboveHead - height - 12);
        const tailX = Phaser.Math.Clamp(sprite.x, x + 20, x + width - 20);
        const g = this.add.graphics();
        g.fillStyle(0xffffff, 0.96).lineStyle(3, 0x2c3e50)
            .fillRoundedRect(x, y, width, height, 12).strokeRoundedRect(x, y, width, height, 12)
            .fillTriangle(tailX - 9, y + height - 2, tailX + 9, y + height - 2, tailX, y + height + 12)
            .lineBetween(tailX - 9, y + height, tailX, y + height + 12).lineBetween(tailX + 9, y + height, tailX, y + height + 12);
        label.setPosition(x + padding, y + padding).setText('');
        this.bubble.add([g, label]).setVisible(true);
        return label;
    }

    /** Typewriter: one letter at a time; a tap shows the rest at once */
    private typeText(label: Phaser.GameObjects.Text, text: string, done: () => void) {
        if (text.length === 0) return done();
        let shown = 0;
        const letters = [...text]; // whole characters, also for Ukrainian and Polish letters
        const finish = () => {
            timer.remove(false);
            label.setText(text);
            done();
        };
        const timer = this.time.addEvent({
            delay: LETTER_MS,
            repeat: letters.length - 1,
            callback: () => {
                shown++;
                label.setText(letters.slice(0, shown).join(''));
                if (shown === letters.length) {
                    this.finishers = this.finishers.filter(f => f !== finish);
                    done();
                }
            },
        });
        this.finishers.push(finish);
    }

    private move(actor: ActorId, to: number, speed: keyof typeof SPEED, done: () => void) {
        const sprite = this.actors.get(actor);
        if (!sprite || sprite.x === to) return done();
        sprite.setFlipX(to < sprite.x).play(animationKey(actor, 'walk'), true);
        if (speed === 'run' && sprite.anims.currentAnim) sprite.anims.timeScale = 2;
        const finish = () => tween.complete();
        const tween = this.tweens.add({
            targets: sprite,
            x: to,
            duration: (Math.abs(to - sprite.x) / SPEED[speed]) * 1000,
            onComplete: () => {
                this.finishers = this.finishers.filter(f => f !== finish);
                sprite.anims.timeScale = 1;
                sprite.play(animationKey(actor, 'idle'), true);
                done();
            },
        });
        this.finishers.push(finish);
    }

    private showPanel(id: PanelId, caption: string, done: () => void) {
        this.panel.removeAll(true);
        const card = this.add.rectangle(VIEW.width / 2, VIEW.height / 2, VIEW.width, VIEW.height, 0x140d09, 0.94);
        this.panel.add(card);
        const key = `panel-${id}`;
        if (this.textures.exists(key)) {
            // The real illustration (art/raw/panels/, loaded by the preloader once it exists)
            this.panel.add(this.add.image(VIEW.width / 2, 250, key));
        } else {
            this.panel.add(this.drawPanelPlaceholder(id));
        }
        const label = this.add.text(VIEW.width / 2, 470, '', {
            ...TEXT_STYLE, fontSize: '24px', align: 'center', wordWrap: { width: 600 },
        }).setOrigin(0.5, 0);
        this.panel.add(label).setVisible(true);
        this.typeText(label, caption, done);
    }

    /** Until the illustration exists: a simple drawing, so scenes can be written before the art */
    private drawPanelPlaceholder(id: PanelId): Phaser.GameObjects.GameObject {
        const g = this.add.graphics();
        if (id === 'red-stone-glow') {
            const [cx, cy] = [VIEW.width / 2, 240];
            for (const [radius, alpha] of [[150, 0.08], [110, 0.12], [75, 0.2]] as const) {
                g.fillStyle(0xff3b30, alpha).fillCircle(cx, cy, radius);
            }
            // A cut gem: a hexagon with a lighter face
            const point = (x: number, y: number) => new Phaser.Math.Vector2(cx + x, cy + y);
            g.fillStyle(0xc62828).fillPoints([point(-50, -20), point(-25, -50), point(25, -50), point(50, -20), point(0, 55)], true);
            g.fillStyle(0xff6f61).fillTriangle(cx - 25, cy - 50, cx + 25, cy - 50, cx, cy - 15);
            g.fillStyle(0xffffff, 0.8).fillRect(cx - 18, cy - 44, 8, 4);
            this.tweens.add({ targets: g, alpha: { from: 0.85, to: 1 }, duration: 700, yoyo: true, repeat: -1 });
        }
        return g;
    }

    private createSkipButton() {
        const label = this.add.text(VIEW.width - 20, 24, `${t('cutscene.skip')} ▸`, { ...TEXT_STYLE, fontSize: '18px' }).setOrigin(1, 0.5);
        const button = this.add.rectangle(label.x - label.width / 2, 24, label.width + 24, 34, 0x2c3e50, 0.7)
            .setStrokeStyle(2, 0xffffff).setInteractive({ useHandCursor: true });
        this.children.bringToTop(label);
        button.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => this.end());
    }

    /** Ends the scene (done, Skip or Esc): remember it was seen, then go where it was started for */
    private end() {
        if (this.ended) return;
        this.ended = true;
        markCutsceneSeen(this.id);
        this.scene.start(this.then.key, this.then.data ?? {});
    }

    private drawBackdrop(id: BackdropId) {
        if (id === 'meadow') {
            this.cameras.main.setBackgroundColor(SKY_COLOR);
            addBackdrop(this, VIEW.width, FLOOR_Y);
            addGroundStrip(this, 0, FLOOR_Y, VIEW.width, VIEW.height - FLOOR_Y);
            return;
        }
        // The salt mine: a dark chamber, wooden props, salt crystals glinting in lantern light (placeholder for 7.4)
        this.cameras.main.setBackgroundColor('#2a1d15');
        const g = this.add.graphics();
        const bands = [0x3a2a1f, 0x33251b, 0x2d2018];
        bands.forEach((color, i) => g.fillStyle(color).fillRect(0, 60 + i * 120, VIEW.width, 120));
        const rnd = new Phaser.Math.RandomDataGenerator(['salt']);
        for (let i = 0; i < 26; i++) {
            const x = rnd.between(10, 790);
            const y = rnd.between(40, 420);
            const size = rnd.between(6, 16);
            g.fillStyle(0xf3e5e0, rnd.realInRange(0.25, 0.6)).fillTriangle(x, y - size, x - size / 2, y + size / 2, x + size / 2, y + size / 2);
        }
        // Timber supports
        for (const x of [120, 680]) g.fillStyle(0x6d4c33).fillRect(x - 10, 150, 20, FLOOR_Y - 150);
        g.fillStyle(0x7b5a3e).fillRect(90, 140, 620, 18);
        // Lanterns with a warm glow
        for (const x of [210, 590]) {
            g.fillStyle(0xffc46b, 0.12).fillCircle(x, 185, 70).fillStyle(0xffc46b, 0.2).fillCircle(x, 185, 36);
            g.fillStyle(0x3b2a1e).fillRect(x - 2, 158, 4, 14).fillStyle(0xffd27f).fillRect(x - 7, 172, 14, 18);
        }
        // Floor: rock with salt specks
        g.fillStyle(0x4a3628).fillRect(0, FLOOR_Y, VIEW.width, VIEW.height - FLOOR_Y);
        g.fillStyle(0x5c4433).fillRect(0, FLOOR_Y, VIEW.width, 6);
        for (let i = 0; i < 40; i++) g.fillStyle(0xe8dcd4, 0.5).fillRect(rnd.between(0, 796), rnd.between(FLOOR_Y + 10, 596), 3, 3);
    }
}

