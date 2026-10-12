import Phaser from 'phaser';
import {
    CHARACTERS, CHARACTER_KEYS, ANIMATION_STATES, ANIMATION_FRAME_RATE, FRAME_SIZE, SPRITE_SCALE, isCharacterKey,
    type AnimationState, type CharacterKey,
} from './characters';
import { PHYSICS } from './physics';
import { RUN_START, JUMP_START, stepRun, stepJump, type Direction, type RunState, type JumpState } from './movement';
import { level1 } from './levels/level1';
import type { Level } from './levels/types';
import type { CoopHost, CoopSession } from './coop/CoopSession';

// Online co-op is parked behind a build flag (`npm run dev:coop`, see README).
// When the flag is off the co-op module and socket.io are not bundled at all.
const COOP_ENABLED = import.meta.env.VITE_COOP === 'true';

const VIEW = { width: 800, height: 600 } as const;
const TILE = 32;

interface BestTime {
    seconds: number;
    isNew: boolean;
}

declare global {
    interface Window {
        /** Exposed in dev builds for console debugging (see AGENTS.md) */
        game?: Phaser.Game;
    }
}

export class MainScene extends Phaser.Scene implements CoopHost {
    readonly level: Level = level1;
    currentCharacter: CharacterKey = Phaser.Utils.Array.GetRandom(CHARACTER_KEYS);
    currentAnimation: AnimationState = 'idle';
    coop: CoopSession | null = null;
    finished = false;
    falls = 0;

    // Created in create(); `!` tells TypeScript they're always set before use
    player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    private solids!: Phaser.Physics.Arcade.StaticGroup;
    private goalZone!: Phaser.GameObjects.Zone;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private wasd!: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;
    private spaceKey!: Phaser.Input.Keyboard.Key;
    private statusText!: Phaser.GameObjects.Text;
    private positionText!: Phaser.GameObjects.Text;
    private checkpoint = { x: 0, y: 0 };
    private startTime = 0;
    private run: RunState = RUN_START;
    private jump: JumpState = JUMP_START;

    constructor() {
        super({ key: 'MainScene' });
    }

    preload() {
        Object.entries(CHARACTERS).forEach(([character, { sheet }]) => {
            this.load.spritesheet(character, sheet, { frameWidth: FRAME_SIZE.width, frameHeight: FRAME_SIZE.height });
        });
    }

    create() {
        // Draw order follows creation order: backdrop first, HUD last so it stays on top
        this.cameras.main.setBackgroundColor('#87ceeb');
        this.checkpoint = { ...this.level.spawn };
        this.finished = false;
        this.falls = 0;
        this.startTime = this.time.now;
        // Fields keep their values across scene.restart() (the constructor doesn't run again), so reset here
        this.run = RUN_START;
        this.jump = JUMP_START;

        this.createTextures();
        this.createBackdrop();
        this.createLevel();
        this.createAnimations();
        this.createGoal(); // before the player so the dog is drawn in front of the house
        this.createPlayer();
        this.createCamera();
        this.createInput();
        this.createHud();

        // Update the UI select dropdown to match the current character
        this.updateCharacterSelect();

        if (COOP_ENABLED) {
            import('./coop/CoopSession.js').then(({ CoopSession }) => {
                this.coop = new CoopSession(this);
            });
            this.events.once('shutdown', () => this.coop?.destroy());
        }
    }

    createTextures() {
        // Placeholder art baked once from Graphics (make, not add: nothing stays on screen).
        // A Tiled tileset replaces this later, see docs/decisions.md.
        if (this.textures.exists('grass')) return; // textures outlive scene restarts

        const g = this.make.graphics({}, false);

        g.fillStyle(0x8b5a2b).fillRect(0, 0, TILE, TILE);
        g.fillStyle(0x6f4520);
        const specks: Array<[number, number]> = [[4, 6], [18, 3], [26, 14], [9, 20], [21, 25], [3, 28], [14, 12]];
        specks.forEach(([x, y]) => g.fillRect(x, y, 3, 3));
        g.generateTexture('dirt', TILE, TILE);

        // Same dirt with a grass strip on top
        g.fillStyle(0x4caf50).fillRect(0, 0, TILE, 8).fillRect(5, 8, 4, 3).fillRect(19, 8, 5, 2);
        g.fillStyle(0x7ed957).fillRect(0, 0, TILE, 3);
        g.generateTexture('grass', TILE, TILE);

        g.clear();
        g.fillStyle(0xffffff).fillEllipse(40, 30, 60, 30).fillEllipse(70, 22, 50, 34).fillEllipse(95, 32, 50, 26);
        g.generateTexture('cloud', 130, 50);

        g.clear();
        g.fillStyle(0xa5d6a7).fillEllipse(200, 120, 400, 240);
        g.generateTexture('hill', 400, 120);

        // Dog house: roof, plank walls, arched door
        g.clear();
        g.fillStyle(0xd9a066).fillRect(14, 62, 132, 78);
        g.fillStyle(0xb9854f);
        for (let y = 76; y < 140; y += 14) g.fillRect(14, y, 132, 3);
        g.fillStyle(0x3b2414).fillRect(55, 100, 50, 40).fillCircle(80, 100, 25);
        g.fillStyle(0xc0392b).fillTriangle(0, 62, 80, 4, 160, 62);
        g.fillStyle(0x922b21).fillRect(0, 58, 160, 8);
        g.lineStyle(3, 0x5d3a1a).strokeRect(14, 62, 132, 78).strokeTriangle(0, 62, 80, 4, 160, 62);
        g.generateTexture('doghouse', 160, 142);

        g.destroy();
    }

