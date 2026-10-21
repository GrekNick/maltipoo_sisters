import { describe, it, expect } from 'vitest';
import en from '../src/i18n/locales/en.json';
import uk from '../src/i18n/locales/uk.json';
import pl from '../src/i18n/locales/pl.json';
import { CUTSCENES } from '../src/cutscenes';
import { actorsOf, linesOf, type Beat } from '../src/cutscenes/types';
import { ROUTE } from '../src/levels/route';

const LOCALES: Record<string, Record<string, string>> = { en, uk, pl };
/** A bubble holds two lines of about 35 characters */
const MAX_LINE = 70;

describe.each(Object.entries(CUTSCENES))('cutscene "%s"', (key, scene) => {
    it('is registered under its own id', () => {
        expect(scene.id).toBe(key);
    });

    it('is short: 3 to 8 beats (longer stories become two scenes)', () => {
        expect(scene.beats.length).toBeGreaterThanOrEqual(3);
        expect(scene.beats.length).toBeLessThanOrEqual(8);
    });

    it('only uses actors that are on stage', () => {
        for (const actor of actorsOf(scene.beats)) expect(Object.keys(scene.actors), actor).toContain(actor);
    });

    it('every line exists in all three languages and fits a bubble', () => {
        for (const line of linesOf(scene.beats)) {
            for (const [language, messages] of Object.entries(LOCALES)) {
                const text = messages[line];
                expect(text, `${line} (${language})`).toBeTruthy();
                expect(text?.length ?? 0, `${line} (${language}): "${text}"`).toBeLessThanOrEqual(MAX_LINE);
            }
        }
    });

    it('has something to read: at least one line', () => {
        expect(linesOf(scene.beats).length).toBeGreaterThan(0);
    });

    it('moves stay near the stage (a little off-screen to walk out is fine)', () => {
        const moves = (beats: readonly Beat[]): number[] =>
            beats.flatMap(b => ('together' in b ? moves(b.together) : 'move' in b ? [b.to] : []));
        for (const to of moves(scene.beats)) {
            expect(to).toBeGreaterThanOrEqual(-200);
            expect(to).toBeLessThanOrEqual(1000);
        }
    });
});

it('every arrival on the route is a registered cutscene', () => {
    for (const { id, arrival } of ROUTE) if (arrival) expect(Object.keys(CUTSCENES), id).toContain(arrival);
});
