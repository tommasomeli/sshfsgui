import { app } from 'electron';
import i18n from 'i18next';
import en from '../renderer/src/locales/en.json';
import it from '../renderer/src/locales/it.json';

const instance = i18n.createInstance();
instance.init({
  resources: {
    en: { translation: en },
    it: { translation: it },
  },
  lng: app.getLocale().startsWith('it') ? 'it' : 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export function setLanguage(pref: 'auto' | 'en' | 'it'): void {
  const resolved = pref === 'auto'
    ? (app.getLocale().startsWith('it') ? 'it' : 'en')
    : pref;
  if (instance.language !== resolved) instance.changeLanguage(resolved);
}

export const t: typeof instance.t = instance.t.bind(instance);