    createBackdrop() {
        // Parallax: things further away scroll slower than the camera (scrollFactor < 1).
        // Seeded random so the backdrop is the same on every run.
        const rnd = new Phaser.Math.RandomDataGenerator(['maltipoo']);
        const maxScroll = this.level.width - VIEW.width;

        for (let x = -50; x < maxScroll * 0.2 + VIEW.width; x += rnd.between(160, 300)) {
            this.add.image(x, rnd.between(40, 220), 'cloud')
                .setScrollFactor(0.2)
                .setScale(rnd.realInRange(0.6, 1.3))
                .setAlpha(rnd.realInRange(0.7, 0.95));
        }
        for (let x = -100; x < maxScroll * 0.5 + VIEW.width; x += rnd.between(250, 380)) {
            this.add.image(x, this.level.groundY + 8, 'hill')
                .setOrigin(0, 1)
                .setScrollFactor(0.5)
                .setScale(rnd.realInRange(0.8, 1.2), rnd.realInRange(0.7, 1.4));
        }
    }

    createLevel() {
        const { ground, groundY, platforms, width, height } = this.level;
        this.solids = this.physics.add.staticGroup();

        ground.forEach(([from, to]) => this.addBlock(from, groundY, to - from, height - groundY));
        platforms.forEach(p => this.addBlock(p.x, p.y, p.width, TILE));

        // The world is wider than the screen and has no floor, so the dog can fall into pits
        this.physics.world.setBounds(0, 0, width, height, true, true, true, false);
    }

    createGoal() {
        const { goal, groundY } = this.level;
        this.add.image(goal.x, groundY, 'doghouse').setOrigin(0.5, 1);
        // Trigger area in front of the door; reaching it finishes the level
        this.goalZone = this.add.zone(goal.x, groundY - 30, 40, 60);
        this.physics.add.existing(this.goalZone, true);
    }

    // Looks and collision are separate on purpose, like a Tiled map will be: tiles for the
    // visuals, one invisible zone per block for physics.
    addBlock(x: number, y: number, width: number, height: number) {
        this.add.tileSprite(x, y, width, TILE, 'grass').setOrigin(0, 0);
        if (height > TILE) {
            this.add.tileSprite(x, y + TILE, width, height - TILE, 'dirt').setOrigin(0, 0);
        }
        this.solids.add(this.add.zone(x, y, width, height).setOrigin(0, 0));
    }

    createAnimations() {
        // Frame lists come from sprites.json (tools/build-sprites.mjs); new art only changes that list.
        // Animations are global to the game, so they are shared by the local and remote players.
        CHARACTER_KEYS.forEach(character => {
            ANIMATION_STATES.forEach(state => {
                const key = `${character}_${state}`;
                if (!this.anims.exists(key)) {
                    const frames = CHARACTERS[character].sprites.animations[state].map(frame => ({ key: character, frame }));
                    this.anims.create({ key, frames, frameRate: ANIMATION_FRAME_RATE[state], repeat: -1 });
                }
            });
        });
    }

    createPlayer() {
        const { spawn } = this.level;
        this.player = this.physics.add.sprite(spawn.x, spawn.y, this.currentCharacter, 0);
        this.player.setScale(SPRITE_SCALE);
        this.player.setOrigin(0.5, 1); // position = feet, since frames have the feet on the bottom edge
        // Always snap to whole pixels: Phaser's default only snaps unflipped sprites, so the dog blurred while
        // running left. Safe because characters never rotate.
        this.player.vertexRoundMode = 'fullAuto';
        this.applyHitbox();
        this.player.setCollideWorldBounds(true);
        this.player.body.setMaxVelocityY(PHYSICS.maxFallSpeed);
        this.physics.add.collider(this.player, this.solids);
        this.physics.add.overlap(this.player, this.goalZone, () => this.reachHome());
    }

