// Gameplay only: level, player, physics, goal. The HUD and finish panel live in UIScene, which listens to the
// events this scene emits (GameEvent). Started from the title screen; Esc goes back to it.
import Phaser from 'phaser';
import { CHARACTERS, CHARACTER_KEYS, SPRITE_SCALE, type AnimationState, type CharacterKey } from '../characters';
import { PHYSICS, SISTER_PHYSICS } from '../physics';
import { RUN_START, JUMP_START, nextCrouching, stepRun, stepJump, type Direction, type RunState, type JumpState } from '../movement';
import { FIRST_LEVEL, TILESETS } from '../levels';
import { LAYER, parseTiledMap, type LevelData, type TiledMap } from '../levels/tiled';
import { loadSettings, recordBestTime } from '../persistence';
import type { CoopHost, CoopSession } from '../coop/CoopSession';
import { addBackdrop } from './art';
import { GameEvent, SceneKey, SKY_COLOR, VIEW, type FinishedState, type HudState } from './shared';

// Online co-op is parked behind a build flag (`npm run dev:coop`, see README).
// When the flag is off the co-op module and socket.io are not bundled at all.
const COOP_ENABLED = import.meta.env.VITE_COOP === 'true';

/** Data passed to scene.start(SceneKey.Game, …) */
export interface GameSceneData {
    levelKey?: string;
}

export class GameScene extends Phaser.Scene implements CoopHost {
    levelKey = FIRST_LEVEL.key;
    /** Parsed from the Tiled map in create() */
    level!: LevelData;
    currentCharacter: CharacterKey = Phaser.Utils.Array.GetRandom(CHARACTER_KEYS);
    currentAnimation: AnimationState = 'idle';
    coop: CoopSession | null = null;
    finished = false;
    falls = 0;

    // Created in create(); `!` tells TypeScript they're always set before use
    player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    private groundLayer!: Phaser.Tilemaps.TilemapLayer;
    private hazardZones!: Phaser.Physics.Arcade.StaticGroup;
    private treatGroup!: Phaser.Physics.Arcade.StaticGroup;
    private goalZone!: Phaser.GameObjects.Zone;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private wasd!: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;
    private spaceKey!: Phaser.Input.Keyboard.Key;
    private checkpoint = { x: 0, y: 0 };
    private startTime = 0;
    private treats = 0;
    private run: RunState = RUN_START;
    private jump: JumpState = JUMP_START;
    /** Ducked (Sofi's skill): lower hitbox, crawl speed, no jumping */
    private crouching = false;

    constructor() {
        super(SceneKey.Game);
    }

    /** Runs before create() on every start/restart; restart() keeps the data it was started with */
    init(data: GameSceneData = {}) {
        if (data.levelKey) this.levelKey = data.levelKey;
    }

