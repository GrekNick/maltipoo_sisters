import Phaser from 'phaser';
import kiwi from '../assests/kiwi_sprites/chill.png';
import sofi from '../assests/sofi_sprites/smiley.png';

class MainScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainScene' });
        this.debugText = null;
        this.currentCharacter = Math.random() < 0.5 ? 'kiwi' : 'sofi';
    }

    preload() {
        // Load both character images
        this.load.image('sofi', sofi);
        this.load.image('kiwi', kiwi);
    }

    create() {
        // Add debug text first so it's always visible
        this.debugText = this.add.text(16, 50, 'Loading...', { fontSize: '18px', fill: '#fff' });
        
        // Add background
        this.add.rectangle(400, 300, 800, 600, 0x87ceeb);

        this.createGame();

        // Update the UI select dropdown to match the current character
        this.updateCharacterSelect();
    }

    updateCharacterSelect() {
        const select = document.getElementById('character-select');
        if (select) {
            select.value = this.currentCharacter;
        }
    }

    createGame() {
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

        // Create player with current character
        this.player = this.physics.add.sprite(100, 400, this.currentCharacter);
        this.player.setScale(0.1);
        this.player.body.setSize(this.player.displayWidth, this.player.displayHeight + 568, true);
        this.player.setBounce(0.2);
        this.player.setCollideWorldBounds(true);
        this.player.body.setGravityY(300);
        this.physics.add.collider(this.player, this.platforms);

        // Simple placeholder animations (single frame)
        this.anims.create({
            key: 'left',
            frames: [{ key: this.currentCharacter }],
            frameRate: 10,
            repeat: -1
        });
        this.anims.create({
            key: 'turn',
            frames: [{ key: this.currentCharacter }],
            frameRate: 20
        });
        this.anims.create({
            key: 'right',
            frames: [{ key: this.currentCharacter }],
            frameRate: 10,
            repeat: -1
        });

        // Input
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys({
            W: Phaser.Input.Keyboard.KeyCodes.W,
            A: Phaser.Input.Keyboard.KeyCodes.A,
            S: Phaser.Input.Keyboard.KeyCodes.S,
            D: Phaser.Input.Keyboard.KeyCodes.D
        });
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

        // Debug / info text
        this.add.text(16, 16, 'Use arrow keys or WASD to move', { fontSize: '18px', fill: '#fff' });
        this.add.text(16, 50, 'Position: X: 0, Y: 0', { fontSize: '16px', fill: '#ffffff' }).setName('positionText');
        this.debugText.setText('Character: ' + this.currentCharacter);
    }

    switchCharacter(characterKey) {
        if (!this.player || !this.textures.exists(characterKey)) return;
        this.currentCharacter = characterKey;
        this.player.setTexture(characterKey);
        this.player.setScale(0.1);
        // Recreate simple single-frame animations bound to new texture
        ['left', 'turn', 'right'].forEach(key => this.anims.remove(key));
        this.anims.create({ key: 'left', frames: [{ key: characterKey }], frameRate: 10, repeat: -1 });
        this.anims.create({ key: 'turn', frames: [{ key: characterKey }], frameRate: 20 });
        this.anims.create({ key: 'right', frames: [{ key: characterKey }], frameRate: 10, repeat: -1 });
        // Update body size to match new texture (after scale)
        this.player.body.setSize(this.player.displayWidth, this.player.displayHeight + 568, true);
        if (this.debugText) this.debugText.setText('Character: ' + characterKey);
    }

    update() {
        if (!this.cursors || !this.wasd) return;

        // Handle movement
        const moveLeft = this.cursors.left?.isDown || this.wasd.A?.isDown;
        const moveRight = this.cursors.right?.isDown || this.wasd.D?.isDown;
        const canJump = this.player.body.touching.down && (this.cursors.up?.isDown || this.wasd.W?.isDown || this.spaceKey?.isDown);

        // Movement logic
        if (moveLeft) {
            this.player.setVelocityX(-160);
            this.player.anims.play('left', true);
            this.player.setFlipX(true);
        }
        else if (moveRight) {
            this.player.setVelocityX(160);
            this.player.anims.play('right', true);
            this.player.setFlipX(false);
        }
        else {
            this.player.setVelocityX(0);
            this.player.anims.play('turn');
        }

        // Jump logic
        if (canJump) {
            this.player.setVelocityY(-530);
        }

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

// Hook up the character select DOM element if present
window.addEventListener('DOMContentLoaded', () => {
    const select = document.getElementById('character-select');
    if (select) {
        select.addEventListener('change', (e) => {
            const key = e.target.value;
            const scene = game.scene.keys['MainScene'];
            if (scene) scene.switchCharacter(key);
        });
    }
});