    createCamera() {
        const camera = this.cameras.main;
        camera.setBounds(0, 0, this.level.width, this.level.height);
        camera.startFollow(this.player, true, 0.1, 0.1); // lerp < 1 = smooth catch-up
    }

    createInput() {
        const keyboard = this.input.keyboard;
        if (!keyboard) throw new Error('Keyboard input is disabled in the game config');
        this.cursors = keyboard.createCursorKeys();
        this.wasd = keyboard.addKeys({
            W: Phaser.Input.Keyboard.KeyCodes.W,
            A: Phaser.Input.Keyboard.KeyCodes.A,
            S: Phaser.Input.Keyboard.KeyCodes.S,
            D: Phaser.Input.Keyboard.KeyCodes.D
        }) as MainScene['wasd'];
        this.spaceKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        keyboard.on('keydown-H', () => this.toggleHitboxes());
        keyboard.on('keydown-R', () => this.scene.restart());
    }

    createHud() {
        // scrollFactor 0 = pinned to the screen instead of the world
        const style: Phaser.Types.GameObjects.Text.TextStyle = {
            fontSize: '16px', color: '#fff', stroke: '#2c3e50', strokeThickness: 3,
        };
        this.add.text(16, 16, 'Move: ←/→ or A/D   Jump: ↑/W/Space   R: restart   H: hitboxes', style)
            .setScrollFactor(0);
        this.statusText = this.add.text(16, 40, '', style).setScrollFactor(0);
        this.positionText = this.add.text(16, 62, '', style).setScrollFactor(0);
    }

    elapsedSeconds() {
        return (this.time.now - this.startTime) / 1000;
    }

    updateCharacterSelect() {
        const select = document.getElementById('character-select');
        if (select instanceof HTMLSelectElement) {
            select.value = this.currentCharacter;
        }
    }

    switchCharacter(character: CharacterKey) {
        if (!this.player) return;
        this.currentCharacter = character;
        this.player.anims.play(`${character}_${this.currentAnimation}`);
        this.applyHitbox();
        this.updateCharacterSelect();
    }

    applyHitbox() {
        // Arcade body size/offset are in texture pixels; the sprite's scale is applied on top.
        const { x, y, width, height } = CHARACTERS[this.currentCharacter].hitbox;
        this.player.body.setSize(width, height, false).setOffset(x, y);
    }

    toggleHitboxes() {
        const world = this.physics.world;
        if (!world.debugGraphic) {
            world.createDebugGraphic(); // also turns drawing on
            return;
        }
        world.drawDebug = !world.drawDebug;
        world.debugGraphic?.clear();
    }

    // Respawn point = start of the last ground segment the dog stood on
    updateCheckpoint(onGround: boolean) {
        const { ground, groundY } = this.level;
        if (!onGround || Math.abs(this.player.y - groundY) > 1) return;
        const index = ground.findIndex(([from, to]) => this.player.x >= from && this.player.x <= to);
        const segment = ground[index];
        if (index > 0 && segment) this.checkpoint = { x: segment[0] + 48, y: groundY };
    }

    respawn() {
        // body.reset teleports body + sprite together; a plain setPosition leaves the body's
        // previous position deep in the pit and the collision solver pushes it through the ground.
        this.player.body.reset(this.checkpoint.x, this.checkpoint.y);
        this.player.setVelocity(0, 0);
        this.run = RUN_START;
        this.jump = JUMP_START;
        this.falls++;
    }

    reachHome() {
        if (this.finished) return;
        this.finished = true;
        const seconds = this.elapsedSeconds();

        // Freeze the world and let the dog trot into the house
        this.physics.pause();
        this.player.anims.play(`${this.currentCharacter}_move`);
        this.tweens.add({
            targets: this.player,
            x: this.level.goal.x,
            alpha: 0,
            scale: SPRITE_SCALE * 0.6,
            duration: 700,
            ease: 'Sine.easeIn',
        });

        const best = this.saveBestTime(seconds);
        this.showFinishPanel(seconds, best);
    }

    // Best time per level, kept in this browser only. Storage can be unavailable (private mode),
    // so failures just mean no best time.
    saveBestTime(seconds: number): BestTime | null {
        const key = `maltipoo.best.${this.level.id}`;
        try {
            const previous = Number(localStorage.getItem(key)) || Infinity;
            if (seconds < previous) {
                localStorage.setItem(key, String(seconds));
                return { seconds, isNew: previous !== Infinity };
            }
            return { seconds: previous, isNew: false };
        } catch {
            return null;
        }
    }

