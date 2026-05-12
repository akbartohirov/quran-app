import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchQuran } from '../api/index.js';
import { useSettings } from '../context/SettingsContext.jsx';
import './Search.css';

function useDebounce(fn, delay) {
  const timer = useRef(null);
  return useCallback((...args) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => fn(...args), delay);
  }, [fn, delay]);
}

export default function Search() {
  const { t } = useSettings();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [searched, setSearched] = useState(false);

  const doSearch = useCallback((q) => {
    if (!q.trim()) { setResults([]); setSearched(false); return; }
    setLoading(true);
    setSearched(true);
    searchQuran(q)
      .then(data => {
        setResults(data.search?.results || []);
        setTotal(data.search?.total_results || 0);
      })
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, []);

  const debouncedSearch = useDebounce(doSearch, 500);

  const handleChange = (e) => {
    setQuery(e.target.value);
    debouncedSearch(e.target.value);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setSearched(false);
  };

  return (
    <div className="search-page">
      <div className="search-page__header">
        <h1 className="search-page__title">{t.nav.search}</h1>
        <div className="search-page__bar">
          <span className="search-page__icon">🔍</span>
          <input
            type="text"
            value={query}
            onChange={handleChange}
            placeholder={t.search.placeholder}
            className="search-page__input"
            autoFocus
          />
          {query && (
            <button className="search-page__clear" onClick={handleClear}>✕</button>
          )}
        </div>
        {searched && !loading && (
          <p className="search-page__count">
            {total} {t.search.results}
          </p>
        )}
      </div>

      <div className="search-page__results">
        {loading && (
          [...Array(4)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 90, marginBottom: 8 }} />
          ))
        )}

        {!loading && searched && results.length === 0 && (
          <div className="search-page__empty">
            <span>🔍</span>
            <p>{t.search.no_results}</p>
          </div>
        )}

        {!loading && results.map((r, i) => (
          <button
            key={i}
            className="search-result"
            onClick={() => {
              const [surahId, ayahNum] = (r.verse_key || '').split(':');
              navigate(`/surah/${surahId}`, { state: { ayah: parseInt(ayahNum) } });
            }}
          >
            <div className="search-result__ref">{r.verse_key}</div>
            <div
              className="search-result__text"
              dangerouslySetInnerHTML={{ __html: r.text }}
            />
            {r.translations?.[0] && (
              <div
                className="search-result__translation"
                dangerouslySetInnerHTML={{ __html: r.translations[0].text }}
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
