import Phaser from 'phaser';

export class KeyboardTracker{
    constructor(scene) {
        this.moveLeft = false;
        this.moveRight = false;
        this.jump = false;

        this.scene = scene;
        this.keyboard = this.scene.input.keyboard;

        this.keyboard.on('keydown', (e) => this.onKey(e, true), this);
        this.keyboard.on('keyup', (e) => this.onKey(e, false), this);
    }


    onKey(event, isDown) {
        console.log('Key event:', event.code, 'isDown:', isDown);
        switch(event.code) {
            case 'ArrowLeft':
            case 'KeyA':
                this.moveLeft = isDown;
                break;
            case 'ArrowRight':
            case 'KeyD':
                this.moveRight = isDown;
                break;
            case 'ArrowUp':
            case 'KeyW':
            case 'Space':
                this.jump = isDown;
                break;
        }
    }


    onDestroy() {
        this.keyboard.off('keydown', this.onKey, this);
        this.keyboard.off('keyup', this.onKey, this);
    }
}