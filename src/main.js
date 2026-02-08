import Phaser from 'phaser';
import { io } from 'socket.io-client';
import kiwi from '../assests/kiwi_sprites/chill.png';
// import man from '../assests/kiwi_sprites/man.png';
import kiwi_move from '../assests/kiwi_sprites/chill_move.png';
import kiwi_jump from '../assests/kiwi_sprites/chill_jump.png';
import sofi from '../assests/sofi_sprites/smiley.png';
import sofi_move from '../assests/sofi_sprites/smiley_move.png';
import sofi_jump from '../assests/sofi_sprites/smiley_jump.png';
import { Player } from './Player.js';
import { KeyboardTracker } from './KeyboardTracker.js';
import charactersConfig from './charactersConfig.json';

const CharacterNames = Object.keys(charactersConfig);

class MainScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainScene' });
        // this.debugText = null;
        // this.currentCharacter = Math.random() < 0.5 ? 'kiwi' : 'sofi';
        this.currentCharacter = CharacterNames[Math.floor(Math.random() * CharacterNames.length)];
        // this.currentCharacter = null; // Don't assign random character initially
        // this.otherPlayers = {};
        // this.socket = null;
        // this.lastPlayerState = { x: 0, y: 0, flipX: false, animation: 'turn' };
        // this.updateInterval = 1; 
        // this.lastUpdateTime = 0;
        this.gameCreated = false; // Track if game has been created
        // this.charactersConfig = JSON.parse(charactersConfig);
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
        // Add debug text first so it's always visible
        // this.debugText = this.add.text(16, 50, 'Waiting for server...', { fontSize: '18px', fill: '#fff' });
        
        // Initialize keyboard tracker after scene is created
        this.keyboardTracker = new KeyboardTracker(this);
        
        // Add background
       this.createBackground();

        // Create platforms first (they don't depend on character)
        this.createPlatforms();
        this.createPlayer();

        this.physics.add.collider(this.player, this.platforms);
        
        // Create character selection UI
        this.createCharacterSelectUI();
        this.gameCreated = true;

        // Initialize Socket.IO connection - wait for character assignment before creating player
        // this.initializeSocket();
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
            if (characterKey === this.currentCharacter) {
                option.selected = true;
            }
            select.appendChild(option);
        });

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

    // initializeSocket() {
    //     // Connect to the server (change this URL if your server is on a different host)
    //     this.socket = io('http://localhost:3000', {
    //         reconnection: true,
    //         reconnectionDelay: 1000,
    //         reconnectionAttempts: 3
    //     });

    //     // Fallback: If no character assigned within 2 seconds, assign random character
    //     const fallbackTimeout = setTimeout(() => {
    //         if (!this.currentCharacter) {
    //             console.log('Server not responding, using fallback character assignment');
    //             this.currentCharacter = Math.random() < 0.5 ? 'kiwi' : 'sofi';
    //             this.createPlayer();
    //             this.updateCharacterSelect();
    //         }
    //     }, 2000);

    //     // Listen for connection errors
    //     this.socket.on('connect_error', (error) => {
    //         console.log('Connection error:', error.message);
    //     });

    //     this.socket.on('connect', () => {
    //         console.log('Connected to server');
    //     });

    //     // Listen for character assignment from server
    //     this.socket.on('characterAssigned', (data) => {
    //         clearTimeout(fallbackTimeout);
    //         console.log('Server assigned character:', data.character);
    //         this.currentCharacter = data.character;
            
    //         // Create the player now that we have the character assignment
    //         this.createPlayer();
            
    //         // Update the UI
    //         this.updateCharacterSelect();
            
    //         // Check if we should disable character selection
    //         this.checkMultiplayerMode();
    //     });

    //     // Listen for current players
    //     this.socket.on('currentPlayers', (players) => {
    //         Object.keys(players).forEach((id) => {
    //             if (id !== this.socket.id) {
    //                 this.addOtherPlayer(players[id]);
    //             }
    //         });
            
    //         // Check if we're in multiplayer mode
    //         this.checkMultiplayerMode();
    //     });

    //     // Listen for new players
    //     this.socket.on('newPlayer', (playerInfo) => {
    //         this.addOtherPlayer(playerInfo);
            
    //         // Disable character selection when another player joins
    //         this.checkMultiplayerMode();
    //     });

    //     // Listen for player movement
    //     this.socket.on('playerMoved', (playerInfo) => {
    //         if (this.otherPlayers[playerInfo.id]) {
    //             const otherPlayer = this.otherPlayers[playerInfo.id];
    //             otherPlayer.setPosition(playerInfo.x, playerInfo.y);
    //             otherPlayer.setFlipX(playerInfo.flipX);
    //             if (playerInfo.animation && otherPlayer.lastAnimation !== playerInfo.animation) {
    //                 otherPlayer.anims.play(playerInfo.id + '_' + playerInfo.animation, true);
    //                 otherPlayer.lastAnimation = playerInfo.animation;
    //             }
    //         }
    //     });

    //     // Listen for character change rejection
    //     this.socket.on('characterChangeRejected', (data) => {
    //         console.log(data.message);
    //         alert('Cannot change character in multiplayer mode!');
            
    //         // Revert to assigned character
    //         this.currentCharacter = data.assignedCharacter;
    //         this.updateCharacterSelect();
    //     });

    //     // Listen for character changes
    //     this.socket.on('playerCharacterChanged', (data) => {
    //         if (this.otherPlayers[data.id]) {
    //             const otherPlayer = this.otherPlayers[data.id];
    //             const oldPos = { x: otherPlayer.x, y: otherPlayer.y };
    //             const oldFlip = otherPlayer.flipX;
                
    //             // Remove old sprite
    //             otherPlayer.destroy();
                
    //             // Create new sprite with new character - no green tint
    //             const newPlayer = this.add.sprite(oldPos.x, oldPos.y, data.character);
    //             newPlayer.setScale(0.1);
    //             newPlayer.setFlipX(oldFlip);
                
    //             // Create animations for this player
    //             this.createAnimationsForPlayer(data.id, data.character);
                
    //             this.otherPlayers[data.id] = newPlayer;
    //             this.otherPlayers[data.id].lastAnimation = '';
    //         }
    //     });

    //     // Listen for player disconnections
    //     this.socket.on('playerDisconnected', (playerId) => {
    //         if (this.otherPlayers[playerId]) {
    //             this.otherPlayers[playerId].destroy();
    //             delete this.otherPlayers[playerId];
    //             // Remove animations for this player
    //             ['left', 'turn', 'right', 'jump'].forEach(anim => {
    //                 const key = playerId + '_' + anim;
    //                 if (this.anims.exists(key)) {
    //                     this.anims.remove(key);
    //                 }
    //             });
    //         }
            
    //         // Re-enable character selection if we're back to single player
    //         this.checkMultiplayerMode();
    //     });
    // }

    // checkMultiplayerMode() {
    //     const playerCount = Object.keys(this.otherPlayers).length + 1; // +1 for local player
    //     const select = document.getElementById('character-select');
        
    //     if (select) {
    //         if (playerCount > 1) {
    //             // Multiplayer mode - disable character selection
    //             select.disabled = true;
    //             select.title = 'Character selection disabled in multiplayer mode';
    //         } else {
    //             // Single player mode - enable character selection
    //             select.disabled = false;
    //             select.title = 'Select your character';
    //         }
    //     }
    // }

    // addOtherPlayer(playerInfo) {
    //     // Use add.sprite instead of physics.add.sprite - other players don't need physics
    //     const otherPlayer = this.add.sprite(playerInfo.x, playerInfo.y, playerInfo.character);
    //     otherPlayer.setScale(0.1);
    //     // Removed green tint - other players now appear in their natural colors
    //     this.otherPlayers[playerInfo.id] = otherPlayer;
        
    //     // Store last animation state to prevent blinking
    //     this.otherPlayers[playerInfo.id].lastAnimation = '';
        
    //     // Create animations for this player
    //     this.createAnimationsForPlayer(playerInfo.id, playerInfo.character);
    // }

    // createAnimationsForPlayer(playerId, character) {
    //     // Create unique animations for each other player
    //     this.anims.create({
    //         key: playerId + '_left',
    //         frames: [{ key: `${character}_move` }],
    //         frameRate: 10,
    //         repeat: -1
    //     });
    //     this.anims.create({
    //         key: playerId + '_turn',
    //         frames: [{ key: character }],
    //         frameRate: 20
    //     });
    //     this.anims.create({
    //         key: playerId + '_right',
    //         frames: [{ key: `${character}_move` }],
    //         frameRate: 10,
    //         repeat: -1
    //     });
    //     this.anims.create({
    //         key: playerId + '_jump',
    //         frames: [{ key: `${character}_jump` }],
    //         frameRate: 10,
    //         repeat: -1
    //     });
    // }

    // updateCharacterSelect() {
    //     const select = document.getElementById('character-select');
    //     if (select) {
    //         select.value = this.currentCharacter;
    //     }
    // }

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
        
        // Notify server about character change if needed
        // if (this.socket) {
        //     this.socket.emit('characterChange', { character: characterKey });
        // }
    }

    update(time) {
        // Horizontal movement and jump are independent (can do both at once)
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
        
  
        // this.player.idle();

        // Only send updates if enough time has passed and state has changed
        // if (this.socket && time > this.lastUpdateTime + this.updateInterval) {
        //     const currentState = {
        //         x: Math.round(this.player.x),
        //         y: Math.round(this.player.y),
        //         flipX: this.player.flipX,
        //         animation: currentAnimation
        //     };

        //     // Check if state has actually changed
        //     if (currentState.x !== this.lastPlayerState.x ||
        //         currentState.y !== this.lastPlayerState.y ||
        //         currentState.flipX !== this.lastPlayerState.flipX ||
        //         currentState.animation !== this.lastPlayerState.animation) {
                
        //         this.socket.emit('playerMovement', currentState);
        //         this.lastPlayerState = currentState;
        //         this.lastUpdateTime = time;
        //     }
        // }

        // Update position text
        // const positionText = this.children.getByName('positionText');
        // if (positionText) {
            // positionText.setText(`Позиція: X: ${Math.floor(this.player.x)}, Y: ${Math.floor(this.player.y)}`);
        // }
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