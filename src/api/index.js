import { apiGet } from './client.js';

// ─── Tarjima IDlari ───────────────────────────────────────────────────────────
// Quran.com API da har bir tarjimaning o'z raqami bor.
// Bu IDlar /resources/translations endpoint orqali tekshirilgan (2025-yil).
// uz=101 o'zbek, ru=79 rus, en=20 ingliz (Saheeh International).
export const TRANSLATION_IDS = {
  uz: 101,  // Alauddin Mansour (o'zbek)
  ru: 79,   // Abu Adel (rus)
  en: 20,   // Saheeh International (ingliz)
};

// ─── Tafsir IDlari ────────────────────────────────────────────────────────────
// API da o'zbek tilida tafsir mavjud emas — uz uchun ingliz (Ibn Kathir) ishlatiladi.
export const TAFSIR_IDS = {
  en: 169,  // Ibn Kathir (Abridged) — ingliz
  ru: 170,  // Al-Sa'di — rus
  uz: 169,  // O'zbek tafsir yo'q, ingliz Ibn Kathir bilan almashtriladi
};

// ─── Suralar ─────────────────────────────────────────────────────────────────
export const getChapters = (lang = 'en') =>
  apiGet(`/chapters?language=${lang}`, 'chapters');

export const getChapter = (id, lang = 'en') =>
  apiGet(`/chapters/${id}?language=${lang}`, 'chapters');

// ─── Oyatlar ─────────────────────────────────────────────────────────────────
// words=true — har bir so'zni alohida qaytaradi (so'z ustiga bosish uchun kerak)
// word_fields — har so'z uchun qaysi maydonlar kerakligi
// fields — oyat darajasidagi qo'shimcha maydonlar
// per_page=300 — eng uzun sura (Baqara) 286 oyat, 300 hammani sig'diradi
export const getVersesByChapter = (chapterId, lang = 'en') => {
  const translationId = TRANSLATION_IDS[lang] || 20;
  return apiGet(
    `/verses/by_chapter/${chapterId}?words=true&translations=${translationId}&word_fields=text_uthmani,text_transliteration&fields=text_uthmani,text_transliteration&per_page=300`,
    'verses'
  );
};

// ─── Reciterlar ro'yxati ──────────────────────────────────────────────────────
// AudioPlayer ichida reciter nomini ko'rsatish va tanlash uchun ishlatiladi
export const getRecitations = () =>
  apiGet('/resources/recitations', 'recitations');

// ─── Sura audiolari (oyat boshiga bir fayl) ───────────────────────────────────
// per_page=300 — majburiy: default 10 ta, uzun suralarda 10 dan keyin audio to'xtab qoladi
export const getChapterAudio = (recitationId, chapterId) =>
  apiGet(`/recitations/${recitationId}/by_chapter/${chapterId}?per_page=300`, 'verses');

// ─── So'z-bo'yicha vaqt belgilari (word timing / segments) ───────────────────
// fields=segments — har oyat uchun [[so'z_indeksi, so'z_pozitsiyasi, boshlanish_ms, tugash_ms], ...]
// Bu ma'lumot yordamida audio oqilayotganda har bir so'z o'z vaqtida highlight qilinadi.
// Barcha reciterlar uchun segment mavjud bo'lmasligi mumkin — bunday holda highlight o'chiriladi.
export const getWordByWordAudio = (recitationId, chapterId) =>
  apiGet(`/recitations/${recitationId}/by_chapter/${chapterId}?per_page=300&fields=segments`, 'verses');

// ─── Tafsir ───────────────────────────────────────────────────────────────────
export const getTafsirList = () =>
  apiGet('/resources/tafsirs', 'tafsirs');

export const getTafsirByChapter = (tafsirId, chapterId) =>
  apiGet(`/tafsirs/${tafsirId}/by_chapter/${chapterId}`, 'tafsirs');

// ─── Qidiruv ──────────────────────────────────────────────────────────────────
export const searchQuran = (query, page = 1) =>
  apiGet(`/search?q=${encodeURIComponent(query)}&size=20&page=${page}`, 'search');

// ─── Juzlar ───────────────────────────────────────────────────────────────────
export const getJuzs = () =>
  apiGet('/juzs', 'juzs');
