import { createContext, useContext, useEffect, useReducer } from 'react';
import { getSettings, saveSettings } from '../store/localStorage.js';
import { uz, ru, en } from '../i18n/index.js';

const TRANSLATIONS = { uz, ru, en };

const ARABIC_FONTS = {
  uthmani: "'KFGQPC Uthmanic Script', 'Scheherazade New', 'Amiri', serif",
  imlaei:  "'Amiri', 'Traditional Arabic', serif",
  indopak: "'Lateef', 'Noto Naskh Arabic', serif",
};

const SettingsContext = createContext(null);

function reducer(state, action) {
  switch (action.type) {
    case 'UPDATE':
      return { ...state, [action.key]: action.value };
    case 'SET_ALL':
      return { ...state, ...action.settings };
    default:
      return state;
  }
}

export function SettingsProvider({ children }) {
  const [settings, dispatch] = useReducer(reducer, getSettings());

  useEffect(() => {
    saveSettings(settings);
    document.documentElement.setAttribute('data-theme', settings.theme);
    document.documentElement.style.setProperty(
      '--font-arabic-size',
      { sm: '1.5rem', md: '2rem', lg: '2.5rem', xl: '3rem' }[settings.arabic_font_size] || '2rem'
    );
    document.documentElement.style.setProperty(
      '--font-arabic',
      ARABIC_FONTS[settings.arabic_font] || ARABIC_FONTS.uthmani
    );
  }, [settings]);

  const update = (key, value) => dispatch({ type: 'UPDATE', key, value });
  const t = TRANSLATIONS[settings.language] || uz;

  return (
    <SettingsContext.Provider value={{ settings, update, t }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
