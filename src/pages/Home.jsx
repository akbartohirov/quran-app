import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext.jsx';
import { getStreak, getDailyProgress, getLastPosition, getBookmarks } from '../store/localStorage.js';
import { getVersesByChapter, getChapters } from '../api/index.js';
import './Home.css';

export default function Home() {
  const { settings, t } = useSettings();
  const navigate = useNavigate();

  const streak = getStreak();
  const progress = getDailyProgress();
  const lastPos = getLastPosition();
  const bookmarks = getBookmarks();

  const [chapters, setChapters] = useState([]);
  const [dailyAyah, setDailyAyah] = useState(null);
  const [loadingAyah, setLoadingAyah] = useState(true);

  // Load chapters for name lookup
  useEffect(() => {
    getChapters(settings.language)
      .then(d => setChapters(d.chapters || []))
      .catch(() => {});
  }, [settings.language]);

  // Daily ayah — deterministic by day number
  useEffect(() => {
    const dayOfYear = Math.floor(Date.now() / 86400000);
    const surah = (dayOfYear % 114) + 1;
    const verseIndex = dayOfYear % 7;

    setLoadingAyah(true);
    getVersesByChapter(surah, settings.language)
      .then(data => {
        const verses = data.verses || [];
        if (verses.length) {
          setDailyAyah({
            verse: verses[verseIndex % verses.length],
            surah,
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoadingAyah(false));
  }, [settings.language]);

  const lastChapter = chapters.find(c => c.id === lastPos.surah);
  const goalPercent = Math.min(100, Math.round((progress.ayahs_read / settings.daily_goal.value) * 100));

  return (
    <div className="home">

      {/* O'zbek tilida tafsir mavjud emas — faqat uz tilida ko'rsatiladi */}
      {settings.language === 'uz' && (
        <div className="home__notice">
          <span className="home__notice-icon">ℹ️</span>
          <span>
            O'zbek tilida tafsir hozircha mavjud emas.
            Tafsir bo'limi ingliz tilida (Ibn Kathir) ko'rsatiladi.
          </span>
        </div>
      )}

      {/* Header */}
      <div className="home__header">
        <div>
          <p className="home__greeting">Assalamu alaykum 👋</p>
          <h1 className="home__title">Qur'on</h1>
        </div>
        <div className="home__streak">
          <span className="home__streak-fire">🔥</span>
          <span className="home__streak-count">{streak.count}</span>
          <span className="home__streak-label">{t.home.streak}</span>
        </div>
      </div>

      {/* Continue reading */}
      <button className="home__continue" onClick={() => navigate(`/surah/${lastPos.surah}`)}>
        <div className="home__continue-info">
          <span className="home__continue-label">{t.home.continue}</span>
          <span className="home__continue-surah">
            {lastChapter ? lastChapter.name_simple : `Surah ${lastPos.surah}`}
          </span>
          <span className="home__continue-ayah">
            {lastChapter?.name_arabic} · {lastPos.surah}:{lastPos.ayah}
          </span>
        </div>
        <span className="home__continue-arrow">→</span>
      </button>

      {/* Daily goal */}
      <div className="home__goal">
        <div className="home__goal-top">
          <span className="home__goal-label">{t.home.daily_goal}</span>
          <span className="home__goal-count">
            {progress.ayahs_read} / {settings.daily_goal.value} {settings.daily_goal.type === 'ayah' ? 'oyat' : 'sahifa'}
          </span>
        </div>
        <div className="home__goal-bar">
          <div className="home__goal-fill" style={{ width: `${goalPercent}%` }} />
        </div>
        {goalPercent >= 100 && (
          <p className="home__goal-done">✅ Bugungi maqsad bajarildi!</p>
        )}
      </div>

      {/* Daily ayah */}
      <div className="home__daily-ayah">
        <div className="home__daily-ayah-header">
          <span className="home__section-label">{t.home.daily_ayah}</span>
          {dailyAyah && (
            <button
              className="home__daily-ayah-goto"
              onClick={() => navigate(`/surah/${dailyAyah.surah}`)}
            >
              O'qish →
            </button>
          )}
        </div>

        {loadingAyah ? (
          <div className="skeleton" style={{ height: 100 }} />
        ) : dailyAyah ? (
          <div className="home__ayah-card">
            <p className="home__ayah-arabic" dir="rtl">
              {dailyAyah.verse.text_uthmani}
            </p>
            {dailyAyah.verse.translations?.[0] && (
              <p
                className="home__ayah-translation"
                dangerouslySetInnerHTML={{ __html: dailyAyah.verse.translations[0].text }}
              />
            )}
            <span className="home__ayah-ref">
              {dailyAyah.surah}:{dailyAyah.verse.verse_number}
            </span>
          </div>
        ) : null}
      </div>

      {/* Quick nav */}
      <div className="home__quick-nav">
        <button className="quick-btn" onClick={() => navigate('/surah')}>
          <span className="quick-btn__icon">📖</span>
          <span>{t.nav.surahs}</span>
        </button>
        <button className="quick-btn" onClick={() => navigate('/listen')}>
          <span className="quick-btn__icon">🎧</span>
          <span>{t.nav.listen}</span>
        </button>
        <button className="quick-btn" onClick={() => navigate('/search')}>
          <span className="quick-btn__icon">🔍</span>
          <span>{t.nav.search}</span>
        </button>
        <button className="quick-btn" onClick={() => navigate('/settings')}>
          <span className="quick-btn__icon">⚙️</span>
          <span>{t.nav.settings}</span>
        </button>
      </div>

      {/* Recent bookmarks */}
      {bookmarks.length > 0 && (
        <div className="home__bookmarks">
          <span className="home__section-label">🔖 Saqlangan oyatlar</span>
          <div className="home__bookmarks-list">
            {bookmarks.slice(0, 3).map((b, i) => (
              <button
                key={i}
                className="home__bookmark-item"
                onClick={() => navigate(`/surah/${b.surah}`)}
              >
                <span className="home__bookmark-ref">{b.surah}:{b.ayah}</span>
                <span className="home__bookmark-arrow">→</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
