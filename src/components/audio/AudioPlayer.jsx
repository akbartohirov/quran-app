import { useEffect, useRef, useState, useCallback } from 'react';
import { useSettings } from '../../context/SettingsContext.jsx';
import { getChapterAudio, getRecitations, getWordByWordAudio } from '../../api/index.js';
import './AudioPlayer.css';

// Audio fayllarining CDN manzili — url "Alafasy/mp3/001001.mp3" kabi kelsa shu baza qo'shiladi
const AUDIO_BASE = 'https://verses.quran.com/';

// Sekundni "1:23" formatiga o'tkazish
function formatTime(secs) {
  if (!secs || isNaN(secs) || !isFinite(secs)) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function AudioPlayer({
  chapterId,
  verses,
  currentAyah,
  isPlaying,
  onAyahChange,    // ota komponent currentAyah ni yangilaydi
  onPlayingChange, // ota komponent isPlaying ni yangilaydi
  onWordChange,    // ota komponent currentWordIndex ni yangilaydi (so'z highlight uchun)
}) {
  const { settings, update, t } = useSettings();
  const audioRef = useRef(null);  // <audio> elementiga to'g'ridan-to'g'ri kirish uchun
  const rafRef = useRef(null);    // requestAnimationFrame ID sini saqlash uchun

  // segmentsRef — so'z vaqt belgilari: { "2:5": [[0,1,60,610],[1,2,620,1310],...], ... }
  // State emas, ref — chunki RAF closure ichida har doim eng yangi qiymat kerak bo'ladi
  const segmentsRef = useRef({});

  const [audioFiles, setAudioFiles] = useState([]);        // sura audio fayllari ro'yxati
  const [loading, setLoading] = useState(false);           // yuklanish holati
  const [recitations, setRecitations] = useState([]);      // barcha reciterlar ro'yxati
  const [showReciterPicker, setShowReciterPicker] = useState(false);
  const [progress, setProgress] = useState(0);            // 0–1 oralig'ida progress
  const [currentTime, setCurrentTime] = useState(0);      // joriy vaqt (sekund)
  const [duration, setDuration] = useState(0);            // umumiy davomiylik (sekund)

  // Reciterlar ro'yxatini bir marta yuklash — faqat nomi ko'rsatish uchun
  useEffect(() => {
    getRecitations().then(d => setRecitations(d.recitations || [])).catch(() => {});
  }, []);

  // Sura yoki reciter o'zganda audio fayllar + so'z segmentlarini yuklash
  useEffect(() => {
    if (!verses.length) return;
    setLoading(true);
    setAudioFiles([]);
    segmentsRef.current = {};
    onPlayingChange(false);

    // Ikki so'rovni parallel yuboramiz: audio URL lar + so'z vaqt belgilari
    Promise.all([
      getChapterAudio(settings.recitation_id, chapterId),
      getWordByWordAudio(settings.recitation_id, chapterId),
    ])
      .then(([audioData, segData]) => {
        setAudioFiles(audioData.audio_files || []);

        // Segmentlarni verse_key bo'yicha map ga aylantiramiz, tez izlash uchun
        const map = {};
        (segData.audio_files || []).forEach(f => {
          if (f.segments?.length) map[f.verse_key] = f.segments;
        });
        segmentsRef.current = map;
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [chapterId, settings.recitation_id, verses.length]);

  // Joriy oyatga mos audio faylni topish
  const currentFile = audioFiles.find(
    f => f.verse_key === `${chapterId}:${currentAyah}`
  );

  // ─── Audio ijro etish / to'xtatish ────────────────────────────────────────
  // browser <audio> elementi bilan ishlaganda uchta xavfli holat bor:
  // 1) audio.load() + audio.play() → "AbortError" — shuning uchun load() hech qachon chaqirilmaydi
  // 2) audio.play() readyState < 2 da → "NotSupportedError" — "canplay" hodisasini kutamiz
  // 3) URL noto'g'ri → "error" hodisasi — onPlayingChange(false) bilan to'xtatamiz
  // "settled" bayrog'i — cleanup da takroriy chaqiruvlarni oldini oladi
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!isPlaying || !currentFile) {
      audio.pause();
      cancelAnimationFrame(rafRef.current);
      return;
    }

    // URL ni to'g'ri formatga keltirish:
    // "Alafasy/mp3/001001.mp3"  → "https://verses.quran.com/Alafasy/..."
    // "//mirrors.quranicaudio.com/..." → "https://mirrors.quranicaudio.com/..."
    // "https://..."             → o'zgarishsiz
    const raw = currentFile.url || '';
    const url = raw.startsWith('http')
      ? raw
      : raw.startsWith('//')
        ? 'https:' + raw
        : AUDIO_BASE + raw;

    if (audio.src !== url) {
      audio.src = url;
    }

    let settled = false; // cleanup dan keyin play/error ishlamasin deb

    const doPlay = () => {
      if (settled) return;
      audio.play().catch((err) => {
        if (settled || err.name === 'AbortError') return; // AbortError — normal, e'tibor bermasa ham bo'ladi
        settled = true;
        onPlayingChange(false);
      });
    };

    const handleCanPlay = () => {
      audio.removeEventListener('error', handleError);
      doPlay();
    };

    const handleError = () => {
      audio.removeEventListener('canplay', handleCanPlay);
      if (!settled) { settled = true; onPlayingChange(false); }
    };

    // Agar audio allaqachon yuklangan bo'lsa (readyState >= 2) — darhol ijro
    // Aks holda "canplay" hodisasini kutamiz
    if (audio.readyState >= 2) {
      doPlay();
    } else {
      audio.addEventListener('canplay', handleCanPlay, { once: true });
      audio.addEventListener('error', handleError, { once: true });
    }

    return () => {
      settled = true;
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
    };
  }, [isPlaying, currentFile, onPlayingChange]);

  // ─── Smooth progress bar + so'z highlight (requestAnimationFrame) ──────────
  // setInterval o'rniga RAF ishlatiladi — har frame da (≈60 FPS) progress yangilanadi,
  // bu esa progress bar ni muammosiz silliq harakatlanishini ta'minlaydi.
  // Dependency ga currentAyah qo'shilgan — oyat o'zganda RAF qayta boshlanadi
  // (handleEnded ichida cancelAnimationFrame chaqiriladi, isPlaying o'zgarmaydi)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !isPlaying) {
      cancelAnimationFrame(rafRef.current);
      onWordChange?.(null); // to'xtaganda so'z highlightni o'chirish
      return;
    }

    const verseKey = `${chapterId}:${currentAyah}`;

    const tick = () => {
      if (audio.duration > 0) {
        setProgress(audio.currentTime / audio.duration);
        setCurrentTime(audio.currentTime);
        setDuration(audio.duration);

        // So'z highlight: joriy ms vaqtiga to'g'ri keladigan segmentni qidirish
        // Segment format: [word_index, word_position, start_ms, end_ms]
        const segs = segmentsRef.current[verseKey];
        if (segs?.length) {
          const ms = audio.currentTime * 1000;
          const seg = segs.find(([,, start, end]) => ms >= start && ms < end);
          onWordChange?.(seg ? seg[0] : null); // word_index (0 dan boshlanadi)
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, currentAyah, chapterId, onWordChange]);

  // Oyat o'zganda progress va so'z highlight ni nolga qaytarish
  useEffect(() => {
    setProgress(0);
    setCurrentTime(0);
    setDuration(0);
    onWordChange?.(null);
  }, [currentAyah, onWordChange]);

  // ─── Oyat tugaganda keyingisiga o'tish ────────────────────────────────────
  const handleEnded = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    setProgress(0);
    setCurrentTime(0);
    const currentIdx = verses.findIndex(v => v.verse_number === currentAyah);
    if (currentIdx < verses.length - 1) {
      onAyahChange(verses[currentIdx + 1].verse_number); // keyingi oyatga
    } else {
      onPlayingChange(false); // sura tugadi
    }
  }, [verses, currentAyah, onAyahChange, onPlayingChange]);

  // ─── Boshqaruv tugmalari ───────────────────────────────────────────────────

  const togglePlay = () => {
    // Agar hali hech qaysi oyat tanlanmagan bo'lsa — birinchi oyatdan boshlash
    if (!currentAyah && verses.length) {
      onAyahChange(verses[0].verse_number);
      onPlayingChange(true);
    } else {
      onPlayingChange(!isPlaying);
    }
  };

  const prev = () => {
    const idx = verses.findIndex(v => v.verse_number === currentAyah);
    if (idx > 0) onAyahChange(verses[idx - 1].verse_number);
  };

  const next = () => {
    const idx = verses.findIndex(v => v.verse_number === currentAyah);
    if (idx < verses.length - 1) onAyahChange(verses[idx + 1].verse_number);
  };

  const replay = () => {
    const audio = audioRef.current;
    if (audio && currentFile) {
      audio.currentTime = 0;
      onPlayingChange(true);
    }
  };

  // Progress bar ga bosilganda audio ni o'sha joydan davom ettirish
  const handleProgressClick = (e) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * audio.duration;
    setProgress(ratio);
  };

  const currentReciter = recitations.find(r => r.id === settings.recitation_id);

  return (
    <div className="audio-player">
      <audio ref={audioRef} onEnded={handleEnded} />

      {/* Ustdagi ingichka progress bar — bosilsa o'sha joyga sakrash */}
      <div
        className="audio-player__progress"
        onClick={handleProgressClick}
        title="Bosib o'tish joylashuvini o'zgartiring"
      >
        <div
          className="audio-player__progress-fill"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      <div className="audio-player__body">
        {/* Joriy oyat raqami va vaqt */}
        <div className="audio-player__info">
          {currentAyah ? (
            <>
              <span className="audio-player__ayah-label">{chapterId}:{currentAyah}</span>
              {duration > 0 && (
                <span className="audio-player__time">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              )}
            </>
          ) : (
            <span className="audio-player__ayah-label audio-player__ayah-label--muted">
              {loading ? t.common.loading : t.reader.play}
            </span>
          )}
        </div>

        {/* Asosiy boshqaruv tugmalari */}
        <div className="audio-player__controls">
          <button className="audio-player__btn" onClick={prev} disabled={!currentAyah}>⏮</button>
          <button
            className={`audio-player__btn audio-player__btn--main${isPlaying ? ' playing' : ''}`}
            onClick={togglePlay}
            disabled={loading || !audioFiles.length}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button className="audio-player__btn" onClick={next} disabled={!currentAyah}>⏭</button>
          <button className="audio-player__btn" onClick={replay} disabled={!currentAyah} title="Qayta o'ynash">🔄</button>
        </div>

        {/* Reciter nomi — bosish bilan reciter tanlash oynasini ochadi */}
        <div className="audio-player__reciter">
          <button
            className="audio-player__reciter-btn"
            onClick={() => setShowReciterPicker(v => !v)}
          >
            🎙 {currentReciter?.reciter_name || `#${settings.recitation_id}`}
          </button>
        </div>
      </div>

      {/* Reciter tanlash oynasi */}
      {showReciterPicker && (
        <>
          {/* Orqa fon — bosish bilan yopiladi */}
          <div className="audio-player__overlay" onClick={() => setShowReciterPicker(false)} />
          <div className="audio-player__picker">
            <div className="audio-player__picker-header">
              <span>Qori tanlash</span>
              <button onClick={() => setShowReciterPicker(false)}>✕</button>
            </div>
            <div className="audio-player__picker-list">
              {recitations.map(r => (
                <button
                  key={r.id}
                  className={`audio-player__picker-item${settings.recitation_id === r.id ? ' active' : ''}`}
                  onClick={() => { update('recitation_id', r.id); setShowReciterPicker(false); }}
                >
                  <span>{r.reciter_name}</span>
                  {r.translated_name?.name && (
                    <span className="audio-player__picker-sub">{r.translated_name.name}</span>
                  )}
                  {settings.recitation_id === r.id && (
                    <span className="audio-player__picker-check">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
