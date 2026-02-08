import Phaser from 'phaser';
import { Player } from './Player.js';
import { KeyboardTracker } from './KeyboardTracker.js';
import { NetworkManager, SocketEvents } from './NetworkManager.js';
import charactersConfig from './charactersConfig.json';

const CharacterNames = Object.keys(charactersConfig);

const USE_MULTIPLAYER = true;
/** Send movement at ~60 Hz for smooth sync (1000/60 ≈ 16.67ms). */
const MOVEMENT_UPDATE_INTERVAL_MS = 1000 / 60;
const CHARACTER_ASSIGN_FALLBACK_MS = 2000;
/** Lerp factor per frame for remote player position. */
const REMOTE_PLAYER_LERP = 0.28;

class MainScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainScene' });
        this.gameCreated = false;
        if (USE_MULTIPLAYER) {
            this.currentCharacter = null;
            this.otherPlayers = {};
            this.lastPlayerState = { x: 0, y: 0, flipX: false, animation: 'idle' };
            this.lastUpdateTime = 0;
        } else {
            this.currentCharacter = CharacterNames[Math.floor(Math.random() * CharacterNames.length)];
        }
    }

    preload() {
        Object.values(charactersConfig).forEach(character => {
            this.load.spritesheet(character.spriteKey, character.spritesheetPath, character.spritesheetConfig);
        });
        // Load both character images
        
        // this.load.spritesheet('man_spritesheet', 
        //     man, 
        //     { 
        //       frameWidth: 120,  // ширина одного фрейму
        //       frameHeight: 200,  // висота одного фрейму
        //     //   marginLeft: 40,
        //     //   spacing: 0
        //     }
        //   );
        // this.load.image('sofi', sofi);
        // this.load.image('sofi_move', sofi_move);
        // this.load.image('sofi_jump', sofi_jump);
        // this.load.image('kiwi', kiwi);
        // this.load.image('kiwi_jump', kiwi_jump);
        // this.load.image('kiwi_move', kiwi_move);
    }

    create() {
        this.keyboardTracker = new KeyboardTracker(this);
        this.createBackground();
        this.createPlatforms();
        this.createCharacterSelectUI();

        if (USE_MULTIPLAYER) {
            this.initializeSocket();
        } else {
            this.createPlayer();
            this.physics.add.collider(this.player, this.platforms);
            this.gameCreated = true;
        }
    }

    initializeSocket() {
        this.networkManager = new NetworkManager();
        const fallbackTimeout = setTimeout(() => {
            if (!this.currentCharacter) {
                this.currentCharacter = CharacterNames[Math.floor(Math.random() * CharacterNames.length)];
                this.createPlayer();
                this.physics.add.collider(this.player, this.platforms);
                this.gameCreated = true;
                this.updateCharacterSelect();
            }
        }, CHARACTER_ASSIGN_FALLBACK_MS);

        this.networkManager.on(SocketEvents.CONNECT_ERROR, (err) => {
            console.warn('Socket connect_error:', err?.message ?? err);
        });
        this.networkManager.on(SocketEvents.CONNECT, () => {
            console.log('Connected to server');
        });
        this.networkManager.on(SocketEvents.CHARACTER_ASSIGNED, (data) => {
            clearTimeout(fallbackTimeout);
            if (!this.currentCharacter) {
                this.currentCharacter = data.character;
                this.createPlayer();
                this.physics.add.collider(this.player, this.platforms);
                this.gameCreated = true;
                this.updateCharacterSelect();
                this.checkMultiplayerMode();
            }
        });
        this.networkManager.on(SocketEvents.CURRENT_PLAYERS, (players) => {
            Object.keys(players).forEach((id) => {
                if (id !== this.networkManager.id) {
                    this.addOtherPlayer(players[id]);
                }
            });
            this.checkMultiplayerMode();
        });
        this.networkManager.on(SocketEvents.NEW_PLAYER, (playerInfo) => {
            this.addOtherPlayer(playerInfo);
            this.checkMultiplayerMode();
        });
        this.networkManager.on(SocketEvents.PLAYER_MOVED, (playerInfo) => {
            const other = this.otherPlayers[playerInfo.id];
            if (!other) return;
            other.targetX = playerInfo.x;
            other.targetY = playerInfo.y;
            other.setFlipX(!!playerInfo.flipX);
            const anim = playerInfo.animation === 'turn' ? 'idle' : (playerInfo.animation || 'idle');
            if (other.lastAnimation !== anim) {
                const key = `${playerInfo.id}_${anim}`;
                if (this.anims.exists(key)) {
                    other.play(key, true);
                }
                other.lastAnimation = anim;
            }
        });
        this.networkManager.on(SocketEvents.CHARACTER_CHANGE_REJECTED, (data) => {
            console.warn(data.message);
            this.currentCharacter = data.assignedCharacter;
            this.updateCharacterSelect();
        });
        this.networkManager.on(SocketEvents.PLAYER_CHARACTER_CHANGED, (data) => {
            const other = this.otherPlayers[data.id];
            if (!other) return;
            const x = other.x;
            const y = other.y;
            const flipX = other.flipX;
            other.destroy();
            const config = charactersConfig[data.character];
            if (!config) return;
            const sprite = this.add.sprite(x, y, config.spriteKey);
            sprite.setScale(config.scale);
            sprite.setFlipX(flipX);
            sprite.targetX = x;
            sprite.targetY = y;
            sprite.lastAnimation = '';
            this.otherPlayers[data.id] = sprite;
            this.createAnimationsForPlayer(data.id, data.character);
        });
        this.networkManager.on(SocketEvents.PLAYER_DISCONNECTED, (playerId) => {
            const other = this.otherPlayers[playerId];
            if (other) {
                other.destroy();
                delete this.otherPlayers[playerId];
                ['idle', 'walk', 'jump'].forEach((anim) => {
                    const key = `${playerId}_${anim}`;
                    if (this.anims.exists(key)) this.anims.remove(key);
                });
            }
            this.checkMultiplayerMode();
        });

        this.networkManager.connect();
    }

    checkMultiplayerMode() {
        const count = Object.keys(this.otherPlayers).length + (this.player ? 1 : 0);
        const select = document.getElementById('character-select');
        if (select) {
            select.disabled = count > 1;
            select.title = count > 1 ? 'Character selection disabled in multiplayer' : 'Select your character';
        }
    }

    addOtherPlayer(playerInfo) {
        const config = charactersConfig[playerInfo.character];
        if (!config) return;
        const x = playerInfo.x ?? 100;
        const y = playerInfo.y ?? 400;
        const sprite = this.add.sprite(x, y, config.spriteKey);
        sprite.setScale(config.scale);
        sprite.setFlipX(!!playerInfo.flipX);
        sprite.targetX = x;
        sprite.targetY = y;
        sprite.lastAnimation = '';
        this.otherPlayers[playerInfo.id] = sprite;
        this.createAnimationsForPlayer(playerInfo.id, playerInfo.character);
    }

    createAnimationsForPlayer(playerId, characterKey) {
        const config = charactersConfig[characterKey];
        if (!config?.animations) return;
        /** Match display refresh for 60 fps feel. */
        const frameRate = 60;
        Object.entries(config.animations).forEach(([animKey, frames]) => {
            const key = `${playerId}_${animKey}`;
            if (this.anims.exists(key)) return;
            this.anims.create({
                key,
                frames: this.anims.generateFrameNumbers(config.spriteKey, frames),
                frameRate,
                repeat: animKey === 'idle' ? -1 : 0
            });
        });
    }

    updateCharacterSelect() {
        const select = document.getElementById('character-select');
        if (select && this.currentCharacter) select.value = this.currentCharacter;
    }

    createBackground() {
        // Add background
        this.add.rectangle(400, 300, 800, 600, 0x87ceeb);
    }

    createCharacterSelectUI() {
        // Create character selection UI dynamically
        const topBar = document.createElement('div');
        topBar.className = 'top-bar';
        topBar.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            display: flex;
            gap: 8px;
            align-items: center;
            z-index: 10;
            font-size: 14px;
            font-family: Arial, sans-serif;
        `;

        const label = document.createElement('label');
        label.htmlFor = 'character-select';
        label.textContent = 'Персонаж:';
        label.style.color = '#ecf0f1';

        const select = document.createElement('select');
        select.id = 'character-select';
        select.style.cssText = `
            background: #34495e;
            color: #ecf0f1;
            border: 1px solid #566573;
            padding: 4px 8px;
            border-radius: 4px;
        `;

        // Populate options from charactersConfig
        Object.keys(charactersConfig).forEach(characterKey => {
            const option = document.createElement('option');
            option.value = characterKey;
            option.textContent = charactersConfig[characterKey].name;
            if (this.currentCharacter && characterKey === this.currentCharacter) {
                option.selected = true;
            }
            select.appendChild(option);
        });
        if (USE_MULTIPLAYER && !this.currentCharacter) {
            const waitOpt = document.createElement('option');
            waitOpt.value = '';
            waitOpt.textContent = '— очікування сервера —';
            waitOpt.disabled = true;
            select.insertBefore(waitOpt, select.firstChild);
            select.value = '';
        }

        // Add event listener for character change
        select.addEventListener('change', (e) => {
            const newCharacter = e.target.value;
            this.switchCharacter(newCharacter);
            e.target.blur(); // Release focus so Space/jump works instead of opening dropdown
        });

        topBar.appendChild(label);
        topBar.appendChild(select);
        
        // Add to game container's parent
        const gameContainer = document.getElementById('game-container');
        if (gameContainer && gameContainer.parentElement) {
            gameContainer.parentElement.appendChild(topBar);
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


        // Debug / info text
        // this.add.text(16, 16, 'Use arrow keys or WASD to move', { fontSize: '18px', fill: '#fff' });
        // this.add.text(16, 50, 'Position: X: 0, Y: 0', { fontSize: '16px', fill: '#ffffff' }).setName('positionText');
    }

    createPlayer() {
        if (this.gameCreated || !this.currentCharacter) return;
        
        // Create player using Player class
        this.player = new Player(this);

        
        // Create player with assigned character
        // this.player = this.physics.add.sprite(100, 400, this.currentCharacter);
        // this.player.setScale(1);
        // this.player.body.setSize(this.player.displayWidth, this.player.displayHeight + 568, true);
        // this.player.setBounce(0.2);
        // this.player.setCollideWorldBounds(true);
        // this.player.body.setGravityY(300);
        

        // // Create animations with different sprites for each state
        // this.anims.create({
        //     key: 'left',
        //     frames: [{ key: `${this.currentCharacter}_move` }],
        //     frameRate: 10,
        //     repeat: -1
        // });
        // this.anims.create({
        //     key: 'turn',
        //     frames: [{ key: this.currentCharacter }],
        //     frameRate: 20
        // });
        // this.anims.create({
        //     key: 'right',
        //     frames: [{ key: `${this.currentCharacter}_move` }],
        //     frameRate: 10,
        //     repeat: -1
        // });
        // this.anims.create({
        //     key: 'jump',
        //     frames: [{ key: `${this.currentCharacter}_jump` }],
        //     frameRate: 10,
        //     repeat: -1
        // });

        // this.debugText.setText('Character: ' + this.currentCharacter);
        // this.gameCreated = true;
    }

    switchCharacter(characterKey) {
        if (!this.player || !charactersConfig[characterKey]) return;
        
        // Store current position and physics state
        const currentX = this.player.x;
        const currentY = this.player.y;
        const currentVelocityX = this.player.body.velocity.x;
        const currentVelocityY = this.player.body.velocity.y;
        
        // Remove current player
        this.player.destroy();
        
        // Update current character
        this.currentCharacter = characterKey;
        
        // Create new player with new character
        this.player = new Player(this);
        
        // Restore position and velocity
        this.player.setPosition(currentX, currentY);
        this.player.setVelocity(currentVelocityX, currentVelocityY);
        
        // Re-add physics collider
        this.physics.add.collider(this.player, this.platforms);
        if (USE_MULTIPLAYER && this.networkManager?.isConnected) {
            this.networkManager.emit(SocketEvents.CHARACTER_CHANGE, { character: characterKey });
        }
    }

    update(time) {
        if (!this.player) return;
        if (this.keyboardTracker.moveLeft) {
            this.player.moveLeft();
        } else if (this.keyboardTracker.moveRight) {
            this.player.moveRight();
        } else {
            this.player.idle();
        }
        if (this.keyboardTracker.jump) {
            this.player.jump();
        }
        if (USE_MULTIPLAYER && this.networkManager?.isConnected && time > this.lastUpdateTime + MOVEMENT_UPDATE_INTERVAL_MS) {
            const animation = this.player.body.velocity.y !== 0 ? 'jump' : (this.player.body.velocity.x !== 0 ? 'walk' : 'idle');
            const state = {
                x: Math.round(this.player.x),
                y: Math.round(this.player.y),
                flipX: this.player.flipX,
                animation
            };
            if (state.x !== this.lastPlayerState.x || state.y !== this.lastPlayerState.y ||
                state.flipX !== this.lastPlayerState.flipX || state.animation !== this.lastPlayerState.animation) {
                this.networkManager.emit(SocketEvents.PLAYER_MOVEMENT, state);
                this.lastPlayerState = state;
                this.lastUpdateTime = time;
            }
        }
        // Smooth interpolation for remote players (avoids 50ms position snaps)
        if (USE_MULTIPLAYER && this.otherPlayers) {
            Object.values(this.otherPlayers).forEach((sprite) => {
                if (sprite.targetX != null && sprite.targetY != null) {
                    sprite.x = Phaser.Math.Linear(sprite.x, sprite.targetX, REMOTE_PLAYER_LERP);
                    sprite.y = Phaser.Math.Linear(sprite.y, sprite.targetY, REMOTE_PLAYER_LERP);
                }
            });
        }
    }       

    // shutdown() {
    //     // Clean up keyboard tracker when scene is destroyed
    //     if (this.keyboardTracker) {
    //         this.keyboardTracker.onDestroy();
    //     }
    // }
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

// Character selection is now handled dynamically in the scene