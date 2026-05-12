import { useState, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext.jsx';
import { getRecitations } from '../api/index.js';
import { resetAllData } from '../store/localStorage.js';
import './Settings.css';

const LANGUAGES = [
  { code: 'uz', label: "O'zbek", flag: '🇺🇿' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
];

const THEMES = [
  { key: 'light', icon: '☀️' },
  { key: 'dark', icon: '🌙' },
  { key: 'sepia', icon: '📜' },
];

const FONT_SIZES = [
  { key: 'sm', label: 'S' },
  { key: 'md', label: 'M' },
  { key: 'lg', label: 'L' },
  { key: 'xl', label: 'XL' },
];

const ARABIC_FONTS = [
  { key: 'uthmani', label: 'Uthmani', preview: 'بِسْمِ' },
  { key: 'imlaei',  label: 'Imlaei',  preview: 'بِسْمِ' },
  { key: 'indopak', label: 'IndoPak', preview: 'بِسْمِ' },
];

export default function Settings() {
  const { settings, update, t } = useSettings();
  const [recitations, setRecitations] = useState([]);
  const [loadingReciters, setLoadingReciters] = useState(true);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    getRecitations()
      .then(data => setRecitations(data.recitations || []))
      .catch(() => {})
      .finally(() => setLoadingReciters(false));
  }, []);

  const filteredRecitations = recitations.filter(r =>
    r.reciter_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.translated_name?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleReset = () => {
    resetAllData();
    setShowResetConfirm(false);
    window.location.reload();
  };

  return (
    <div className="settings">
      <div className="settings__header">
        <h1 className="settings__title">{t.settings.title}</h1>
      </div>

      {/* Language */}
      <section className="settings__section">
        <h2 className="settings__section-title">{t.settings.language}</h2>
        <div className="settings__options">
          {LANGUAGES.map(({ code, label, flag }) => (
            <button
              key={code}
              className={`option-btn${settings.language === code ? ' active' : ''}`}
              onClick={() => update('language', code)}
            >
              <span>{flag}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Theme */}
      <section className="settings__section">
        <h2 className="settings__section-title">{t.settings.theme}</h2>
        <div className="settings__options">
          {THEMES.map(({ key, icon }) => (
            <button
              key={key}
              className={`option-btn${settings.theme === key ? ' active' : ''}`}
              onClick={() => update('theme', key)}
            >
              <span>{icon}</span>
              <span>{t.settings[key]}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Arabic font size */}
      <section className="settings__section">
        <h2 className="settings__section-title">{t.settings.arabic_size}</h2>
        <div className="settings__options">
          {FONT_SIZES.map(({ key, label }) => (
            <button
              key={key}
              className={`option-btn${settings.arabic_font_size === key ? ' active' : ''}`}
              onClick={() => update('arabic_font_size', key)}
            >
              {label}
            </button>
          ))}
        </div>
        {/* Preview */}
        <div className="settings__arabic-preview">
          بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
        </div>
      </section>

      {/* Arabic font type */}
      <section className="settings__section">
        <h2 className="settings__section-title">Arab shrift turi</h2>
        <div className="settings__font-options">
          {ARABIC_FONTS.map(({ key, label }) => (
            <button
              key={key}
              className={`settings__font-btn${settings.arabic_font === key ? ' active' : ''}`}
              onClick={() => update('arabic_font', key)}
            >
              <span className="settings__font-label">{label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Toggles */}
      <section className="settings__section">
        <h2 className="settings__section-title">Ko'rinish</h2>
        <div className="settings__toggles">
          <ToggleRow
            label={t.settings.transliteration}
            value={settings.show_transliteration}
            onChange={v => update('show_transliteration', v)}
          />
          <ToggleRow
            label={t.settings.translation}
            value={settings.show_translation}
            onChange={v => update('show_translation', v)}
          />
          <ToggleRow
            label={t.settings.tajweed}
            value={settings.tajweed_colors}
            onChange={v => update('tajweed_colors', v)}
          />
        </div>
      </section>

      {/* Reciter */}
      <section className="settings__section">
        <h2 className="settings__section-title">{t.settings.reciter}</h2>

        {loadingReciters ? (
          <div className="settings__loading">{t.common.loading}</div>
        ) : (
          <>
            <div className="settings__search">
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Qori qidirish..."
                className="settings__search-input"
              />
            </div>
            <div className="settings__reciters">
              {filteredRecitations.map(r => (
                <button
                  key={r.id}
                  className={`reciter-btn${settings.recitation_id === r.id ? ' active' : ''}`}
                  onClick={() => update('recitation_id', r.id)}
                >
                  <div className="reciter-btn__info">
                    <span className="reciter-btn__name">{r.reciter_name}</span>
                    {r.translated_name?.name && (
                      <span className="reciter-btn__style">{r.translated_name.name}</span>
                    )}
                  </div>
                  {settings.recitation_id === r.id && (
                    <span className="reciter-btn__check">✓</span>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </section>

      {/* Daily goal */}
      <section className="settings__section">
        <h2 className="settings__section-title">{t.settings.daily_goal}</h2>
        <div className="settings__goal">
          <div className="settings__options">
            {[
              { type: 'ayah', label: 'Oyat' },
              { type: 'page', label: 'Sahifa' },
            ].map(({ type, label }) => (
              <button
                key={type}
                className={`option-btn${settings.daily_goal.type === type ? ' active' : ''}`}
                onClick={() => update('daily_goal', { ...settings.daily_goal, type })}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="settings__goal-value">
            <button
              className="goal-btn"
              onClick={() => update('daily_goal', { ...settings.daily_goal, value: Math.max(1, settings.daily_goal.value - 1) })}
            >−</button>
            <span className="goal-number">{settings.daily_goal.value}</span>
            <button
              className="goal-btn"
              onClick={() => update('daily_goal', { ...settings.daily_goal, value: settings.daily_goal.value + 1 })}
            >+</button>
          </div>
        </div>
      </section>

      {/* Reset */}
      <section className="settings__section settings__section--danger">
        <h2 className="settings__section-title">{t.settings.reset}</h2>
        {showResetConfirm ? (
          <div className="settings__confirm">
            <p>{t.settings.reset_confirm}</p>
            <div className="settings__confirm-btns">
              <button className="btn-danger" onClick={handleReset}>Ha, o'chir</button>
              <button className="btn-cancel" onClick={() => setShowResetConfirm(false)}>{t.common.cancel}</button>
            </div>
          </div>
        ) : (
          <button className="btn-danger-outline" onClick={() => setShowResetConfirm(true)}>
            🗑 {t.settings.reset}
          </button>
        )}
      </section>
    </div>
  );
}

function ToggleRow({ label, value, onChange }) {
  return (
    <div className="toggle-row">
      <span className="toggle-row__label">{label}</span>
      <button
        className={`toggle-switch${value ? ' on' : ''}`}
        onClick={() => onChange(!value)}
        role="switch"
        aria-checked={value}
      >
        <span className="toggle-switch__thumb" />
      </button>
    </div>
  );
}