    create() {
        // Draw order follows creation order: backdrop first, player last
        this.cameras.main.setBackgroundColor(SKY_COLOR);
        this.level = parseTiledMap(this.levelKey, this.cache.tilemap.get(this.levelKey).data as TiledMap);
        this.checkpoint = { ...this.level.spawn };
        this.finished = false;
        this.falls = 0;
        this.treats = 0;
        this.startTime = this.time.now;
        // Fields keep their values across scene.restart() (the constructor doesn't run again), so reset here
        this.run = RUN_START;
        this.jump = JUMP_START;
        this.crouching = false;

        addBackdrop(this, this.level.width, this.level.spawn.y);
        this.createLevel();
        this.createGoal(); // before the player so the dog is drawn in front of the house
        this.createLevelObjects();
        this.createPlayer();
        this.createCamera();
        this.createInput();
        if (loadSettings().showHitboxes) this.toggleHitboxes();

        // The HUD runs as its own scene on top; stop it with this one (restart, or Esc to the title)
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

    /** The Tiled map: Background (decoration), Ground (solid where tiles have `collides`), Objects (parsed). */
    createLevel() {
        const map = this.make.tilemap({ key: this.levelKey });
        const tilesets = TILESETS.flatMap(t => map.addTilesetImage(t.name, t.key) ?? []);
        if (map.getLayer(LAYER.background)) map.createLayer(LAYER.background, tilesets);
        const ground = map.createLayer(LAYER.ground, tilesets);
        // createLayer can also return a GPU-only layer type (when asked for one); ours is a normal tile layer
        if (!(ground instanceof Phaser.Tilemaps.TilemapLayer)) throw new Error(`${this.levelKey}: no "${LAYER.ground}" layer`);
        ground.setCollisionByProperty({ collides: true });
        this.groundLayer = ground;

        // The world is wider than the screen and has no floor, so the dog can fall into pits
        const { width, height } = this.level;
        this.physics.world.setBounds(0, 0, width, height, true, true, true, false);
    }

    createGoal() {
        const { goal } = this.level;
        this.add.image(goal.x, goal.y, 'doghouse').setOrigin(0.5, 1);
        // Trigger area in front of the door; reaching it finishes the level
        this.goalZone = this.add.zone(goal.x, goal.y - 30, 40, 60);
        this.physics.add.existing(this.goalZone, true);
    }

    /**
     * Treats, puddles and sister signs from the map's Objects layer. Their overlaps with the dog are wired up in
     * createPlayer(); everything here is drawn before the dog so she stays in front.
     */
    createLevelObjects() {
        for (const gate of this.level.sisterGates) {
            this.add.image(gate.x, gate.y, `sign-${gate.sister}`).setOrigin(0.5, 1);
        }

        // Puddles: blue water over the area; touching it sends the dog back to the last checkpoint
        this.hazardZones = this.physics.add.staticGroup();
        for (const { x, y, width, height } of this.level.hazards) {
            this.add.rectangle(x, y, width, height, 0x4fc3f7, 0.85).setOrigin(0, 0);
            this.add.rectangle(x + 4, y + 2, width - 8, 2, 0xe1f5fe, 0.9).setOrigin(0, 0);
            this.hazardZones.add(this.add.zone(x, y, width, height).setOrigin(0, 0));
        }

        // Treats bob gently; the physics body stays put (static), which is close enough for a 3px bob
        this.treatGroup = this.physics.add.staticGroup();
        for (const { x, y } of this.level.pickups) {
            const treat = this.treatGroup.create(x, y, 'treat') as Phaser.Physics.Arcade.Image;
            this.tweens.add({ targets: treat, y: y - 3, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        }
    }

    collectTreat(treat: Phaser.Physics.Arcade.Image) {
        if (!treat.body?.enable) return;
        treat.disableBody(false, false);
        this.treats++;
        this.tweens.killTweensOf(treat);
        this.tweens.add({ targets: treat, y: treat.y - 24, alpha: 0, duration: 250, onComplete: () => treat.destroy() });
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
        this.physics.add.collider(this.player, this.groundLayer);
        this.physics.add.overlap(this.player, this.goalZone, () => this.reachHome());
        this.physics.add.overlap(this.player, this.hazardZones, () => this.respawn());
        this.physics.add.overlap(this.player, this.treatGroup, (_player, treat) => {
            this.collectTreat(treat as Phaser.Physics.Arcade.Image);
        });
    }

    createCamera() {
        const camera = this.cameras.main;
        // Maps are 19 tiles (608px) tall and the view is 600px: show the bottom of the map (the ground) and don't
        // scroll vertically by those few pixels.
        const top = Math.max(0, this.level.height - VIEW.height);
        camera.setBounds(0, top, this.level.width, this.level.height - top);
        // Locked to the dog (lerp 1): a smooth, lagging camera let the dog creep across the screen in uneven
        // 1-2px steps while it sped up, which read as blur. Now the dog stays still on screen and the world scrolls.
        camera.startFollow(this.player, true, 1, 1);
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
        keyboard.on('keydown-ESC', () => this.scene.start(SceneKey.Title));
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
        if (this.crouching && !CHARACTERS[character].crouchHitbox) {
            // The other sister can't duck: only swap where there's room to stand, or she'd be stuck in the ceiling
            if (!this.hasHeadroom()) return this.updateCharacterSelect();
            this.crouching = false;
        }
        this.currentCharacter = character;
        this.player.anims.play(`${character}_${this.currentAnimation}`);
        this.applyHitbox();
        this.updateCharacterSelect();
    }

    applyHitbox() {
        // Arcade body size/offset are in texture pixels; the sprite's scale is applied on top. Both hitboxes share
        // the feet line, so ducking or standing up doesn't move the dog. (For the rest of this frame body.y still holds the old
        // top; Arcade re-syncs it from the sprite at the next physics step, before any collision runs.)
        const character = CHARACTERS[this.currentCharacter];
        const { x, y, width, height } = this.crouching && character.crouchHitbox ? character.crouchHitbox : character.hitbox;
        this.player.body.setSize(width, height, false).setOffset(x, y);
    }

    /** Is there room above the ducked dog for her standing body? (Solid tiles only; 1px inset on each side.) */
    private hasHeadroom(): boolean {
        const { hitbox, crouchHitbox } = CHARACTERS[this.currentCharacter];
        if (!crouchHitbox) return true;
        const body = this.player.body;
        const extra = (hitbox.height - crouchHitbox.height) * SPRITE_SCALE;
        const tiles = this.groundLayer.getTilesWithinWorldXY(body.x + 1, body.y - extra, body.width - 2, extra - 1, { isColliding: true });
        return tiles.length === 0;
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

    // Respawn point = the furthest checkpoint object (from the map) the dog has reached on foot
    updateCheckpoint(onGround: boolean) {
        if (!onGround) return;
        for (const checkpoint of this.level.checkpoints) {
            if (checkpoint.x <= this.player.x && checkpoint.x > this.checkpoint.x) this.checkpoint = { ...checkpoint };
        }
    }

    respawn() {
        // body.reset teleports body + sprite together; a plain setPosition leaves the body's
        // previous position deep in the pit and the collision solver pushes it through the ground.
        this.player.body.reset(this.checkpoint.x, this.checkpoint.y);
        this.player.setVelocity(0, 0);
        this.run = RUN_START;
        this.jump = JUMP_START;
        this.crouching = false;
        this.applyHitbox();
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

        const finished: FinishedState = {
            seconds,
            falls: this.falls,
            treats: this.treats,
            totalTreats: this.level.pickups.length,
            best: recordBestTime(this.level.id, seconds),
        };
        this.events.emit(GameEvent.Finished, finished);
    }

    override update(_time: number, delta: number) {
        if (this.finished) return;
        const dt = Math.min(delta, 50) / 1000; // clamp: a long hitch (tab switch) shouldn't launch the dog
        const body = this.player.body;
        const onGround = body.blocked.down || body.touching.down;

        // Ducking (Sofi only): ↓/S on the ground; stays down under a low ceiling (src/movement.ts)
        const character = CHARACTERS[this.currentCharacter];
        const crouching = nextCrouching(this.crouching, {
            wantsCrouch: this.cursors.down.isDown || this.wasd.S.isDown,
            canCrouch: character.crouchHitbox !== null,
            onGround,
            hasHeadroom: !this.crouching || this.hasHeadroom(),
        });
        if (crouching !== this.crouching) {
            this.crouching = crouching;
            this.applyHitbox();
        }

        // Each sister's own numbers (Kiwi jumps higher). Swapping mid-air keeps the current speed: only the next
        // jump uses the new sister's numbers.
        const physics = SISTER_PHYSICS[this.currentCharacter];

        // Horizontal: walk speed that ramps up to run speed while a direction is held; capped while crawling
        const left = this.cursors.left.isDown || this.wasd.A.isDown;
        const right = this.cursors.right.isDown || this.wasd.D.isDown;
        const direction: Direction = left === right ? 0 : left ? -1 : 1;
        const speedLimit = this.crouching ? physics.crawlSpeed : Infinity;
        this.run = stepRun({ ...this.run, vx: body.velocity.x }, direction, onGround, dt, physics, speedLimit);
        const pushingWall = (direction < 0 && body.blocked.left) || (direction > 0 && body.blocked.right);
        if (pushingWall) this.run = { ...this.run, heldTime: 0 };
        body.setVelocityX(this.run.vx);
        if (direction !== 0) this.player.setFlipX(direction < 0);

        // Vertical: jump buffer, coyote time, variable height, faster falling. No jumping while ducked.
        const jumpKeys = [this.cursors.up, this.wasd.W, this.spaceKey];
        const jumpPressed = jumpKeys.some(key => Phaser.Input.Keyboard.JustDown(key));
        const step = stepJump(this.jump, {
            pressed: jumpPressed && !this.crouching,
            held: jumpKeys.some(key => key.isDown),
            onGround,
            vy: body.velocity.y,
        }, dt, physics);
        this.jump = step.state;
        if (step.jump) body.setVelocityY(-physics.jumpVelocity);
        if (step.cut) body.setVelocityY(body.velocity.y * physics.jumpCutMultiplier);
        // World gravity is the (shared) rising gravity; add the difference while falling
        body.setGravityY(body.velocity.y > 0 ? physics.fallGravity - physics.gravity : 0);

        const moving = Math.abs(this.run.vx) > 10;
        const animation: AnimationState = this.crouching ? (moving ? 'crawl' : 'crouch')
            : step.jump || !onGround ? 'jump'
            : moving ? 'move' : 'idle';
        this.player.anims.play(`${this.currentCharacter}_${animation}`, true);
        // Legs move faster as the dog speeds up
        const animationSpeed = animation === 'move' ? Math.abs(this.run.vx) / physics.walkSpeed
            : animation === 'crawl' ? Math.abs(this.run.vx) / physics.crawlSpeed : 1;
        this.player.anims.timeScale = animationSpeed;
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
            treats: this.treats,
            totalTreats: this.level.pickups.length,
            x: this.player.x,
            y: this.player.y,
        };
        this.events.emit(GameEvent.Hud, hud);
    }
}
