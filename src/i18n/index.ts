// Translations: every player-facing string comes from src/i18n/locales/{en,uk,pl}.json through t().
// English is the source of truth: message keys are typed from en.json, so a typo in a key is a compile error, and
// a string missing from another language falls back to English (tests/i18n.test.ts keeps all three complete).
import en from './locales/en.json';
import uk from './locales/uk.json';
import pl from './locales/pl.json';

export type MessageKey = keyof typeof en;
export type Language = 'en' | 'uk' | 'pl';
type Catalog = Partial<Record<MessageKey, string>>;

/** In the order Settings cycles through them; names are written in their own language */
export const LANGUAGES: readonly { code: Language; name: string }[] = [
    { code: 'en', name: 'English' },
    { code: 'uk', name: 'Українська' },
    { code: 'pl', name: 'Polski' },
];

export const DEFAULT_LANGUAGE: Language = 'en';

const CATALOGS: Record<Language, Catalog> = { en, uk, pl };

let current: Language = DEFAULT_LANGUAGE;
const listeners = new Set<(language: Language) => void>();

export function isLanguage(value: unknown): value is Language {
    return typeof value === 'string' && Object.hasOwn(CATALOGS, value);
}

export function getLanguage(): Language {
    return current;
}

export function setLanguage(language: Language): void {
    if (language === current) return;
    current = language;
    listeners.forEach(listener => listener(language));
}

/** Called after every language change (e.g. to update text on the page outside the canvas). Returns unsubscribe. */
export function onLanguageChange(listener: (language: Language) => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

/**
 * The text for `key` in the current language, with `{name}` placeholders filled from `params`.
 * Falls back to English, then to the key itself (so a missing string is visible, not blank).
 */
export function t(key: MessageKey, params: Record<string, string | number> = {}): string {
    const template = CATALOGS[current][key] ?? en[key] ?? key;
    return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match));
}

/** First supported language from the browser's preferences ("uk-UA" → uk), else English. */
export function detectLanguage(preferred: readonly string[]): Language {
    for (const tag of preferred) {
        const base = tag.toLowerCase().split('-')[0];
        if (isLanguage(base)) return base;
    }
    return DEFAULT_LANGUAGE;
}

export function languageName(language: Language): string {
    return LANGUAGES.find(l => l.code === language)?.name ?? language;
}
