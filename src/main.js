import Phaser from 'phaser';
import { CHARACTERS, CHARACTER_KEYS, ANIMATION_STATES, SPRITE_SCALE } from './characters.js';

// Online co-op is parked behind a build flag (`npm run dev:coop`, see README).
// When the flag is off the co-op module and socket.io are not bundled at all.
const COOP_ENABLED = import.meta.env.VITE_COOP === 'true';

class MainScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainScene' });
        this.debugText = null;
        this.currentCharacter = Phaser.Utils.Array.GetRandom(CHARACTER_KEYS);
        this.currentAnimation = 'idle';
        this.coop = null;
    }

    preload() {
        Object.entries(CHARACTERS).forEach(([character, { textures }]) => {
            Object.entries(textures).forEach(([state, url]) => {
                this.load.image(`${character}_${state}`, url);
            });
        });
    }

    create() {
        // Add debug text first so it's always visible
        this.debugText = this.add.text(16, 50, 'Loading...', { fontSize: '18px', fill: '#fff' });

        // Add background
        this.add.rectangle(400, 300, 800, 600, 0x87ceeb);

        this.createPlatforms();
        this.createAnimations();
        this.createPlayer();
        this.createInput();

        // Update the UI select dropdown to match the current character
        this.updateCharacterSelect();

        if (COOP_ENABLED) {
            import('./coop/CoopSession.js').then(({ CoopSession }) => {
                this.coop = new CoopSession(this);
            });
        }
    }

    createPlatforms() {
        // Create platform textures
        this.add.graphics()
            .fillStyle(0x24cc71)
            .fillRect(0, 0, 400, 32)
            .generateTexture('ground', 400, 32);

        this.add.graphics()
            .fillStyle(0x27ae60)
            .fillRect(0, 0, 200, 32)
            .generateTexture('platform', 200, 32);

        // Create platforms
        this.platforms = this.physics.add.staticGroup();
        this.platforms.create(400, 568, 'ground').setScale(2, 1).refreshBody();
        this.platforms.create(600, 400, 'platform');
        this.platforms.create(50, 250, 'platform');
        this.platforms.create(750, 220, 'platform');
    }

    createAnimations() {
        // Single-frame for now; real spritesheets will replace these without touching game logic.
        // Animations are global to the game, so they are shared by the local and remote players.
        CHARACTER_KEYS.forEach(character => {
            ANIMATION_STATES.forEach(state => {
                const key = `${character}_${state}`;
                if (!this.anims.exists(key)) {
                    this.anims.create({ key, frames: [{ key }], frameRate: 10, repeat: -1 });
                }
            });
        });
    }

    createPlayer() {
        this.player = this.physics.add.sprite(100, 400, `${this.currentCharacter}_idle`);
        this.player.setScale(SPRITE_SCALE);
        this.applyHitbox();
        this.player.setBounce(0.2);
        this.player.setCollideWorldBounds(true);
        this.player.body.setGravityY(300);
        this.physics.add.collider(this.player, this.platforms);
        this.debugText.setText('Character: ' + this.currentCharacter);
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

        // Debug / info text
        this.add.text(16, 16, 'Use arrow keys or WASD to move, H for hitboxes', { fontSize: '18px', fill: '#fff' });
        this.add.text(16, 50, 'Position: X: 0, Y: 0', { fontSize: '16px', fill: '#ffffff' }).setName('positionText');
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
            this.player.setVelocityX(-160);
            this.player.setFlipX(true);
            animation = 'move';
        }
        else if (moveRight) {
            this.player.setVelocityX(160);
            this.player.setFlipX(false);
            animation = 'move';
        }
        else {
            this.player.setVelocityX(0);
        }

        // Jump logic
        if (canJump) {
            this.player.setVelocityY(-530);
        }
        if (canJump || !onGround) {
            animation = 'jump';
        }

        this.player.anims.play(`${this.currentCharacter}_${animation}`, true);
        this.currentAnimation = animation;

        this.coop?.update(time);

        // Update position text
        const positionText = this.children.getByName('positionText');
        if (positionText) {
            positionText.setText(`Позиція: X: ${Math.floor(this.player.x)}, Y: ${Math.floor(this.player.y)}`);
        }
    }
}

// Game config
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 400 },
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
