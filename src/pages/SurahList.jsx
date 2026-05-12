import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getChapters } from '../api/index.js';
import { useSettings } from '../context/SettingsContext.jsx';
import { getLastPosition } from '../store/localStorage.js';
import './SurahList.css';

const REVELATION_ICONS = { Meccan: '🕋', Medinan: '🕌' };

export default function SurahList() {
  const { settings, t } = useSettings();
  const navigate = useNavigate();

  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState('number'); // number | revelation | verses
  const lastPosition = getLastPosition();

  useEffect(() => {
    setLoading(true);
    setError(null);
    getChapters(settings.language)
      .then(data => setChapters(data.chapters || []))
      .catch(() => setError(t.common.error))
      .finally(() => setLoading(false));
  }, [settings.language]);

  const filtered = useMemo(() => {
    let list = [...chapters];

    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(ch =>
        ch.name_simple?.toLowerCase().includes(q) ||
        ch.translated_name?.name?.toLowerCase().includes(q) ||
        ch.name_arabic?.includes(query) ||
        String(ch.id).includes(q)
      );
    }

    if (sortBy === 'revelation') {
      list.sort((a, b) => a.revelation_place?.localeCompare(b.revelation_place));
    } else if (sortBy === 'verses') {
      list.sort((a, b) => b.verses_count - a.verses_count);
    } else {
      list.sort((a, b) => a.id - b.id);
    }

    return list;
  }, [chapters, query, sortBy]);

  if (loading) return (
    <div className="surah-list__loading">
      {[...Array(10)].map((_, i) => (
        <div key={i} className="surah-card skeleton" />
      ))}
    </div>
  );

  if (error) return (
    <div className="surah-list__error">
      <p>{error}</p>
      <button onClick={() => window.location.reload()}>{t.common.retry}</button>
    </div>
  );

  return (
    <div className="surah-list">
      {/* Header */}
      <div className="surah-list__header">
        <h1 className="surah-list__title">{t.nav.surahs}</h1>

        {/* Search */}
        <div className="surah-list__search">
          <span className="surah-list__search-icon">🔍</span>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t.search.placeholder}
            className="surah-list__search-input"
          />
          {query && (
            <button className="surah-list__search-clear" onClick={() => setQuery('')}>✕</button>
          )}
        </div>

        {/* Sort */}
        <div className="surah-list__sort">
          {[
            { key: 'number', label: '#' },
            { key: 'revelation', label: '🕋 / 🕌' },
            { key: 'verses', label: '↕ Oyat' },
          ].map(({ key, label }) => (
            <button
              key={key}
              className={`sort-btn${sortBy === key ? ' active' : ''}`}
              onClick={() => setSortBy(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="surah-list__grid">
        {filtered.length === 0 ? (
          <p className="surah-list__empty">{t.search.no_results}</p>
        ) : (
          filtered.map(ch => {
            const isLast = ch.id === lastPosition.surah;
            return (
              <button
                key={ch.id}
                className={`surah-card${isLast ? ' surah-card--last' : ''}`}
                onClick={() => navigate(`/surah/${ch.id}`)}
              >
                {/* Number badge */}
                <div className="surah-card__number">
                  <span>{ch.id}</span>
                </div>

                {/* Info */}
                <div className="surah-card__info">
                  <div className="surah-card__names">
                    <span className="surah-card__name">{ch.name_simple}</span>
                    <span className="surah-card__translated">{ch.translated_name?.name}</span>
                  </div>
                  <div className="surah-card__meta">
                    <span className="surah-card__revelation">
                      {REVELATION_ICONS[ch.revelation_place]} {ch.revelation_place}
                    </span>
                    <span className="surah-card__verses">{ch.verses_count} oyat</span>
                  </div>
                </div>

                {/* Arabic name */}
                <div className="surah-card__arabic">{ch.name_arabic}</div>

                {/* Last read indicator */}
                {isLast && <span className="surah-card__badge">Oxirgi</span>}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
