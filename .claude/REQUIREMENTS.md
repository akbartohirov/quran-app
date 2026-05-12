# Quran Web App — Technical Requirements

**Versiya:** 1.1  
**Sana:** 2026-05-11  
**Stack:** React + Vite + Vanilla CSS  
**Platforma:** Web (fully responsive, mobile-first)

---

## 1. Loyiha haqida

Shaxsiy foydalanish uchun mo'ljallangan Qur'on web ilovasi. Quran.com ochiq API'laridan foydalanadi. Backend yo'q — barcha ma'lumotlar `localStorage`da saqlanadi. Keyinchalik yaqinlarga ulashish imkoniyati nazarda tutilgan.

---

## 2. Texnik stack

| Qatlam | Texnologiya |
|--------|-------------|
| Framework | React 18 |
| Build tool | Vite |
| Styling | Vanilla CSS (CSS Variables, Flexbox, Grid) |
| Routing | React Router v6 |
| State | React Context + useReducer |
| Persistentlik | localStorage |
| API | api.qurancdn.com (CORS ochiq, token kerak emas) |
| Audio | Web Audio API (native `<audio>`) |
| i18n | Custom i18n hook (UZ / RU / EN) |

---

## 3. API endpointlari

Barcha so'rovlar `https://api.qurancdn.com/api/qdc/` bazasiga yuboriladi.

| Maqsad | Endpoint |
|--------|----------|
| Suralar ro'yxati | `GET /chapters?language=uz` |
| Surani ma'lumoti | `GET /chapters/:id` |
| Oyatlar (so'zma-so'z) | `GET /verses/by_chapter/:id?words=true&translations=149&word_fields=text_uthmani,text_transliteration` |
| Qorilar ro'yxati | `GET /resources/recitations` |
| Qori audio (oyat) | `GET /recitations/:recitation_id/by_chapter/:chapter_id` |
| So'zma-so'z audio | `GET /audio/reciters/1/audio_files?chapter_number=1&segments=true` |
| Tafsirlar ro'yxati | `GET /resources/tafsirs` |
| Tafsir | `GET /tafsirs/:tafsir_id/by_chapter/:chapter_id` |
| Tarjimalar ro'yxati | `GET /resources/translations` |
| Qidiruv | `GET /search?q=...&size=20&page=1` |
| Juzlar | `GET /juzs` |

**Tarjima tili interfeys tiliga bog'liq (avtomatik):**

| Interfeys tili | Tarjima | ID |
|---------------|---------|-----|
| O'zbek | Alouddin Mansur | 149 |
| Русский | Kuliyev | 79 |
| English | Sahih International | 131 |

Foydalanuvchi interfeys tilini o'zgartirsa, tarjima ham avtomatik o'zgaradi. Alohida tarjima tanlash yo'q.

---

## 4. Sahifalar (Routes)

```
/                        → Home
/surah                   → Suralar ro'yxati
/surah/:id               → Surah o'qish sahifasi
/surah/:id/hifz          → Hifz (yodlash) rejimi
/listen                  → Tinglash (qori + surah tanlash)
/search                  → Qidiruv
/settings                → Sozlamalar
```

---

## 5. Sahifalar — batafsil talablar

### 5.1 Home (`/`)

**Maqsad:** Foydalanuvchini har kuni ilovaga qaytaruvchi dashboard.

**Komponentlar:**
- `DailyAyah` — kunlik tasodifiy oyat (arab + tarjima)
- `StreakCard` — ketma-ket o'qish kunlari (🔥 streak)
- `ContinueReading` — oxirgi qolgan joy (surah:ayah)
- `DailyGoalProgress` — kunlik maqsad progressi (masalan: 1 sahifa/kun)
- `QuickNav` — tez o'tish: Surahlar, Hifz, Tinglash

