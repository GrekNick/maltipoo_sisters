// Gameplay only: level, player, physics, goal. The HUD and finish panel live in UIScene, which listens to the
// events this scene emits (GameEvent).
import Phaser from 'phaser';
import { CHARACTERS, CHARACTER_KEYS, SPRITE_SCALE, type AnimationState, type CharacterKey } from '../characters';
import { PHYSICS } from '../physics';
import { RUN_START, JUMP_START, stepRun, stepJump, type Direction, type RunState, type JumpState } from '../movement';
import { level1 } from '../levels/level1';
import type { Level } from '../levels/types';
import { recordBestTime } from '../persistence';
import type { CoopHost, CoopSession } from '../coop/CoopSession';
import { addBackdrop, addGroundStrip } from './art';
import { GameEvent, SceneKey, SKY_COLOR, TILE, type FinishedState, type HudState } from './shared';

// Online co-op is parked behind a build flag (`npm run dev:coop`, see README).
// When the flag is off the co-op module and socket.io are not bundled at all.
const COOP_ENABLED = import.meta.env.VITE_COOP === 'true';

export class GameScene extends Phaser.Scene implements CoopHost {
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
    private checkpoint = { x: 0, y: 0 };
    private startTime = 0;
    private run: RunState = RUN_START;
    private jump: JumpState = JUMP_START;

    constructor() {
        super(SceneKey.Game);
    }

    create() {
        // Draw order follows creation order: backdrop first, player last
        this.cameras.main.setBackgroundColor(SKY_COLOR);
        this.checkpoint = { ...this.level.spawn };
        this.finished = false;
        this.falls = 0;
        this.startTime = this.time.now;
        // Fields keep their values across scene.restart() (the constructor doesn't run again), so reset here
        this.run = RUN_START;
        this.jump = JUMP_START;

        addBackdrop(this, this.level.width, this.level.groundY);
        this.createLevel();
        this.createGoal(); // before the player so the dog is drawn in front of the house
        this.createPlayer();
        this.createCamera();
        this.createInput();

        // The HUD runs as its own scene on top; stop it with this one (e.g. on restart)
        this.scene.launch(SceneKey.UI);
        this.events.once('shutdown', () => this.scene.stop(SceneKey.UI));

        // Update the UI select dropdown to match the current character
        this.updateCharacterSelect();

        if (COOP_ENABLED) {
            import('../coop/CoopSession').then(({ CoopSession }) => {
                this.coop = new CoopSession(this);
            });
            this.events.once('shutdown', () => this.coop?.destroy());
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
        addGroundStrip(this, x, y, width, height);
        this.solids.add(this.add.zone(x, y, width, height).setOrigin(0, 0));
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
        }) as GameScene['wasd'];
        this.spaceKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        keyboard.on('keydown-H', () => this.toggleHitboxes());
        keyboard.on('keydown-R', () => this.scene.restart());
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

        const finished: FinishedState = { seconds, falls: this.falls, best: recordBestTime(this.level.id, seconds) };
        this.events.emit(GameEvent.Finished, finished);
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

        const hud: HudState = {
            characterName: CHARACTERS[this.currentCharacter].name,
            seconds: this.elapsedSeconds(),
            falls: this.falls,
            x: this.player.x,
            y: this.player.y,
        };
        this.events.emit(GameEvent.Hud, hud);
    }
}
