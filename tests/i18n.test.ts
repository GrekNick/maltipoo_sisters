import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, it, expect } from 'vitest';
import { detectLanguage, getLanguage, LANGUAGES, onLanguageChange, setLanguage, t } from '../src/i18n';

const LOCALE_DIR = 'src/i18n/locales';
const read = (code: string) => JSON.parse(fs.readFileSync(path.join(LOCALE_DIR, `${code}.json`), 'utf8')) as Record<string, string>;
const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();

afterEach(() => setLanguage('en'));

describe('locale files', () => {
    const english = read('en');

    it('there is one file per supported language, and nothing else', () => {
        const files = fs.readdirSync(LOCALE_DIR).filter(f => f.endsWith('.json')).map(f => f.replace('.json', '')).sort();
        expect(files).toEqual(LANGUAGES.map(l => l.code).sort());
    });

    describe.each(LANGUAGES.map(l => l.code))('%s', (code) => {
        const catalog = read(code);

        it('has exactly the same keys as English (nothing missing, nothing extra)', () => {
            expect(Object.keys(catalog).sort()).toEqual(Object.keys(english).sort());
        });

        it('uses the same {placeholders} as English in every string', () => {
            for (const key of Object.keys(english)) {
                expect(placeholders(catalog[key] ?? ''), key).toEqual(placeholders(english[key] ?? ''));
            }
        });

        it('has no empty strings', () => {
            for (const [key, value] of Object.entries(catalog)) expect(value.trim(), key).not.toBe('');
        });
    });
});

describe('t()', () => {
    it('fills placeholders', () => {
        expect(t('hud.treats', { treats: 3, total: 7 })).toBe('Treats: 3/7');
    });

    it('translates after a language change, and notifies listeners', () => {
        const seen: string[] = [];
        const stop = onLanguageChange(language => seen.push(language));
        setLanguage('uk');
        expect(getLanguage()).toBe('uk');
        expect(t('menu.back')).toBe('Назад');
        setLanguage('pl');
        expect(t('hud.time', { seconds: '1.5' })).toBe('Czas: 1.5 s');
        stop();
        setLanguage('en');
        expect(seen).toEqual(['uk', 'pl']);
    });

    it('leaves unknown placeholders visible instead of printing "undefined"', () => {
        expect(t('hud.treats', { treats: 1 })).toBe('Treats: 1/{total}');
    });
});

describe('detectLanguage', () => {
    it('picks the first supported browser language, matching by base code', () => {
        expect(detectLanguage(['uk-UA', 'en-US'])).toBe('uk');
        expect(detectLanguage(['de-DE', 'pl-PL', 'en'])).toBe('pl');
        expect(detectLanguage(['EN-gb'])).toBe('en');
    });

    it('falls back to English', () => {
        expect(detectLanguage(['de-DE', 'fr'])).toBe('en');
        expect(detectLanguage([])).toBe('en');
    });
});