**localStorage kalitlari:**
```
quran_streak_last_date
quran_streak_count
quran_last_position        → { surah: 2, ayah: 255 }
quran_daily_goal           → { type: "page"|"ayah"|"surah", value: 1 }
quran_daily_progress       → { date: "2026-05-11", count: 3 }
```

---

### 5.2 Suralar ro'yxati (`/surah`)

**Maqsad:** Barcha 114 surani ko'rish va tanlash.

**Komponentlar:**
- Qidiruv filtri (nom bo'yicha)
- Tartib: raqam / Makka-Madina / oyat soni
- Har bir karta: arab nomi, transliteratsiya, tarjima nomi, oyat soni, Makka/Madina belgisi
- Oxirgi o'qilgan surahni highlight qilish

---

### 5.3 Surah o'qish sahifasi (`/surah/:id`) ⭐ Asosiy sahifa

**Maqsad:** O'qish + tinglash + tarjima + tafsir — hammasi bir joyda.

#### Layout (mobile-first):
```
[Header: Surah nomi | Qori | Audio controls]
[Bismillah]
[Oyatlar oqimi]
  ├── Arab matn (so'zma-so'z, tajvid ranglari)
  ├── Transliteratsiya (toggle)
  ├── Tarjima — interfeys tiliga mos (toggle)
  └── Tafsir (toggle, collapsible)
[Footer: Oldingi/Keyingi surah]
```

**Tarjima logikasi:** Interfeys tili UZ → UZ tarjima, RU → RU tarjima, EN → EN tarjima. Til o'zgarganda tarjima avtomatik yangilanadi.

#### Audio + Word Highlight:
- Qori tanlash: settings'dan default, sahifada ham o'zgartirish mumkin (barcha qorilar API'dan keladi)
- Play/Pause/Replay
- Oyat audio ijro paytida o'sha oyat highlight bo'ladi
- So'zma-so'z audio rejimi: har bir so'z alohida yonib boradi (timestamp orqali)
- Audio rejimi: `ayah-by-ayah` | `word-by-word` | `full-surah`

#### So'zni bosish (Word Popup):
- Arab so'z
- Transliteratsiya
- Interfeys tiliga mos tarjima
- Grammatik tur (ism, fe'l, harf)

#### Navigatsiya:
- Scroll bilan navigatsiya
- Oyat raqamiga o'tish (jump to ayah)
- Sahifaga o'tish (Mushaf sahifasi)

#### Sozlamalar paneli (sidebar/modal):
- Arab matn o'lchami
- Shrift turi: `uthmani` | `imlaei` | `indopak`
- Tajvid ranglarini on/off
- Tarjimani on/off
- Transliteratsiyani on/off
- Fon: oq / qoʻng'ir / qora (night mode)

---

### 5.4 Hifz rejimi (`/surah/:id/hifz`)

**Maqsad:** Oyatlarni yodlashga yordam berish.

**Rejimlar:**
1. **Eshitish rejimi** — oyat audio, takrorlash soni sozlanadi (1–10x)
2. **Ko'rish-yashirish rejimi** — so'zlarni qisman yashirish (50% | 75% | 100%)
3. **Tekshirish rejimi** — oyatni to'liq yashir, o'zing ayt, keyin ochib tekshir
4. **Progress** — qaysi oyatlar yodlangani belgilanadi (✅), localStorage'da saqlanadi

**localStorage:**
```
quran_hifz_progress → { "2:255": { learned: true, repetitions: 5, lastDate: "..." } }
```

---

### 5.5 Tinglash (`/listen`)

**Maqsad:** Qori tanlash va tinglash tajribasi.

**Komponentlar:**
- Qori tanlash (foto, ism, baholash)
- Surah tanlash
- Audio player (play, pause, oldingi/keyingi oyat, tezlik: 0.75x/1x/1.25x/1.5x)
- Joriy oyat ko'rsatiladi (arab + tarjima)
- Repeat rejimi: oyat / surah / off
- Sleep timer (15/30/60 daqiqa)

**Mashhur qorilar (default ro'yxat):**

| ID | Ism |
|----|-----|
| 7 | Mishary Rashid Al-Afasy |
| 1 | AbdulBaset AbdulSamad |
| 2 | Abdullah Matrood |
| 3 | Al-Husary |
| 5 | Ali Jaber |
| 57 | Yasser Al-Dossari |
| 9 | Al-Juhany |

---

### 5.6 Qidiruv (`/search`)

**Maqsad:** Qur'on bo'yicha matn qidiruvi.

**Xususiyatlar:**
- Arab yoki tarjima tilida qidiruv
- Natijalar: oyat, arab matn, tarjima, surah nomi
- Natijani bosish → `/surah/:id` ga o'tish, o'sha oyatga scroll
- Debounce: 500ms

---

### 5.7 Sozlamalar (`/settings`)

**Bo'limlar:**

| Bo'lim | Sozlamalar |
|--------|-----------|
| Til | O'zbek / Русский / English |
| Tarjima | ID tanlash (UZ: 149, RU: 79, EN: 131) |
| Qori | Default qori tanlash |
| O'qish | Arab shrift o'lchami, tajvid, transliteratsiya |
| Mavzu | Light / Dark / Sepia |
| Maqsad | Kunlik o'qish maqsadi (oyat/sahifa soni) |
| Ma'lumot | localStorage'ni tozalash (reset) |

---

## 6. Dizayn tizimi

### 6.1 Ranglar (CSS Variables)

```css
:root {
  /* Primary */
  --color-primary: #2D6A4F;       /* yashil — asosiy */
  --color-primary-light: #52B788;
  --color-primary-dark: #1B4332;

  /* Neutral */
  --color-bg: #FFFFFF;
  --color-surface: #F8F9FA;
  --color-border: #E9ECEF;
  --color-text: #212529;
  --color-text-muted: #6C757D;

  /* Arabic text */
  --color-arabic: #1A1A2E;

  /* Tajweed colors */
  --tajweed-ghunnah: #C23B22;
  --tajweed-ikhfa: #169B6B;
  --tajweed-idgham: #7C3AED;
  --tajweed-qalqala: #D97706;
  --tajweed-madd: #0369A1;

  /* Status */
  --color-success: #2D6A4F;
  --color-warning: #D97706;
  --color-error: #DC2626;

  /* Dark mode */
  --color-bg-dark: #0F172A;
  --color-surface-dark: #1E293B;
  --color-text-dark: #F1F5F9;
}
```

### 6.2 Tipografiya

```css
/* Arab matn */
--font-arabic: 'KFGQPC Uthmanic Script', 'Scheherazade New', serif;
--font-arabic-size-sm: 1.5rem;
--font-arabic-size-md: 2rem;    /* default */
--font-arabic-size-lg: 2.5rem;
--font-arabic-size-xl: 3rem;

/* UI matn */
--font-ui: 'Plus Jakarta Sans', 'Noto Sans', sans-serif;
--font-size-xs: 0.75rem;
--font-size-sm: 0.875rem;
--font-size-md: 1rem;
--font-size-lg: 1.125rem;
--font-size-xl: 1.25rem;
```

### 6.3 Spacing

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 24px;
--space-6: 32px;
--space-7: 48px;
--space-8: 64px;
```

### 6.4 Breakpointlar

```css
--bp-sm: 480px;    /* kichik mobil */
--bp-md: 768px;    /* planshet */
--bp-lg: 1024px;   /* kichik desktop */
--bp-xl: 1280px;   /* katta desktop */
```

### 6.5 Komponentlar

- `Button` — primary / secondary / ghost / icon
- `Card` — shadow, border-radius: 12px
- `Modal` / `BottomSheet` (mobile'da bottom sheet)
- `AudioPlayer` — fixed bottom bar
- `AyahCard` — oyat konteyneri
- `WordChip` — bosib ma'nosi ko'rinadigan so'z
- `StreakBadge`
- `ProgressBar`
- `Skeleton` — loading holati

---

## 7. Responsive strategiya

**Mobile-first yondashuv:**

| Element | Mobile (< 768px) | Desktop (≥ 768px) |
|---------|-----------------|-------------------|
| Navigation | Bottom tab bar | Left sidebar |
| Audio player | Fixed bottom | Fixed bottom (kengaytirilgan) |
| Tafsir | Modal / drawer | Inline o'ng panel |
| So'z popup | Bottom sheet | Tooltip/popover |
| Settings | To'liq sahifa | Modal |

**Touch gestures (mobile):**
- Swipe left/right → oldingi/keyingi surah
- Long press oyat → bookmark / share
- Pinch to zoom → arab matn o'lchami

---

## 8. localStorage sxemasi

```javascript
// Foydalanuvchi sozlamalari
quran_settings: {
  language: "uz" | "ru" | "en",
  translation_id: 149,
  recitation_id: 7,
  arabic_font_size: "md",
  arabic_font: "uthmani",
  show_transliteration: false,
  show_translation: true,
  tajweed_colors: true,
  theme: "light" | "dark" | "sepia",
  daily_goal: { type: "ayah", value: 10 },
  repeat_mode: "off" | "ayah" | "surah"
}

// O'qish holati
quran_last_position: { surah: 1, ayah: 1, page: 1 }
quran_bookmarks: [ { surah: 2, ayah: 255, note: "...", date: "..." } ]
quran_history: [ { surah: 1, date: "2026-05-11" } ]  // oxirgi 30 ta

// Streak
quran_streak: { count: 5, last_date: "2026-05-11" }
quran_daily_progress: { date: "2026-05-11", ayahs_read: 7 }

// Hifz
quran_hifz: {
  "1:1": { learned: true, reps: 10, last_date: "2026-05-10" },
  "1:2": { learned: false, reps: 3, last_date: "2026-05-09" }
}

// Cache (API ma'lumotlari, 24 soat)
quran_cache_chapters: { data: [...], cached_at: 1234567890 }
quran_cache_surah_1: { data: {...}, cached_at: 1234567890 }
```

---

## 9. API caching strategiyasi

```javascript
const CACHE_TTL = {
  chapters: 7 * 24 * 60 * 60 * 1000,    // 7 kun (o'zgarmaydi)
  verses: 24 * 60 * 60 * 1000,           // 1 kun
  recitations: 7 * 24 * 60 * 60 * 1000,  // 7 kun
  translations: 7 * 24 * 60 * 60 * 1000, // 7 kun
  search: 60 * 60 * 1000,                 // 1 soat
};
```

Har bir API chaqiruvdan oldin `localStorage`da tekshiriladi. TTL o'tmagan bo'lsa, network so'rov yuborilmaydi.

---

## 10. Performance talablari

- **FCP (First Contentful Paint):** < 1.5s
- **LCP (Largest Contentful Paint):** < 2.5s
- **Arab matn render:** < 100ms (font preload)
- **API response (cached):** < 50ms
- **API response (network):** < 2s
- **Audio start:** < 500ms

**Optimizatsiya:**
- Arab fontlarini preload qilish
- API natijalarini aggressiv cache qilish
- Oyatlarni lazy load (virtual scroll katta suralar uchun)
- Audio fayllarni preload (keyingi oyat)
- React.lazy + Suspense (route-based code splitting)

---

## 11. PWA (Progressive Web App)

- `manifest.json` — ilovani homescreen'ga qo'shish imkoniyati
- Service Worker — offline rejim (oxirgi o'qilgan surah cache'da qoladi)
- Push notification yo'q (backend kerak)
- Offline: faqat cache'dagi surahlar ishlaydi, audio yo'q

---

## 12. i18n (Ko'p tillilik)

```javascript
// src/i18n/uz.js, ru.js, en.js
const translations = {
  nav: {
    home: "Bosh sahifa",
    surahs: "Suralar",
    listen: "Tinglash",
    search: "Qidiruv",
    settings: "Sozlamalar"
  },
  player: {
    play: "O'ynatish",
    pause: "To'xtatish",
    next: "Keyingi",
    prev: "Oldingi"
  },
  // ...
}
```

Til o'zgarishi real-time ishlaydi, sahifa qayta yuklanmaydi.

---

## 13. Papka strukturasi

```
quran-app/
├── public/
│   ├── fonts/           → Arab fontlar
│   ├── icons/           → PWA ikonkalari
│   └── manifest.json
├── src/
│   ├── api/
│   │   ├── client.js        → Base fetch + cache wrapper
│   │   ├── chapters.js
│   │   ├── verses.js
│   │   ├── audio.js
│   │   ├── search.js
│   │   └── tafsir.js
│   ├── components/
│   │   ├── common/          → Button, Card, Modal, Skeleton...
│   │   ├── audio/           → AudioPlayer, WordHighlight
│   │   ├── ayah/            → AyahCard, WordChip, WordPopup
│   │   ├── navigation/      → BottomNav, Sidebar
│   │   └── home/            → StreakCard, DailyAyah, GoalProgress
│   ├── pages/
│   │   ├── Home.jsx
│   │   ├── SurahList.jsx
│   │   ├── SurahReader.jsx
│   │   ├── HifzMode.jsx
│   │   ├── Listen.jsx
│   │   ├── Search.jsx
│   │   └── Settings.jsx
│   ├── hooks/
│   │   ├── useAudio.js          → Audio player logikasi
│   │   ├── useWordHighlight.js  → Timestamp sinxronizatsiya
│   │   ├── useStreak.js         → Streak logikasi
│   │   ├── useLocalStorage.js   → Generic localStorage hook
│   │   └── useI18n.js           → Til hook
│   ├── context/
│   │   ├── SettingsContext.jsx
│   │   ├── AudioContext.jsx
│   │   └── ProgressContext.jsx
│   ├── store/
│   │   └── localStorage.js      → Barcha localStorage operatsiyalari
│   ├── i18n/
│   │   ├── uz.js
│   │   ├── ru.js
│   │   └── en.js
│   ├── utils/
│   │   ├── time.js              → Streak hisoblash
│   │   ├── arabic.js            → Arab matn yordamchilari
│   │   └── cache.js             → Cache TTL logikasi
│   ├── styles/
│   │   ├── variables.css        → CSS Variables
│   │   ├── reset.css
│   │   ├── typography.css
│   │   └── utilities.css
│   ├── App.jsx
│   └── main.jsx
├── vite.config.js
└── package.json
```

---

## 14. Ishlab chiqish bosqichlari (Roadmap)

### Bosqich 1 — Asos (1-2 hafta)
- [ ] Loyiha sozlash (Vite + React + Router)
- [ ] Dizayn tizimi (CSS variables, asosiy komponentlar)
- [ ] API layer (client + cache)
- [ ] Suralar ro'yxati sahifasi

### Bosqich 2 — Asosiy funksiya (2-3 hafta)
- [ ] Surah o'qish sahifasi
- [ ] So'zma-so'z matn
- [ ] Audio player
- [ ] Word highlight (timestamp sinxron)
- [ ] Tarjima + Tafsir

### Bosqich 3 — Qo'shimcha (1-2 hafta)
- [ ] Home + Streak
- [ ] Hifz rejimi
- [ ] Tinglash sahifasi
- [ ] Qidiruv

### Bosqich 4 — Sifat (1 hafta)
- [ ] PWA + offline
- [ ] Performance optimallashtirish
- [ ] Ko'p tillilik (UZ/RU/EN)
- [ ] Dark/Sepia rejim
- [ ] Testing

---

*Hujjat versiyasi: 1.0 | Mualif: Shaxsiy loyiha*
