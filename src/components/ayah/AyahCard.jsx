import { forwardRef, useState, useRef, useCallback } from 'react';
import { useSettings } from '../../context/SettingsContext.jsx';
import './AyahCard.css';

// forwardRef — ota komponent (SurahReader) bu elementga ref orqali murojaat qilishi uchun,
// masalan aktiv oyatga avtomatik scroll qilganda
const AyahCard = forwardRef(function AyahCard({
  verse,
  isActive,           // joriy ijro etilayotgan oyat
  currentWordIndex,   // ijro paytida highlight qilinadigan so'z indeksi (0 dan)
  showTranslit,
  showTranslation,
  showTafsir,
  tafsirText,
  onWordClick,        // so'zga bosilganda WordPopup ochish uchun
  onBookmark,
  isBookmarked,
  onPlayAyah,         // bu oyatni play/pause qilish tugmasi bosilganda
  isPlayingThisAyah,  // aynan shu oyat ijro etilayaptimi
}, ref) {
  const { settings, t } = useSettings();
  const [bookmarked, setBookmarked] = useState(isBookmarked);

  // ─── Uzoq bosish (long press) → bookmark ──────────────────────────────────
  // Mobil qurilmada foydalanuvchi oyatni uzoq ushlab turganda bookmark qo'shiladi.
  // Agar barmoq 10px dan ko'p harakat qilsa — bu scroll deb hisoblanib, long press bekor qilinadi.
  const longPressTimer = useRef(null);
  const touchStartY = useRef(null);

  const handleBookmark = useCallback(() => {
    setBookmarked(v => !v);
    onBookmark();
  }, [onBookmark]);

  const handleTouchStart = useCallback((e) => {
    touchStartY.current = e.touches[0].clientY;
    longPressTimer.current = setTimeout(() => {
      handleBookmark();
      navigator.vibrate?.(50); // qurilma vibrate qilsa — qisqa tebranish
    }, 600);
  }, [handleBookmark]);

  const handleTouchMove = useCallback((e) => {
    if (touchStartY.current !== null) {
      const dy = Math.abs(e.touches[0].clientY - touchStartY.current);
      if (dy > 10) {
        // Foydalanuvchi scroll qilayapti — long press ni bekor qilish
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    clearTimeout(longPressTimer.current);
    longPressTimer.current = null;
    touchStartY.current = null;
  }, []);

  // Faqat "word" tipidagi elementlarni olish (end marker va boshqalarni o'tkazib yuborish)
  const words = verse.words?.filter(w => w.char_type_name === 'word') || [];

  return (
    <div
      ref={ref}
      className={`ayah-card${isActive ? ' ayah-card--active' : ''}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Yuqori qator: oyat raqami | play tugmasi | bookmark tugmasi */}
      <div className="ayah-card__meta">
        <span className="ayah-card__number">{verse.verse_number}</span>
        <div className="ayah-card__meta-actions">
          {/* Per-ayah play tugmasi — faqat onPlayAyah prop berilgan bo'lsa ko'rsatiladi */}
          {onPlayAyah && (
            <button
              className={`ayah-card__play${isPlayingThisAyah ? ' playing' : ''}`}
              onClick={onPlayAyah}
              title={isPlayingThisAyah ? "To'xtatish" : "O'ynash"}
            >
              {isPlayingThisAyah ? '⏸' : '▶'}
            </button>
          )}
          <button
            className={`ayah-card__bookmark${bookmarked ? ' active' : ''}`}
            onClick={handleBookmark}
            title={bookmarked ? t.reader.bookmarked : t.reader.bookmark}
          >
            {bookmarked ? '🔖' : '○'}
          </button>
        </div>
      </div>

      {/* Arab matni — har so'z alohida <span>, bosilganda WordPopup ochiladi.
          currentWordIndex === idx bo'lsa "word--active" klassi qo'shiladi (audio highlight).
          dir="rtl" bilan flex-direction:row birgalikda o'ngdan-chapga tartibni ta'minlaydi. */}
      <div className="ayah-card__arabic" dir="rtl">
        {words.map((word, idx) => (
          <span
            key={word.id}
            className={`word${currentWordIndex === idx ? ' word--active' : ''}`}
            onClick={() => onWordClick(word)}
            dangerouslySetInnerHTML={{
              // tajweed_colors yoqilgan bo'lsa ranglar bilan HTML, aks holda oddiy matn
              __html: settings.tajweed_colors
                ? (word.text_uthmani_tajweed || word.text_uthmani)
                : word.text_uthmani,
            }}
          />
        ))}
        <span className="ayah-end">﴿{verse.verse_number}﴾</span>
      </div>

      {/* Transliteratsiya (lotincha talaffuz) */}
      {showTranslit && (
        <div className="ayah-card__translit">
          {words.map(w => w.transliteration?.text || '').join(' ')}
        </div>
      )}

      {/* Tarjima matni — API dan HTML kelishi mumkin, dangerouslySetInnerHTML kerak */}
      {showTranslation && verse.translations?.[0] && (
        <div
          className="ayah-card__translation"
          dangerouslySetInnerHTML={{ __html: verse.translations[0].text }}
        />
      )}

      {/* Tafsir bo'limi — faqat showTafsir yoqilgan bo'lsa ko'rsatiladi.
          tafsirText null bo'lsa "Yuklanmoqda..." ko'rsatiladi,
          bo'sh string bo'lsa bu tafsir mavjud emas degani. */}
      {showTafsir && (
        <div className="ayah-card__tafsir">
          <span className="ayah-card__tafsir-label">{t.reader.tafsir}</span>
          {tafsirText
            ? <div className="ayah-card__tafsir-text" dangerouslySetInnerHTML={{ __html: tafsirText }} />
            : <p className="ayah-card__tafsir-empty">Yuklanmoqda...</p>
          }
        </div>
      )}
    </div>
  );
});

export default AyahCard;
