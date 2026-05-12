// ─── Settings ───────────────────────────────────────────────────────────────

const DEFAULTS = {
  language: 'uz',
  recitation_id: 7,
  arabic_font_size: 'md',
  arabic_font: 'uthmani',
  show_transliteration: false,
  show_translation: true,
  tajweed_colors: true,
  theme: 'light',
  daily_goal: { type: 'ayah', value: 10 },
  repeat_mode: 'off',
};

export function getSettings() {
  try {
    const saved = localStorage.getItem('quran_settings');
    return saved ? { ...DEFAULTS, ...JSON.parse(saved) } : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(settings) {
  localStorage.setItem('quran_settings', JSON.stringify(settings));
}

export function updateSetting(key, value) {
  const current = getSettings();
  saveSettings({ ...current, [key]: value });
}

// ─── Last Position ───────────────────────────────────────────────────────────

export function getLastPosition() {
  try {
    const saved = localStorage.getItem('quran_last_position');
    return saved ? JSON.parse(saved) : { surah: 1, ayah: 1 };
  } catch {
    return { surah: 1, ayah: 1 };
  }
}

export function saveLastPosition(surah, ayah) {
  localStorage.setItem('quran_last_position', JSON.stringify({ surah, ayah }));
}

// ─── Bookmarks ───────────────────────────────────────────────────────────────

export function getBookmarks() {
  try {
    const saved = localStorage.getItem('quran_bookmarks');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export function addBookmark(surah, ayah, note = '') {
  const bookmarks = getBookmarks();
  const exists = bookmarks.find(b => b.surah === surah && b.ayah === ayah);
  if (exists) return;
  bookmarks.unshift({ surah, ayah, note, date: new Date().toISOString() });
  localStorage.setItem('quran_bookmarks', JSON.stringify(bookmarks));
}

export function removeBookmark(surah, ayah) {
  const bookmarks = getBookmarks().filter(
    b => !(b.surah === surah && b.ayah === ayah)
  );
  localStorage.setItem('quran_bookmarks', JSON.stringify(bookmarks));
}

export function isBookmarked(surah, ayah) {
  return getBookmarks().some(b => b.surah === surah && b.ayah === ayah);
}

// ─── Streak ──────────────────────────────────────────────────────────────────

export function getStreak() {
  try {
    const saved = localStorage.getItem('quran_streak');
    return saved ? JSON.parse(saved) : { count: 0, last_date: null };
  } catch {
    return { count: 0, last_date: null };
  }
}

export function updateStreak() {
  const today = new Date().toISOString().slice(0, 10);
  const streak = getStreak();
  if (streak.last_date === today) return streak;

  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const newCount = streak.last_date === yesterday ? streak.count + 1 : 1;
  const updated = { count: newCount, last_date: today };
  localStorage.setItem('quran_streak', JSON.stringify(updated));
  return updated;
}

// ─── Daily Progress ──────────────────────────────────────────────────────────

export function getDailyProgress() {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const saved = localStorage.getItem('quran_daily_progress');
    if (!saved) return { date: today, ayahs_read: 0 };
    const parsed = JSON.parse(saved);
    if (parsed.date !== today) return { date: today, ayahs_read: 0 };
    return parsed;
  } catch {
    return { date: new Date().toISOString().slice(0, 10), ayahs_read: 0 };
  }
}

export function incrementDailyProgress() {
  const progress = getDailyProgress();
  const updated = { ...progress, ayahs_read: progress.ayahs_read + 1 };
  localStorage.setItem('quran_daily_progress', JSON.stringify(updated));
  return updated;
}

// ─── Hifz ────────────────────────────────────────────────────────────────────

export function getHifzProgress() {
  try {
    const saved = localStorage.getItem('quran_hifz');
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

export function updateHifzAyah(surah, ayah, data) {
  const progress = getHifzProgress();
  const key = `${surah}:${ayah}`;
  progress[key] = { ...progress[key], ...data, last_date: new Date().toISOString().slice(0, 10) };
  localStorage.setItem('quran_hifz', JSON.stringify(progress));
}

// ─── History ─────────────────────────────────────────────────────────────────

export function getHistory() {
  try {
    const saved = localStorage.getItem('quran_history');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export function addToHistory(surahId) {
  const today = new Date().toISOString().slice(0, 10);
  const history = getHistory().filter(h => h.surah !== surahId);
  history.unshift({ surah: surahId, date: today });
  localStorage.setItem('quran_history', JSON.stringify(history.slice(0, 30)));
}

// ─── Reset ───────────────────────────────────────────────────────────────────

export function resetAllData() {
  const keys = [
    'quran_settings', 'quran_last_position', 'quran_bookmarks',
    'quran_streak', 'quran_daily_progress', 'quran_hifz', 'quran_history',
  ];
  keys.forEach(k => localStorage.removeItem(k));
}
