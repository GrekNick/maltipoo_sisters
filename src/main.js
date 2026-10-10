import Phaser from 'phaser';
import { CHARACTERS, CHARACTER_KEYS, ANIMATION_STATES, FRAME_SIZE, SPRITE_SCALE } from './characters.js';
import { PHYSICS } from './physics.js';
import { level1 } from './levels/level1.js';

// Online co-op is parked behind a build flag (`npm run dev:coop`, see README).
// When the flag is off the co-op module and socket.io are not bundled at all.
const COOP_ENABLED = import.meta.env.VITE_COOP === 'true';

const VIEW = { width: 800, height: 600 };
const TILE = 32;

class MainScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainScene' });
        this.level = level1;
        this.debugText = null;
        this.currentCharacter = Phaser.Utils.Array.GetRandom(CHARACTER_KEYS);
        this.currentAnimation = 'idle';
        this.coop = null;
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

        this.createTextures();
        this.createBackdrop();
        this.createLevel();
        this.createAnimations();
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
        [[4, 6], [18, 3], [26, 14], [9, 20], [21, 25], [3, 28], [14, 12]].forEach(([x, y]) => g.fillRect(x, y, 3, 3));
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

    // Looks and collision are separate on purpose, like a Tiled map will be: tiles for the
    // visuals, one invisible zone per block for physics.
    addBlock(x, y, width, height) {
        this.add.tileSprite(x, y, width, TILE, 'grass').setOrigin(0, 0);
        if (height > TILE) {
            this.add.tileSprite(x, y + TILE, width, height - TILE, 'dirt').setOrigin(0, 0);
        }
        this.solids.add(this.add.zone(x, y, width, height).setOrigin(0, 0));
    }

    createAnimations() {
        // Single-frame for now; real spritesheets will replace these without touching game logic.
        // Animations are global to the game, so they are shared by the local and remote players.
        CHARACTER_KEYS.forEach(character => {
            ANIMATION_STATES.forEach(state => {
                const key = `${character}_${state}`;
                if (!this.anims.exists(key)) {
                    const frame = CHARACTERS[character].frames[state].frame;
                    this.anims.create({ key, frames: [{ key: character, frame }], frameRate: 10, repeat: -1 });
                }
            });
        });
    }

    createPlayer() {
        const { spawn } = this.level;
        this.player = this.physics.add.sprite(spawn.x, spawn.y, this.currentCharacter, 0);
        this.player.setScale(SPRITE_SCALE);
        this.player.setOrigin(0.5, 1); // position = feet, since frames have the feet on the bottom edge
        this.applyHitbox();
        this.player.setBounce(0.2);
        this.player.setCollideWorldBounds(true);
        this.physics.add.collider(this.player, this.solids);
    }

    createCamera() {
        const camera = this.cameras.main;
        camera.setBounds(0, 0, this.level.width, this.level.height);
        camera.startFollow(this.player, true, 0.1, 0.1); // lerp < 1 = smooth catch-up
    }

    createInput() {
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys({
            W: Phaser.Input.Keyboard.KeyCodes.W,
            A: Phaser.Input.Keyboard.KeyCodes.A,
            S: Phaser.Input.Keyboard.KeyCodes.S,
            D: Phaser.Input.Keyboard.KeyCodes.D
        });
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.input.keyboard.on('keydown-H', () => this.toggleHitboxes());
        this.input.keyboard.on('keydown-R', () => this.scene.restart());
    }

    createHud() {
        // scrollFactor 0 = pinned to the screen instead of the world
        const style = { fontSize: '16px', fill: '#fff', stroke: '#2c3e50', strokeThickness: 3 };
        this.add.text(16, 16, 'Move: ←/→ or A/D   Jump: ↑/W/Space   R: restart   H: hitboxes', style)
            .setScrollFactor(0);
        this.debugText = this.add.text(16, 40, 'Character: ' + this.currentCharacter, style).setScrollFactor(0);
        this.positionText = this.add.text(16, 62, '', style).setScrollFactor(0);
    }

    updateCharacterSelect() {
        const select = document.getElementById('character-select');
        if (select) {
            select.value = this.currentCharacter;
        }
    }

    switchCharacter(character) {
        if (!this.player || !CHARACTERS[character]) return;
        this.currentCharacter = character;
        this.player.anims.play(`${character}_${this.currentAnimation}`);
        this.applyHitbox();
        this.updateCharacterSelect();
        if (this.debugText) this.debugText.setText('Character: ' + character);
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
        world.debugGraphic.clear();
    }

    // Respawn point = start of the last ground segment the dog stood on
    updateCheckpoint(onGround) {
        const { ground, groundY } = this.level;
        if (!onGround || Math.abs(this.player.y - groundY) > 1) return;
        const index = ground.findIndex(([from, to]) => this.player.x >= from && this.player.x <= to);
        if (index > 0) this.checkpoint = { x: ground[index][0] + 48, y: groundY };
    }

    respawn() {
        // body.reset teleports body + sprite together; a plain setPosition leaves the body's
        // previous position deep in the pit and the collision solver pushes it through the ground.
        this.player.body.reset(this.checkpoint.x, this.checkpoint.y);
        this.player.setVelocity(0, 0);
    }

    update(time) {
        if (!this.cursors || !this.wasd || !this.player) return;

        // Handle movement
        const moveLeft = this.cursors.left?.isDown || this.wasd.A?.isDown;
        const moveRight = this.cursors.right?.isDown || this.wasd.D?.isDown;
        const onGround = this.player.body.touching.down;
        const canJump = onGround && (this.cursors.up?.isDown || this.wasd.W?.isDown || this.spaceKey?.isDown);

        let animation = 'idle';

        // Movement logic
        if (moveLeft) {
            this.player.setVelocityX(-PHYSICS.runSpeed);
            this.player.setFlipX(true);
            animation = 'move';
        }
        else if (moveRight) {
            this.player.setVelocityX(PHYSICS.runSpeed);
            this.player.setFlipX(false);
            animation = 'move';
        }
        else {
            this.player.setVelocityX(0);
        }

        // Jump logic
        if (canJump) {
            this.player.setVelocityY(-PHYSICS.jumpVelocity);
        }
        if (canJump || !onGround) {
            animation = 'jump';
        }

        this.player.anims.play(`${this.currentCharacter}_${animation}`, true);
        this.currentAnimation = animation;

        this.updateCheckpoint(onGround);
        if (this.player.y > this.level.height + 100) {
            this.respawn();
        }

        this.coop?.update(time);

        this.positionText.setText(`Позиція: X: ${Math.floor(this.player.x)}, Y: ${Math.floor(this.player.y)}`);
    }
}

// Game config
const config = {
    type: Phaser.AUTO,
    width: VIEW.width,
    height: VIEW.height,
    parent: 'game-container',
    roundPixels: true, // avoids shimmering seams while the camera scrolls
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: PHYSICS.gravity },
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
        select.addEventListener('change', (e) => {
            const character = e.target.value;
            const scene = game.scene.keys['MainScene'];
            if (!scene) return;
            if (scene.coop) {
                scene.coop.requestCharacterChange(character);
            } else {
                scene.switchCharacter(character);
            }
        });
    }
});
