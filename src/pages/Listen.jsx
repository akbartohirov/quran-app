import { useState, useEffect, useRef } from 'react';
import { useSettings } from '../context/SettingsContext.jsx';
import { getRecitations, getChapters, getChapterAudio, getVersesByChapter } from '../api/index.js';
import './Listen.css';

const AUDIO_BASE = 'https://verses.quran.com/';

export default function Listen() {
  const { settings, update, t } = useSettings();
  const audioRef = useRef(null);
  const sleepRef = useRef(null);

  const [recitations, setRecitations] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [selectedSurah, setSelectedSurah] = useState(1);
  const [audioFiles, setAudioFiles] = useState([]);
  const [verses, setVerses] = useState([]);
  const [currentAyah, setCurrentAyah] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [repeatMode, setRepeatMode] = useState('off'); // 'off' | 'ayah' | 'surah'
  const [sleepTimer, setSleepTimer] = useState(null);  // null | 15 | 30 | 60
  const [tab, setTab] = useState('reciter');           // 'reciter' | 'surah' | 'player'

  useEffect(() => {
    getRecitations().then(d => setRecitations(d.recitations || [])).catch(() => {});
    getChapters(settings.language).then(d => setChapters(d.chapters || [])).catch(() => {});
  }, [settings.language]);

  useEffect(() => {
    setLoading(true);
    setIsPlaying(false);
    setCurrentAyah(0);
    setVerses([]);
    Promise.all([
      getChapterAudio(settings.recitation_id, selectedSurah),
      getVersesByChapter(selectedSurah, settings.language),
    ])
      .then(([audioData, versesData]) => {
        setAudioFiles(audioData.audio_files || []);
        setVerses(versesData.verses || []);
      })
      .catch(() => { setAudioFiles([]); setVerses([]); })
      .finally(() => setLoading(false));
  }, [settings.recitation_id, selectedSurah, settings.language]);

  // Cleanup sleep timer
  useEffect(() => () => clearTimeout(sleepRef.current), []);

  const currentFile = audioFiles[currentAyah];
  const currentVerse = verses[currentAyah];

  // Audio play/pause
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentFile) return;

    const raw = currentFile.url || '';
    const url = raw.startsWith('http') ? raw : raw.startsWith('//') ? 'https:' + raw : AUDIO_BASE + raw;

    if (!isPlaying) {
      audio.pause();
      return;
    }

    let cancelled = false;

    const tryPlay = () => {
      if (cancelled) return;
      audio.playbackRate = speed;
      audio.play().catch((e) => {
        if (!cancelled && e.name !== 'AbortError') setIsPlaying(false);
      });
    };

    if (audio.src !== url) {
      audio.src = url;
    }
    audio.playbackRate = speed;

    if (audio.readyState >= 2) {
      tryPlay();
    } else {
      audio.addEventListener('canplay', tryPlay, { once: true });
    }

    return () => {
      cancelled = true;
      audio.removeEventListener('canplay', tryPlay);
    };
  }, [isPlaying, currentFile, speed]);

  const handleEnded = () => {
    if (repeatMode === 'ayah') {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => setIsPlaying(false));
    } else if (repeatMode === 'surah') {
      const next = currentAyah < audioFiles.length - 1 ? currentAyah + 1 : 0;
      setCurrentAyah(next);
    } else {
      if (currentAyah < audioFiles.length - 1) setCurrentAyah(i => i + 1);
      else setIsPlaying(false);
    }
  };

  const toggle = () => {
    if (!audioFiles.length) return;
    setIsPlaying(v => !v);
  };

  const activateSleepTimer = (mins) => {
    clearTimeout(sleepRef.current);
    if (!mins) { setSleepTimer(null); return; }
    setSleepTimer(mins);
    sleepRef.current = setTimeout(() => {
      setIsPlaying(false);
      setSleepTimer(null);
    }, mins * 60 * 1000);
  };

  const currentChapter = chapters.find(c => c.id === selectedSurah);
  const currentReciter = recitations.find(r => r.id === settings.recitation_id);

  return (
    <div className="listen">
      <audio ref={audioRef} onEnded={handleEnded} />

      <h1 className="listen__title">{t.nav.listen}</h1>

      {/* Tabs */}
      <div className="listen__tabs">
        <button className={`listen__tab${tab === 'reciter' ? ' active' : ''}`} onClick={() => setTab('reciter')}>
          🎙 {t.settings.reciter}
        </button>
        <button className={`listen__tab${tab === 'surah' ? ' active' : ''}`} onClick={() => setTab('surah')}>
          📖 Sura
        </button>
        <button className={`listen__tab${tab === 'player' ? ' active' : ''}`} onClick={() => setTab('player')}>
          ▶ Player
        </button>
      </div>

      {/* Reciter list */}
      {tab === 'reciter' && (
        <div className="listen__list">
          {recitations.map(r => (
            <button
              key={r.id}
              className={`listen__item${settings.recitation_id === r.id ? ' active' : ''}`}
              onClick={() => { update('recitation_id', r.id); setTab('surah'); }}
            >
              <div className="listen__item-info">
                <span className="listen__item-name">{r.reciter_name}</span>
                {r.translated_name?.name && (
                  <span className="listen__item-sub">{r.translated_name.name}</span>
                )}
              </div>
              {settings.recitation_id === r.id && <span className="listen__check">✓</span>}
            </button>
          ))}
        </div>
      )}

      {/* Surah list */}
      {tab === 'surah' && (
        <div className="listen__list">
          {chapters.map(ch => (
            <button
              key={ch.id}
              className={`listen__item${selectedSurah === ch.id ? ' active' : ''}`}
              onClick={() => { setSelectedSurah(ch.id); setTab('player'); }}
            >
              <div className="listen__item-info">
                <span className="listen__item-number">{ch.id}.</span>
                <div>
                  <span className="listen__item-name">{ch.name_simple}</span>
                  <span className="listen__item-sub">{ch.translated_name?.name}</span>
                </div>
              </div>
              <span className="listen__item-arabic">{ch.name_arabic}</span>
            </button>
          ))}
        </div>
      )}

      {/* Player */}
      {tab === 'player' && (
        <div className="listen__player">
          {/* Surah info */}
          <div className="listen__player-info">
            <div className="listen__player-arabic" dir="rtl">{currentChapter?.name_arabic}</div>
            <div className="listen__player-name">{currentChapter?.name_simple}</div>
            <div className="listen__player-reciter">🎙 {currentReciter?.reciter_name}</div>
          </div>

          {/* Current ayah display */}
          {currentVerse && (
            <div className="listen__current-ayah">
              <div className="listen__ayah-arabic" dir="rtl">
                {currentVerse.text_uthmani}
              </div>
              {currentVerse.translations?.[0] && (
                <div
                  className="listen__ayah-translation"
                  dangerouslySetInnerHTML={{ __html: currentVerse.translations[0].text }}
                />
              )}
              <div className="listen__ayah-ref">
                {selectedSurah}:{currentVerse.verse_number} · {currentAyah + 1}/{audioFiles.length}
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="listen__player-controls">
            <button className="listen__ctrl" onClick={() => setCurrentAyah(i => Math.max(0, i - 1))}>⏮</button>
            <button
              className="listen__ctrl listen__ctrl--main"
              onClick={toggle}
              disabled={loading || !audioFiles.length}
            >
              {loading ? '⏳' : isPlaying ? '⏸' : '▶'}
            </button>
            <button className="listen__ctrl" onClick={() => setCurrentAyah(i => Math.min(audioFiles.length - 1, i + 1))}>⏭</button>
          </div>

          {/* Speed */}
          <div className="listen__row">
            <span className="listen__row-label">Tezlik:</span>
            <div className="listen__speed">
              {[0.75, 1, 1.25, 1.5].map(s => (
                <button key={s} className={`speed-btn${speed === s ? ' active' : ''}`} onClick={() => setSpeed(s)}>
                  {s}x
                </button>
              ))}
            </div>
          </div>

          {/* Repeat mode */}
          <div className="listen__row">
            <span className="listen__row-label">Takror:</span>
            <div className="listen__speed">
              {[
                { key: 'off', label: '✕' },
                { key: 'ayah', label: '🔂 Oyat' },
                { key: 'surah', label: '🔁 Sura' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  className={`speed-btn${repeatMode === key ? ' active' : ''}`}
                  onClick={() => setRepeatMode(key)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Sleep timer */}
          <div className="listen__row">
            <span className="listen__row-label">
              Taymer: {sleepTimer ? `${sleepTimer} daq` : ''}
            </span>
            <div className="listen__speed">
              {[null, 15, 30, 60].map(mins => (
                <button
                  key={mins ?? 'off'}
                  className={`speed-btn${sleepTimer === mins ? ' active' : ''}`}
                  onClick={() => activateSleepTimer(mins)}
                >
                  {mins ? `${mins}′` : '✕'}
                </button>
              ))}
            </div>
          </div>

          {/* Change buttons */}
          <div className="listen__change">
            <button className="listen__change-btn" onClick={() => setTab('reciter')}>🎙 Qori o'zgartirish</button>
            <button className="listen__change-btn" onClick={() => setTab('surah')}>📖 Sura o'zgartirish</button>
          </div>
        </div>
      )}
    </div>
  );
}
