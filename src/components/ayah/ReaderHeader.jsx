import { useState } from 'react';
import { useSettings } from '../../context/SettingsContext.jsx';
import './ReaderHeader.css';

export default function ReaderHeader({
  chapter, chapterId, navigate,
  showTranslit, showTranslation, showTafsir,
  onToggleTranslit, onToggleTranslation, onToggleTafsir,
  totalVerses, onJumpToAyah,
}) {
  const { t } = useSettings();
  const [showJump, setShowJump] = useState(false);
  const [jumpValue, setJumpValue] = useState('');

  const handleJump = (e) => {
    e.preventDefault();
    const num = parseInt(jumpValue);
    if (num >= 1 && num <= totalVerses) {
      onJumpToAyah(num);
      setShowJump(false);
      setJumpValue('');
    }
  };

  return (
    <div className="reader-header">
      <div className="reader-header__top">
        <button className="reader-header__back" onClick={() => navigate('/surah')}>←</button>

        <div className="reader-header__title">
          {chapter ? (
            <>
              <span className="reader-header__name">{chapter.name_simple}</span>
              <span className="reader-header__sub">
                {chapter.translated_name?.name} · {chapter.verses_count} oyat
              </span>
            </>
          ) : (
            <span className="reader-header__name">Surah {chapterId}</span>
          )}
        </div>

        <div className="reader-header__right">
          <div className="reader-header__arabic">{chapter?.name_arabic}</div>
          {totalVerses > 0 && (
            <button
              className="reader-header__jump-btn"
              onClick={() => setShowJump(v => !v)}
              title="Oyatga o'tish"
            >
              #
            </button>
          )}
        </div>
      </div>

      {/* Jump to ayah */}
      {showJump && (
        <form className="reader-header__jump" onSubmit={handleJump}>
          <input
            type="number"
            min={1}
            max={totalVerses}
            value={jumpValue}
            onChange={e => setJumpValue(e.target.value)}
            placeholder={`1 – ${totalVerses}`}
            className="reader-header__jump-input"
            autoFocus
          />
          <button type="submit" className="reader-header__jump-go">O'tish</button>
          <button type="button" className="reader-header__jump-cancel" onClick={() => setShowJump(false)}>✕</button>
        </form>
      )}

      {/* Toggles */}
      <div className="reader-header__toggles">
        <button className={`toggle-btn${showTranslit ? ' active' : ''}`} onClick={onToggleTranslit}>
          {t.reader.transliteration}
        </button>
        <button className={`toggle-btn${showTranslation ? ' active' : ''}`} onClick={onToggleTranslation}>
          {t.reader.translation}
        </button>
        <button className={`toggle-btn${showTafsir ? ' active' : ''}`} onClick={onToggleTafsir}>
          {t.reader.tafsir}
        </button>
      </div>
    </div>
  );
}
