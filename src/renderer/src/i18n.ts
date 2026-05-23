import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import it from './locales/it.json';

function systemLang(): string {
  return navigator.language.startsWith('it') ? 'it' : 'en';
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    it: { translation: it },
  },
  lng: systemLang(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export function applyLanguage(pref: 'auto' | 'en' | 'it'): void {
  const resolved = pref === 'auto' ? systemLang() : pref;
  if (i18n.language !== resolved) i18n.changeLanguage(resolved);
}

export default i18n;
