import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getChapter, getVersesByChapter, getTafsirByChapter, TAFSIR_IDS } from '../api/index.js';
import { useSettings } from '../context/SettingsContext.jsx';
import {
  saveLastPosition, addBookmark, removeBookmark,
  isBookmarked, incrementDailyProgress, updateStreak, addToHistory,
} from '../store/localStorage.js';
import WordPopup from '../components/ayah/WordPopup.jsx';
import AudioPlayer from '../components/audio/AudioPlayer.jsx';
import ReaderHeader from '../components/ayah/ReaderHeader.jsx';
import AyahCard from '../components/ayah/AyahCard.jsx';
import './SurahReader.css';

export default function SurahReader() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { settings, update, t } = useSettings();
  const chapterId = parseInt(id);

  const [chapter, setChapter] = useState(null);
  const [verses, setVerses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showTranslit, setShowTranslit] = useState(settings.show_transliteration);
  const [showTranslation, setShowTranslation] = useState(settings.show_translation);
  const [showTafsir, setShowTafsir] = useState(false);
  const [tafsirData, setTafsirData] = useState({});
  const [tafsirLoading, setTafsirLoading] = useState(false);

  const [selectedWord, setSelectedWord] = useState(null);
  const [currentAyah, setCurrentAyah] = useState(null);
  const [currentWordIndex, setCurrentWordIndex] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const ayahRefs = useRef({});
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const pinchStartDist = useRef(null);

  // Sura va oyatlarni yuklash — chapterId yoki til o'zganda qayta yuklaydi
  useEffect(() => {
    setLoading(true);
    setError(null);
    setVerses([]);
    setChapter(null);
    setCurrentAyah(null);
    setIsPlaying(false);
    setTafsirData({});

    Promise.all([
      getChapter(chapterId, settings.language),
      getVersesByChapter(chapterId, settings.language),
    ])
      .then(([chapterData, versesData]) => {
        setChapter(chapterData.chapter);
        setVerses(versesData.verses || []);
        updateStreak();        // kunlik o'qish silsilasiniy yangilash
        addToHistory(chapterId); // tarix sahifasi uchun

        // Qidiruv sahifasidan kelingan bo'lsa (navigate state.ayah) — o'sha oyatga o'tish
        const targetAyah = location.state?.ayah;
        if (targetAyah) {
          setCurrentAyah(targetAyah);
        }
      })
      .catch(() => setError(t.common.error))
      .finally(() => setLoading(false));
  }, [chapterId, settings.language]);

  // Tafsir faqat yoqilganda va hali yuklanmagan bo'lsa yuklanadi
  // tafsirData — { "2:1": "<p>...</p>", "2:2": "...", ... } formatida
  // O'zbek tilida tafsir yo'q — uz uchun ham ingliz (Ibn Kathir, id=169) ishlatiladi
  useEffect(() => {
    if (!showTafsir || Object.keys(tafsirData).length > 0) return;
    const tafsirId = TAFSIR_IDS[settings.language] || TAFSIR_IDS.en;
    setTafsirLoading(true);
    getTafsirByChapter(tafsirId, chapterId)
      .then(data => {
        const map = {};
        (data.tafsirs || []).forEach(item => {
          map[item.verse_key] = item.text;
        });
        setTafsirData(map);
      })
      .catch(() => {})
      .finally(() => setTafsirLoading(false));
  }, [showTafsir, chapterId, settings.language]);

  // Save position when ayah changes
  useEffect(() => {
    if (currentAyah) {
      saveLastPosition(chapterId, currentAyah);
      incrementDailyProgress();
    }
  }, [currentAyah, chapterId]);

  // Scroll to active ayah
  useEffect(() => {
    if (currentAyah && ayahRefs.current[currentAyah]) {
      ayahRefs.current[currentAyah].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentAyah]);

  // Scroll to ayah from search (after verses load)
  useEffect(() => {
    const targetAyah = location.state?.ayah;
    if (targetAyah && verses.length && ayahRefs.current[targetAyah]) {
      setTimeout(() => {
        ayahRefs.current[targetAyah]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  }, [verses, location.state]);

  const handleJumpToAyah = useCallback((num) => {
    setCurrentAyah(num);
    setTimeout(() => {
      ayahRefs.current[num]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
  }, []);

  // Per-ayah play tugmasi bosilganda:
  // — Agar o'sha oyat allaqachon ijro etilayotgan bo'lsa → to'xtatish
  // — Aks holda → o'sha oyatni tanlash va ijroni boshlash
  const handlePlayAyah = useCallback((verseNumber) => {
    if (currentAyah === verseNumber && isPlaying) {
      setIsPlaying(false);
    } else {
      setCurrentAyah(verseNumber);
      setIsPlaying(true);
    }
  }, [currentAyah, isPlaying]);

  const handleWordClick = useCallback((word) => setSelectedWord(word), []);

  const handleBookmark = useCallback((ayahNumber) => {
    if (isBookmarked(chapterId, ayahNumber)) {
      removeBookmark(chapterId, ayahNumber);
    } else {
      addBookmark(chapterId, ayahNumber);
    }
  }, [chapterId]);

  // ─── Sensorli boshqaruv (touch gestures) ─────────────────────────────────
  // Chapga silash (swipe left)  → keyingi sura
  // O'ngga silash (swipe right) → oldingi sura
  // Qisish (pinch)              → arab shrift o'lchamini o'zgartirish
  // Shartlar: gorizontal harakat >80px va vertikal harakatdan 1.5x ko'p bo'lsa swipe hisoblanadi
  const handleTouchStart = useCallback((e) => {
    if (e.touches.length === 1) {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
      pinchStartDist.current = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (e.touches.length === 2 && pinchStartDist.current) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      const scale = dist / pinchStartDist.current;
      const sizes = ['sm', 'md', 'lg', 'xl'];
      const idx = sizes.indexOf(settings.arabic_font_size);
      if (scale > 1.3 && idx < sizes.length - 1) {
        update('arabic_font_size', sizes[idx + 1]);
        pinchStartDist.current = dist;
      } else if (scale < 0.7 && idx > 0) {
        update('arabic_font_size', sizes[idx - 1]);
        pinchStartDist.current = dist;
      }
    }
  }, [settings.arabic_font_size, update]);

  const handleTouchEnd = useCallback((e) => {
    if (e.changedTouches.length === 1 && touchStartX.current !== null) {
      const dx = touchStartX.current - e.changedTouches[0].clientX;
      const dy = Math.abs(touchStartY.current - e.changedTouches[0].clientY);
      if (Math.abs(dx) > 80 && Math.abs(dx) > dy * 1.5) {
        if (dx > 0 && chapterId < 114) navigate('/surah/' + (chapterId + 1));
        else if (dx < 0 && chapterId > 1) navigate('/surah/' + (chapterId - 1));
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
    pinchStartDist.current = null;
  }, [chapterId, navigate]);

  if (loading) return (
    <div className="reader reader--loading">
      <div className="skeleton" style={{ height: 56, marginBottom: 16 }} />
      <div className="skeleton" style={{ height: 60, marginBottom: 24 }} />
      {[...Array(5)].map((_, i) => (
        <div key={i} className="skeleton" style={{ height: 140, marginBottom: 12 }} />
      ))}
    </div>
  );

  if (error) return (
    <div className="reader__error">
      <p>{error}</p>
      <button onClick={() => window.location.reload()}>{t.common.retry}</button>
    </div>
  );

  return (
    <div
      className="reader"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <ReaderHeader
        chapter={chapter}
        chapterId={chapterId}
        navigate={navigate}
        showTranslit={showTranslit}
        showTranslation={showTranslation}
        showTafsir={showTafsir}
        onToggleTranslit={() => setShowTranslit(v => !v)}
        onToggleTranslation={() => setShowTranslation(v => !v)}
        onToggleTafsir={() => setShowTafsir(v => !v)}
        totalVerses={verses.length}
        onJumpToAyah={handleJumpToAyah}
      />

      {chapterId !== 1 && chapterId !== 9 && (
        <div className="reader__bismillah">
          بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
        </div>
      )}

      <div className="reader__play-top">
        <button
          className={`reader__play-top-btn${isPlaying ? ' playing' : ''}`}
          onClick={() => {
            if (isPlaying) {
              setIsPlaying(false);
            } else if (verses.length) {
              setCurrentAyah(verses[0].verse_number);
              setIsPlaying(true);
            }
          }}
          disabled={!verses.length}
        >
          {isPlaying ? '⏸' : '▶'} {isPlaying ? "To'xtatish" : "Surani tinglash"}
        </button>
      </div>

      <div className="reader__verses">
        {verses.map((verse) => (
          <AyahCard
            key={verse.id}
            verse={verse}
            ref={el => { ayahRefs.current[verse.verse_number] = el; }}
            isActive={currentAyah === verse.verse_number}
            currentWordIndex={currentAyah === verse.verse_number ? currentWordIndex : null}
            showTranslit={showTranslit}
            showTranslation={showTranslation}
            showTafsir={showTafsir}
            tafsirText={tafsirData[`${chapterId}:${verse.verse_number}`] || (tafsirLoading ? null : '')}
            onWordClick={handleWordClick}
            onBookmark={() => handleBookmark(verse.verse_number)}
            isBookmarked={isBookmarked(chapterId, verse.verse_number)}
            chapterId={chapterId}
            onPlayAyah={() => handlePlayAyah(verse.verse_number)}
            isPlayingThisAyah={currentAyah === verse.verse_number && isPlaying}
          />
        ))}
      </div>

      <div className="reader__nav-footer">
        <button
          className="reader__nav-btn"
          onClick={() => chapterId > 1 && navigate('/surah/' + (chapterId - 1))}
          disabled={chapterId <= 1}
        >
          ← {t.reader.prev_surah}
        </button>
        <button className="reader__nav-btn reader__nav-btn--primary" onClick={() => navigate('/surah')}>☰</button>
        <button
          className="reader__nav-btn"
          onClick={() => chapterId < 114 && navigate('/surah/' + (chapterId + 1))}
          disabled={chapterId >= 114}
        >
          {t.reader.next_surah} →
        </button>
      </div>

      <AudioPlayer
        chapterId={chapterId}
        verses={verses}
        currentAyah={currentAyah}
        isPlaying={isPlaying}
        onAyahChange={setCurrentAyah}
        onWordChange={setCurrentWordIndex}
        onPlayingChange={setIsPlaying}
      />

      {selectedWord && (
        <WordPopup word={selectedWord} onClose={() => setSelectedWord(null)} />
      )}
    </div>
  );
}
