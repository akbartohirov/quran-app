import { useEffect } from 'react';
import { useSettings } from '../../context/SettingsContext.jsx';
import './WordPopup.css';

export default function WordPopup({ word, onClose }) {
  const { t } = useSettings();

  useEffect(() => {
    const handler = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <>
      <div className="word-popup__overlay" onClick={onClose} />
      <div className="word-popup">
        <button className="word-popup__close" onClick={onClose}>✕</button>

        <div className="word-popup__arabic" dir="rtl">
          {word.text_uthmani}
        </div>

        {word.transliteration?.text && (
          <div className="word-popup__translit">{word.transliteration.text}</div>
        )}

        {word.translation?.text && (
          <div className="word-popup__translation">{word.translation.text}</div>
        )}

        {word.char_type_name && (
          <div className="word-popup__type">{word.char_type_name}</div>
        )}
      </div>
    </>
  );
}
