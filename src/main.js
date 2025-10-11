import Phaser from 'phaser';
import kiwi from '../assests/kiwi_sprites/chill.png';
import sofi from '../assests/sofi_sprites/smiley.png';

class MainScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainScene' });
        this.debugText = null;
    }

    preload() {
       
    }

    create() {
        // Add debug text first so it's always visible
        this.debugText = this.add.text(16, 50, 'Loading...', { fontSize: '18px', fill: '#fff' });
        
        // Add background
        this.add.rectangle(400, 300, 800, 600, 0x87ceeb);

        // Load the sprite directly
        const image = new Image();
        image.onload = () => {
            try {
                this.textures.addImage('dog', image);
                this.debugText.setText('Dog texture loaded successfully');
                this.createGame();
            } catch (error) {
                this.debugText.setText('Error creating texture: ' + error.message);
                console.error('Error creating texture:', error);
            }
        };
        image.onerror = (error) => {
            console.error('Error loading dog texture:', error);
        };
        image.src = sofi;
    }

    createGame() {
        // Make sure the texture exists before creating the sprite
        if (!this.textures.exists('dog')) {
            console.error('Dog texture not loaded yet');
            return;
        }
        // Create platform textures
        this.add.graphics()
            .fillStyle(0x24cc71)
            .fillRect(0, 0, 400, 32)
            .generateTexture('ground', 400, 32);
        
        this.add.graphics()
            .fillStyle(0x27ae60)
            .fillRect(0, 0, 200, 32)
            .generateTexture('platform', 200, 32);
        // Створюємо групу для платформ
        this.platforms = this.physics.add.staticGroup();

        // Create ground and platforms
        this.platforms.create(400, 568, 'ground').setScale(2, 1).refreshBody();
        this.platforms.create(600, 400, 'platform');
        this.platforms.create(50, 250, 'platform');
        this.platforms.create(750, 220, 'platform');

        // Create player with the dog sprite
        this.player = this.physics.add.sprite(100, 400, 'dog');
        this.player.setScale(0.1);
        this.player.setBounce(0.2);
        this.player.setCollideWorldBounds(true);
        this.player.body.setGravityY(300);

        // Add collision between player and platforms
        this.physics.add.collider(this.player, this.platforms);

        // Create simple animations
        this.anims.create({
            key: 'left',
            frames: [ { key: 'dog' } ],
            frameRate: 10,
            repeat: -1
        });

        this.anims.create({
            key: 'turn',
            frames: [ { key: 'dog' } ],
            frameRate: 20
        });

        this.anims.create({
            key: 'right',
            frames: [ { key: 'dog' } ],
            frameRate: 10,
            repeat: -1
        });

        // Set up keyboard input
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys({
            W: Phaser.Input.Keyboard.KeyCodes.W,
            A: Phaser.Input.Keyboard.KeyCodes.A,
            S: Phaser.Input.Keyboard.KeyCodes.S,
            D: Phaser.Input.Keyboard.KeyCodes.D
        });
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

        // Add debug text for controls
        this.add.text(16, 16, 'Use arrow keys or WASD to move', { fontSize: '18px', fill: '#fff' });
        this.add.text(16, 50, 'Position: X: 0, Y: 0', { fontSize: '16px', fill: '#ffffff' }).setName('positionText');
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

        // Оновлення позиції в тексті
        const positionText = this.children.getByName('positionText');
        if (positionText) {
            positionText.setText(`Позиція: X: ${Math.floor(this.player.x)}, Y: ${Math.floor(this.player.y)}`);
        }
    }
}

// Конфігурація гри
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

// Запуск гри
const game = new Phaser.Game(config);