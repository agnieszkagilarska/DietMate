import i18n, { InitOptions } from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enTranslation from './i18n/en.json';
import plTranslation from './i18n/pl.json';

interface Resources {
  [key: string]: {
    translation: typeof enTranslation;
  };
}

const resources: Resources = {
  en: { translation: enTranslation },
  pl: { translation: plTranslation },
};

const i18nOptions: InitOptions = {
  resources,
  fallbackLng: 'en', // <<< zamiast sztywnego lng
  keySeparator: '.',
  interpolation: {
    escapeValue: false,
  },
  detection: {
    order: ['localStorage', 'navigator', 'htmlTag'],
    caches: ['localStorage'], // <<< zapamiętuje wybór użytkownika
  },
};

i18n
  .use(LanguageDetector) // <<< dodane wykrywanie języka
  .use(initReactI18next)
  .init(i18nOptions);

export default i18n;
