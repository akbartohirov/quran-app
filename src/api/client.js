const BASE_URL = 'https://api.quran.com/api/v4';

const CACHE_TTL = {
  chapters: 7 * 24 * 60 * 60 * 1000,
  verses: 24 * 60 * 60 * 1000,
  recitations: 7 * 24 * 60 * 60 * 1000,
  translations: 7 * 24 * 60 * 60 * 1000,
  tafsirs: 7 * 24 * 60 * 60 * 1000,
  search: 60 * 60 * 1000,
  juzs: 7 * 24 * 60 * 60 * 1000,
};

function getCacheKey(url) {
  return `quran_cache_${url.replace(/[^a-zA-Z0-9]/g, '_')}`;
}

function getFromCache(url, type) {
  try {
    const key = getCacheKey(url);
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    const { data, cachedAt } = JSON.parse(cached);
    const ttl = CACHE_TTL[type] || 60 * 60 * 1000;
    if (Date.now() - cachedAt > ttl) {
      localStorage.removeItem(key);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function saveToCache(url, data, type) {
  try {
    const key = getCacheKey(url);
    localStorage.setItem(key, JSON.stringify({ data, cachedAt: Date.now() }));
  } catch {
    // localStorage full — skip cache
  }
}

export async function apiGet(path, type = 'verses') {
  const url = `${BASE_URL}${path}`;
  const cached = getFromCache(url, type);
  if (cached) return cached;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  saveToCache(url, data, type);
  return data;
}
