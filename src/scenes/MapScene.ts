// The level map: the route from Wieliczka to Wawel. Places unlock one by one (src/levels/route.ts); the sisters
// stand on the chosen place and trot along the path to the next. ←/→ (or a tap) chooses, Enter (or a tap on the
// chosen place) plays, Esc goes back to the title. The drawing is placeholder art until the map illustration (M7.4).
import Phaser from 'phaser';
import { CHARACTER_KEYS } from '../characters';
import { t } from '../i18n';
import { LEVELS } from '../levels';
import type { CutsceneId } from '../cutscenes';
import {
    arrivalToPlay, currentLocationIndex, isPlayable, levelToPlay, locationIndexOf, locationStatus, ROUTE, type Location,
    type LocationStatus,
} from '../levels/route';
import { parseTiledMap, type TiledMap } from '../levels/tiled';
import { loadProgress, loadSeenCutscenes } from '../persistence';
import type { Progress } from '../progress';
import type { CutsceneSceneData } from './CutsceneScene';
import type { GameSceneData } from './GameScene';
import { FONT_FAMILY, SceneKey, TEXT_STYLE, VIEW } from './shared';

/** Data passed to scene.start(SceneKey.Map, …). Always pass an object: Phaser keeps old data otherwise. */
export interface MapSceneData {
    /** The level just finished: the sisters start there and walk on if that opened the next place */
    finishedLevel?: string;
}

const COLORS = {
    land: 0xa5d6a7,
    park: 0x81c784,
    river: 0x4fc3f7,
    riverEdge: 0x29b6f6,
    path: 0xfff3d6,
    pathLocked: 0xb0bec5,
    open: 0xf2994a,
    done: 0x66bb6a,
    locked: 0x90a4ae,
    outline: 0x2c3e50,
} as const;
const MARKER_RADIUS = 22;
/** Walking speed of the sisters on the map (px/s) */
const WALK_SPEED = 220;
const PANEL_Y = 534;

export class MapScene extends Phaser.Scene {
    private progress: Progress = {};
    private statuses: LocationStatus[] = [];
    private selected = 0;
    private walking = false;
    private sisters: Phaser.GameObjects.Sprite[] = [];
    private ring!: Phaser.GameObjects.Arc;
    private infoName!: Phaser.GameObjects.Text;
    private infoDetail!: Phaser.GameObjects.Text;
    private storyButton!: Phaser.GameObjects.Text;
    private seen: ReadonlySet<string> = new Set();
    private finishedLevel: string | undefined;

    constructor() {
        super(SceneKey.Map);
    }

    init(data: MapSceneData = {}) {
        this.finishedLevel = data.finishedLevel;
    }