    showFinishPanel(seconds: number, best: BestTime | null) {
        const x = VIEW.width / 2;
        const y = 210;
        const text = (dy: number, content: string, size: number, color = '#ffffff') =>
            this.add.text(x, y + dy, content, {
                fontSize: `${size}px`, color, stroke: '#2c3e50', strokeThickness: 4,
            }).setOrigin(0.5).setScrollFactor(0);

        this.add.rectangle(x, y, 440, 190, 0x2c3e50, 0.85).setStrokeStyle(3, 0xffffff).setScrollFactor(0);
        text(-55, 'Home sweet home!', 34);
        text(-8, `Time: ${seconds.toFixed(1)}s    Falls: ${this.falls}`, 20);
        if (best) {
            text(24, best.isNew ? 'New best time!' : `Best: ${best.seconds.toFixed(1)}s`, 18,
                best.isNew ? '#ffe082' : '#cfd8dc');
        }
        text(62, 'Press R to play again', 18, '#ffe082');
    }

    override update(_time: number, delta: number) {
        if (this.finished) return;
        const dt = Math.min(delta, 50) / 1000; // clamp: a long hitch (tab switch) shouldn't launch the dog
        const body = this.player.body;
        const onGround = body.blocked.down || body.touching.down;

        // Horizontal: walk speed that ramps up to run speed while a direction is held (src/movement.ts)
        const left = this.cursors.left.isDown || this.wasd.A.isDown;
        const right = this.cursors.right.isDown || this.wasd.D.isDown;
        const direction: Direction = left === right ? 0 : left ? -1 : 1;
        this.run = stepRun({ ...this.run, vx: body.velocity.x }, direction, onGround, dt, PHYSICS);
        const pushingWall = (direction < 0 && body.blocked.left) || (direction > 0 && body.blocked.right);
        if (pushingWall) this.run = { ...this.run, heldTime: 0 };
        body.setVelocityX(this.run.vx);
        if (direction !== 0) this.player.setFlipX(direction < 0);

        // Vertical: jump buffer, coyote time, variable height, faster falling
        const jumpKeys = [this.cursors.up, this.wasd.W, this.spaceKey];
        const step = stepJump(this.jump, {
            pressed: jumpKeys.some(key => Phaser.Input.Keyboard.JustDown(key)),
            held: jumpKeys.some(key => key.isDown),
            onGround,
            vy: body.velocity.y,
        }, dt, PHYSICS);
        this.jump = step.state;
        if (step.jump) body.setVelocityY(-PHYSICS.jumpVelocity);
        if (step.cut) body.setVelocityY(body.velocity.y * PHYSICS.jumpCutMultiplier);
        // World gravity is the rising gravity; add the difference while falling
        body.setGravityY(body.velocity.y > 0 ? PHYSICS.fallGravity - PHYSICS.gravity : 0);

        const animation: AnimationState = step.jump || !onGround ? 'jump'
            : Math.abs(this.run.vx) > 10 ? 'move' : 'idle';
        this.player.anims.play(`${this.currentCharacter}_${animation}`, true);
        // Legs move faster as the dog speeds up
        this.player.anims.timeScale = animation === 'move' ? Math.abs(this.run.vx) / PHYSICS.walkSpeed : 1;
        this.currentAnimation = animation;

        this.updateCheckpoint(onGround);
        if (this.player.y > this.level.height + 100) {
            this.respawn();
        }

        this.coop?.update();

        const name = CHARACTERS[this.currentCharacter].name;
        this.statusText.setText(`${name}   Time: ${this.elapsedSeconds().toFixed(1)}s   Falls: ${this.falls}`);
        this.positionText.setText(`Позиція: X: ${Math.floor(this.player.x)}, Y: ${Math.floor(this.player.y)}`);
    }
}

// Game config
const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: VIEW.width,
    height: VIEW.height,
    parent: 'game-container',
    roundPixels: true, // avoids shimmering seams while the camera scrolls
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { x: 0, y: PHYSICS.gravity },
            debug: false
        }
    },
    scene: MainScene
};

// Start game
const game = new Phaser.Game(config);

// Handy for poking at the game from the browser console during development
if (import.meta.env.DEV) window.game = game;

// Hook up the character select DOM element if present
window.addEventListener('DOMContentLoaded', () => {
    const select = document.getElementById('character-select');
    if (select) {
        select.addEventListener('change', () => {
            const character = (select as HTMLSelectElement).value;
            const scene = game.scene.getScene<MainScene>('MainScene');
            if (!scene || !isCharacterKey(character)) return;
            if (scene.coop) {
                scene.coop.requestCharacterChange(character);
            } else {
                scene.switchCharacter(character);
            }
        });
    }
});
