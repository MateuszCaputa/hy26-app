// Język interfejsu: polski (domyślnie) albo angielski.
// Klucz to polski tekst – kod czyta się jak dotąd, a brak tłumaczenia nigdy niczego nie psuje (zostaje polski).
// Zmienne w tekstach: tr('Przerwa za {min}', { min: '5 min' }).
import { EN } from './i18n-en';

export type Lang = 'pl' | 'en';
// Okna aplikacji dostają język w adresie (?lang=en), więc jest znany, zanim wczytają się widoki i ich stałe.
let lang: Lang = typeof location !== 'undefined' && new URLSearchParams(location.search).get('lang') === 'en' ? 'en' : 'pl';

export const setLang = (l: Lang): void => {
  lang = l === 'en' ? 'en' : 'pl';
};
export const getLang = (): Lang => lang;
/** Format liczb i godzin dla bieżącego języka. */
export const locale = (): string => (lang === 'en' ? 'en-GB' : 'pl-PL');

export function tr(pl: string, vars?: Record<string, string | number>): string {
  const s = lang === 'en' ? EN[pl] ?? pl : pl;
  return vars ? s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? '')) : s;
}

/** Słownik tekstów (np. etykiety problemów) tłumaczony przy każdym odczycie – zmiana języka działa od razu. */
export function localized<K extends string>(table: Record<K, string>): Record<K, string> {
  return new Proxy(table, { get: (t, k) => (typeof k === 'string' && k in t ? tr(t[k as K]) : undefined) });
}