    create() {
        this.progress = loadProgress();
        this.seen = loadSeenCutscenes();
        this.statuses = ROUTE.map(location => locationStatus(location, this.progress));
        this.walking = false;

        // Start where the last level was finished (or where the player should continue). Arriving at a place for the
        // first time plays its scene first (on a fresh start: the intro)
        const finishedAt = this.finishedLevel ? locationIndexOf(this.finishedLevel) : -1;
        const target = currentLocationIndex(this.progress);
        this.selected = finishedAt >= 0 ? finishedAt : target;
        if (finishedAt < 0 && this.playArrival(this.selected)) return;

        this.drawLand();
        this.drawPaths();
        this.ring = this.add.circle(0, 0, MARKER_RADIUS + 7).setStrokeStyle(4, 0xffffff);
        this.tweens.add({ targets: this.ring, scale: 1.12, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        ROUTE.forEach((location, index) => this.drawLocation(location, index));
        this.drawTitleAndPanel();

        // Walk on if the finished level just opened the next place
        this.createSisters();
        this.showSelection();
        if (finishedAt >= 0 && target !== finishedAt && isPlayable(this.statuses[target] ?? 'locked')) {
            this.time.delayedCall(500, () => this.walkTo(target));
        }

        const keyboard = this.input.keyboard;
        keyboard?.on('keydown-LEFT', () => this.step(-1));
        keyboard?.on('keydown-A', () => this.step(-1));
        keyboard?.on('keydown-RIGHT', () => this.step(1));
        keyboard?.on('keydown-D', () => this.step(1));
        keyboard?.on('keydown-ENTER', () => this.play());
        keyboard?.on('keydown-SPACE', () => this.play());
        keyboard?.on('keydown-ESC', () => this.scene.start(SceneKey.Title));
    }

    /** ←/→ moves to the previous/next place along the route that can be played (skipping locked ones). */
    private step(direction: 1 | -1) {
        for (let i = this.selected + direction; i >= 0 && i < ROUTE.length; i += direction) {
            if (isPlayable(this.statuses[i] ?? 'locked')) return this.walkTo(i);
        }
    }

    private walkTo(index: number) {
        if (this.walking || index === this.selected) return;
        const from = ROUTE[this.selected];
        const to = ROUTE[index];
        if (!from || !to) return;
        this.walking = true;
        this.selected = index;
        this.showSelection();
        // Along the path through every place in between, so the sisters never cut across the map
        const step = index > ROUTE.indexOf(from) ? 1 : -1;
        const stops: Location[] = [];
        for (let i = ROUTE.indexOf(from) + step; i !== index + step; i += step) stops.push(ROUTE[i] as Location);
        const walkNext = (previous: Location) => {
            const next = stops.shift();
            if (!next) {
                this.walking = false;
                this.sisters.forEach((sister, i) => sister.play(`${CHARACTER_KEYS[i]}_idle`));
                this.playArrival(index);
                return;
            }
            const duration = (Phaser.Math.Distance.BetweenPoints(previous.at, next.at) / WALK_SPEED) * 1000;
            this.sisters.forEach((sister, i) => {
                sister.play(`${CHARACTER_KEYS[i]}_move`, true).setFlipX(next.at.x < previous.at.x);
                this.tweens.add({
                    targets: sister, ...this.sisterSpot(next, i), duration, ease: 'Linear',
                    // One sister's tween drives the next leg, so the walk and the "arrived" step can't drift apart
                    onComplete: i === 0 ? () => walkNext(next) : undefined,
                });
            });
        };
        walkNext(from);
    }

    /** Plays a place's arrival scene if it hasn't been seen yet; returns whether it did. Comes back to the map. */
    private playArrival(index: number): boolean {
        const location = ROUTE[index];
        const id = location && arrivalToPlay(location, this.statuses[index] ?? 'locked', this.seen);
        if (!id) return false;
        this.playCutscene(id);
        return true;
    }

    private playCutscene(id: CutsceneId) {
        const data: CutsceneSceneData = { id, then: { key: SceneKey.Map, data: {} satisfies MapSceneData } };
        this.scene.start(SceneKey.Cutscene, data);
    }

    /** Enter/Space/tap: start the chosen place's level */
    private play() {
        const location = ROUTE[this.selected];
        if (this.walking || !location || !isPlayable(this.statuses[this.selected] ?? 'locked')) return;
        const levelKey = levelToPlay(location, this.progress);
        if (!levelKey) return;
        const data: GameSceneData = { levelKey };
        this.scene.start(SceneKey.Game, data);
    }

    /** Tap a place: play it if it's already chosen, otherwise walk there. Locked places give a little shake. */
    private tapLocation(index: number, marker: Phaser.GameObjects.Container) {
        if (!isPlayable(this.statuses[index] ?? 'locked')) {
            this.tweens.add({ targets: marker, x: marker.x + 4, duration: 50, yoyo: true, repeat: 2 });
            return;
        }
        if (index === this.selected) this.play();
        else this.walkTo(index);
    }

    private showSelection() {
        const location = ROUTE[this.selected];
        if (!location) return;
        this.ring.setPosition(location.at.x, location.at.y);
        this.infoName.setText(t(location.name));
        this.infoDetail.setText(this.describe(location, this.statuses[this.selected] ?? 'locked'));
        // Scenes seen before can be watched again
        this.storyButton.setVisible(location.arrival !== undefined && this.seen.has(location.arrival));
    }

    private describe(location: Location, status: LocationStatus): string {
        if (status === 'soon') return t('map.soon');
        if (status === 'locked') return t('map.locked');
        const levelKey = levelToPlay(location, this.progress);
        const record = levelKey ? this.progress[levelKey] : undefined;
        if (!levelKey || !record) return t('map.notPlayed');
        const parts = [t('finish.best', { seconds: record.bestSeconds.toFixed(1) })];
        const total = this.treatsIn(levelKey);
        if (total > 0) parts.push(t('hud.treats', { treats: record.bestTreats, total }));
        return parts.join('    ');
    }

    /** How many treats a level has, read from its map (already loaded by the preloader) */
    private treatsIn(levelKey: string): number {
        if (!LEVELS.some(level => level.key === levelKey)) return 0;
        const map = this.cache.tilemap.get(levelKey)?.data as TiledMap | undefined;
        return map ? parseTiledMap(levelKey, map).pickups.length : 0;
    }

    /** Feet positions of the two sisters next to a place's marker (Kiwi left, Sofi right) */
    private sisterSpot(location: Location, index: number) {
        return { x: location.at.x + (index === 0 ? -16 : 16), y: location.at.y - MARKER_RADIUS + 4 };
    }

    private createSisters() {
        const location = ROUTE[this.selected];
        if (!location) return;
        // Half size: their 2x2 art pixels become single screen pixels, still sharp when snapped (fullAuto)
        this.sisters = CHARACTER_KEYS.map((key, i) => {
            const { x, y } = this.sisterSpot(location, i);
            const sister = this.add.sprite(x, y, key, 0).setOrigin(0.5, 1).setScale(0.5).play(`${key}_idle`);
            sister.vertexRoundMode = 'fullAuto';
            return sister;
        });
    }

    private drawLand() {
        this.cameras.main.setBackgroundColor(COLORS.land);
        const g = this.add.graphics();
        // Parks and fields: soft patches (the Planty ring around the Old Town, the Krakus Mound, fields to the east)
        g.fillStyle(COLORS.park, 0.6)
            .fillEllipse(330, 160, 190, 120)
            .fillEllipse(560, 520, 260, 110)
            .fillEllipse(120, 470, 220, 140)
            .fillEllipse(700, 160, 200, 120);
        // The Vistula: a wide band flowing west to east, between the Old Town (north) and Podgórze (south)
        const river = new Phaser.Curves.Spline([
            new Phaser.Math.Vector2(-20, 330), new Phaser.Math.Vector2(140, 350), new Phaser.Math.Vector2(270, 340),
            new Phaser.Math.Vector2(400, 355), new Phaser.Math.Vector2(560, 350), new Phaser.Math.Vector2(700, 370),
            new Phaser.Math.Vector2(820, 360),
        ]);
        const points = river.getPoints(64);
        g.lineStyle(44, COLORS.riverEdge).strokePoints(points);
        g.lineStyle(36, COLORS.river).strokePoints(points);
        this.add.text(620, 362, t('map.river'), { ...TEXT_STYLE, fontSize: '15px', fontStyle: 'italic', color: '#e1f5fe' })
            .setOrigin(0.5).setAngle(6);
        // Trees, scattered with a fixed seed so the map looks the same every time
        const rnd = new Phaser.Math.RandomDataGenerator(['krakow']);
        for (let i = 0; i < 26; i++) {
            const x = rnd.between(20, 780);
            const y = rnd.between(90, 500);
            if (Math.abs(y - 350) < 45) continue; // keep the river clear
            g.fillStyle(0x5d8a3c).fillCircle(x, y, 9).fillStyle(0x7cb342).fillCircle(x - 2, y - 2, 6);
        }
    }

    /** Dotted path between neighbouring places; a footbridge where it crosses the river */
    private drawPaths() {
        const g = this.add.graphics();
        for (let i = 1; i < ROUTE.length; i++) {
            const from = ROUTE[i - 1];
            const to = ROUTE[i];
            if (!from || !to) continue;
            const open = isPlayable(this.statuses[i] ?? 'locked');
            const line = new Phaser.Geom.Line(from.at.x, from.at.y, to.at.x, to.at.y);
            if (from.id === 'podgorze') {
                // The Bernatka footbridge over the Vistula, drawn under the dots
                const mid = Phaser.Geom.Line.GetPoint(line, 0.5);
                g.fillStyle(0x8d6e63).fillRect(mid.x - 10, mid.y - 34, 20, 68);
                g.lineStyle(2, 0x5d4037).strokeRect(mid.x - 10, mid.y - 34, 20, 68);
            }
            for (const point of line.getPoints(0, 16)) {
                g.fillStyle(open ? COLORS.path : COLORS.pathLocked, open ? 1 : 0.8).fillCircle(point.x, point.y, 3.5);
            }
        }
    }

    private drawLocation(location: Location, index: number) {
        const status = this.statuses[index] ?? 'locked';
        const fill = status === 'done' ? COLORS.done : status === 'open' ? COLORS.open : COLORS.locked;
        const circle = this.add.circle(0, 0, MARKER_RADIUS, fill).setStrokeStyle(3, COLORS.outline);
        const parts: Phaser.GameObjects.GameObject[] = [circle];
        if (status === 'done') {
            parts.push(this.add.text(0, 1, '✓', { fontFamily: FONT_FAMILY, fontSize: '26px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5));
        } else if (status === 'open') {
            parts.push(this.add.text(0, 1, String(index + 1), { fontFamily: FONT_FAMILY, fontSize: '22px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5));
        } else {
            // A padlock: shackle and body
            parts.push(this.add.arc(0, -3, 6, 180, 360).setStrokeStyle(3, 0xeceff1).setClosePath(false));
            parts.push(this.add.rectangle(0, 4, 16, 12, 0xeceff1).setRounded(2));
        }
        parts.push(this.add.text(0, MARKER_RADIUS + 14, t(location.name), { ...TEXT_STYLE, fontSize: '15px' }).setOrigin(0.5));
        const marker = this.add.container(location.at.x, location.at.y, parts);
        circle.setInteractive({ useHandCursor: isPlayable(status) });
        circle.on('pointerup', () => this.tapLocation(index, marker));
    }

    private drawTitleAndPanel() {
        this.add.text(VIEW.width / 2, 40, t('map.title'), {
            fontFamily: FONT_FAMILY, fontSize: '36px', fontStyle: 'bold', color: '#ffe082', stroke: '#5d3a1a', strokeThickness: 7,
        }).setOrigin(0.5);
        this.add.rectangle(VIEW.width / 2, PANEL_Y, 520, 64, COLORS.outline, 0.85).setRounded(12).setStrokeStyle(3, 0xffffff);
        this.infoName = this.add.text(VIEW.width / 2, PANEL_Y - 14, '', { ...TEXT_STYLE, fontSize: '21px', color: '#ffe082' }).setOrigin(0.5);
        this.infoDetail = this.add.text(VIEW.width / 2, PANEL_Y + 15, '', { ...TEXT_STYLE, fontSize: '16px' }).setOrigin(0.5);
        this.add.text(VIEW.width / 2, VIEW.height - 10, t('map.hint'), { ...TEXT_STYLE, fontSize: '13px' }).setOrigin(0.5, 1);
        this.storyButton = this.add.text(VIEW.width / 2 + 250, PANEL_Y, t('map.story'), {
            ...TEXT_STYLE, fontSize: '16px', color: '#ffe082', backgroundColor: '#5d3a1a', padding: { x: 10, y: 6 },
        }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true }).setVisible(false);
        this.storyButton.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
            const arrival = ROUTE[this.selected]?.arrival;
            if (arrival && !this.walking) this.playCutscene(arrival);
        });
    }
}
