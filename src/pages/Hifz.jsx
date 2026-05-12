import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getVersesByChapter, getChapter, getChapterAudio } from '../api/index.js';
import { useSettings } from '../context/SettingsContext.jsx';
import { getHifzProgress, updateHifzAyah } from '../store/localStorage.js';
import './Hifz.css';

const AUDIO_BASE = 'https://verses.quran.com/';

export default function HifzMode() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { settings, t } = useSettings();
  const chapterId = parseInt(id);
  const audioRef = useRef(null);

  const [chapter, setChapter] = useState(null);
  const [verses, setVerses] = useState([]);
  const [audioFiles, setAudioFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [mode, setMode] = useState('listen');      // 'listen' | 'hide' | 'check'
  const [hideLevel, setHideLevel] = useState(50);  // 50 | 75 | 100
  const [repeatCount, setRepeatCount] = useState(3);
  const [currentRepeat, setCurrentRepeat] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [hifzProgress, setHifzProgress] = useState(getHifzProgress());

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getChapter(chapterId, settings.language),
      getVersesByChapter(chapterId, settings.language),
      getChapterAudio(settings.recitation_id, chapterId),
    ])
      .then(([ch, vs, au]) => {
        setChapter(ch.chapter);
        setVerses(vs.verses || []);
        setAudioFiles(au.audio_files || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [chapterId, settings.language, settings.recitation_id]);

  const currentVerse = verses[currentIdx];
  const currentAudio = audioFiles[currentIdx];
  const key = currentVerse ? `${chapterId}:${currentVerse.verse_number}` : null;
  const isLearned = key ? hifzProgress[key]?.learned : false;

  // Play audio
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentAudio) return;
    const raw = currentAudio.url || '';
    const url = raw.startsWith('http') ? raw : raw.startsWith('//') ? 'https:' + raw : AUDIO_BASE + raw;
    if (!isPlaying) {
      audio.pause();
      return;
    }

    let cancelled = false;

    const tryPlay = () => {
      if (cancelled) return;
      audio.play().catch((e) => {
        if (!cancelled && e.name !== 'AbortError') setIsPlaying(false);
      });
    };

    if (audio.src !== url) {
      audio.src = url;
    }

    if (audio.readyState >= 2) {
      tryPlay();
    } else {
      audio.addEventListener('canplay', tryPlay, { once: true });
    }

    return () => {
      cancelled = true;
      audio.removeEventListener('canplay', tryPlay);
    };
  }, [isPlaying, currentAudio]);

  const handleAudioEnded = () => {
    const next = currentRepeat + 1;
    if (next < repeatCount) {
      setCurrentRepeat(next);
      audioRef.current?.play().catch(() => {});
    } else {
      setIsPlaying(false);
      setCurrentRepeat(0);
    }
  };

  const markLearned = () => {
    if (!key) return;
    const current = hifzProgress[key] || {};
    const updated = { learned: !current.learned, reps: (current.reps || 0) + 1 };
    updateHifzAyah(chapterId, currentVerse.verse_number, updated);
    setHifzProgress(getHifzProgress());
  };

  const goNext = () => {
    setCurrentIdx(i => Math.min(verses.length - 1, i + 1));
    setIsPlaying(false);
    setCurrentRepeat(0);
    setRevealed(false);
  };

  const goPrev = () => {
    setCurrentIdx(i => Math.max(0, i - 1));
    setIsPlaying(false);
    setCurrentRepeat(0);
    setRevealed(false);
  };

  const learnedCount = verses.filter(v => hifzProgress[`${chapterId}:${v.verse_number}`]?.learned).length;

  if (loading) return <div className="hifz__loading">{t.common.loading}</div>;

  const words = currentVerse?.words?.filter(w => w.char_type_name === 'word') || [];
  const visibleCount = Math.ceil(words.length * (1 - hideLevel / 100));

  return (
    <div className="hifz">
      <audio ref={audioRef} onEnded={handleAudioEnded} />

      {/* Header */}
      <div className="hifz__header">
        <button className="hifz__back" onClick={() => navigate(`/surah/${chapterId}`)}>←</button>
        <div className="hifz__header-info">
          <span className="hifz__chapter">{chapter?.name_simple}</span>
          <span className="hifz__progress-text">{learnedCount}/{verses.length} yodlangan</span>
        </div>
        <div className="hifz__chapter-arabic">{chapter?.name_arabic}</div>
      </div>

      {/* Progress bar */}
      <div className="hifz__progress-bar">
        <div className="hifz__progress-fill" style={{ width: `${(learnedCount / verses.length) * 100}%` }} />
      </div>

      {/* Mode selector */}
      <div className="hifz__modes">
        {[
          { key: 'listen', label: '🎧 ' + t.hifz.listen_mode },
          { key: 'hide', label: '👁 ' + t.hifz.hide_mode },
          { key: 'check', label: '✅ ' + t.hifz.check_mode },
        ].map(({ key, label }) => (
          <button
            key={key}
            className={`hifz__mode-btn${mode === key ? ' active' : ''}`}
            onClick={() => { setMode(key); setRevealed(false); setIsPlaying(false); }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Ayah card */}
      {currentVerse && (
        <div className={`hifz__card${isLearned ? ' hifz__card--learned' : ''}`}>
          <div className="hifz__ayah-num">{currentVerse.verse_number}</div>

          {/* Arabic text */}
          <div className="hifz__arabic" dir="rtl">
            {mode === 'listen' && (
              <span>{currentVerse.text_uthmani}</span>
            )}

            {mode === 'hide' && (
              words.map((word, idx) => (
                <span key={word.id} className={`hifz__word${idx >= visibleCount ? ' hifz__word--hidden' : ''}`}>
                  {idx < visibleCount ? word.text_uthmani : '___'}
                </span>
              ))
            )}

            {mode === 'check' && (
              revealed
                ? <span>{currentVerse.text_uthmani}</span>
                : <div className="hifz__hidden-text">Oyat yashirilgan</div>
            )}
          </div>

          {/* Translation */}
          {currentVerse.translations?.[0] && (
            <div className="hifz__translation"
              dangerouslySetInnerHTML={{ __html: currentVerse.translations[0].text }}
            />
          )}

          {/* Listen mode controls */}
          {mode === 'listen' && (
            <div className="hifz__listen-ctrl">
              <div className="hifz__repeat-selector">
                <span className="hifz__repeat-label">Takror:</span>
                {[1, 3, 5, 10].map(n => (
                  <button
                    key={n}
                    className={`hifz__repeat-btn${repeatCount === n ? ' active' : ''}`}
                    onClick={() => setRepeatCount(n)}
                  >
                    {n}x
                  </button>
                ))}
              </div>
              <button
                className={`hifz__play-btn${isPlaying ? ' playing' : ''}`}
                onClick={() => setIsPlaying(v => !v)}
                disabled={!currentAudio}
              >
                {isPlaying ? `⏸ ${currentRepeat + 1}/${repeatCount}` : '▶ Tinglash'}
              </button>
            </div>
          )}

          {/* Hide mode — hide level */}
          {mode === 'hide' && (
            <div className="hifz__hide-ctrl">
              <span className="hifz__repeat-label">Yashirish:</span>
              {[25, 50, 75, 100].map(n => (
                <button
                  key={n}
                  className={`hifz__repeat-btn${hideLevel === n ? ' active' : ''}`}
                  onClick={() => setHideLevel(n)}
                >
                  {n}%
                </button>
              ))}
            </div>
          )}

          {/* Check mode — reveal */}
          {mode === 'check' && !revealed && (
            <button className="hifz__reveal-btn" onClick={() => setRevealed(true)}>
              Ko'rsatish
            </button>
          )}

          {/* Mark learned */}
          <button
            className={`hifz__learned-btn${isLearned ? ' learned' : ''}`}
            onClick={markLearned}
          >
            {isLearned ? '✅ Yodlangan' : '○ Yodlanmagan'}
          </button>
        </div>
      )}

      {/* Navigation */}
      <div className="hifz__nav">
        <button className="hifz__nav-btn" onClick={goPrev} disabled={currentIdx === 0}>
          ← Oldingi
        </button>
        <span className="hifz__nav-count">{currentIdx + 1} / {verses.length}</span>
        <button className="hifz__nav-btn" onClick={goNext} disabled={currentIdx === verses.length - 1}>
          Keyingi →
        </button>
      </div>
    </div>
  );
}
