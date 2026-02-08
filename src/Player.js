import charactersConfig from './charactersConfig.json';

export class Player extends Phaser.Physics.Arcade.Sprite { 
    constructor(scene) {
      super(scene, charactersConfig[scene.currentCharacter].startingPosition.x, charactersConfig[scene.currentCharacter].startingPosition.y, charactersConfig[scene.currentCharacter].spriteKey);
            this.config = charactersConfig[scene.currentCharacter];
        
      scene.add.existing(this);
      scene.physics.add.existing(this);
      this.setScale(this.config.scale);
      this.body.setCollideWorldBounds(true);
      // this.setBounce(0.2);
        //  this.body.setSize(this.displayWidth, this.displayHeight + 568, true);
      this.body.setGravityY(300);

      this._createAnimations();
    }
    
     _createAnimations() {
        Object.entries(this.config.animations).forEach(([key, frames]) => {
            this.scene.anims.create({
              key: `${this.config.id}_${key}`,
              frames: this.scene.anims.generateFrameNumbers(this.config.spriteKey, frames),
              frameRate: 16,
              repeat: key === 'idle'  ? -1 : 0
            });
          });
    }
    
    _playAnimation(animType) {
      this.play(`${this.config.id}_${animType}`, true);
    }

    moveRight() {
      this.setVelocityX(this.config.physics.speed);
      this._playAnimation('walk');
      // Sprite faces right in art: no flip. Sprite faces left: flip.
      this.setFlipX(!this.config.spriteFacesRight);
    }
    
    moveLeft() {
      this.setVelocityX(-this.config.physics.speed);
      this._playAnimation('walk');
      this.setFlipX(!!this.config.spriteFacesRight);
    }

    idle() {
      this.setVelocityX(0);
      this._playAnimation('idle');
    }
    
    jump() {
      // Only jump when grounded so holding the key doesn't apply velocity every frame
      if (this.body.blocked.down || this.body.touching.down) {
        this.setVelocityY(this.config.physics.jumpVelocity);
        this._playAnimation('jump');
      }
    }
  }