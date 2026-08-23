# Persona-Musify

![React](https://img.shields.io/badge/React-19-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-8.0-646CFF?logo=vite)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?logo=tailwindcss)
![Express](https://img.shields.io/badge/Express-5.2-000000?logo=express)
![License](https://img.shields.io/badge/License-MIT-red)

> "Take Your Time." — Web portofolio interaktif gaya Persona 5 yang digabungkan dengan fitur streaming musik dari MusifyRik.

---

## Apa ini?

**Persona-Musify** adalah hasil penggabungan dua project:

- **Persona_Portofolio** — UI/UX portofolio interaktif bertema Persona 5 (React + Vite + Tailwind + GSAP).
- **MusifyRik 3.0** — Backend API musik berbasis Express dengan sumber data YouTube Music (search, lyrics, artist, album, ytplay, dll).

Dengan Persona-Musify, kamu mendapatkan:

- Portofolio penuh dengan navigasi menu gaya Persona 5.
- Halaman **MUSIC** baru untuk mencari dan memutar lagu secara langsung.
- Player musik dengan antrian (queue) dan lirik.
- Backend Express yang menjalankan semua API MusifyRik.

---

## Fitur Utama

- **Persona 5 Visual Styling**: Halftone background, dynamic banners, skewed badges, skema warna ikonik.
- **Dynamic Screen Transitions**: Transisi antarhalaman dengan GSAP + loading overlay.
- **Integrated Music Streaming**: Cari lagu, putar audio, lihat lirik, dan kelola antrian.
- **Keyboard & Mouse Navigation**: Navigasi menu dengan arrow keys, WASD, ENTER, ESC.
- **Backend API**: Express server dengan endpoint `/api/search`, `/api/ytplay`, `/api/lyrics`, `/api/artist`, `/api/album`, `/api/suggest`, `/api/translate`, `/api/transcribe`, `/api/proxy-audio`.

---

## Stack Teknologi

- **Frontend Framework**: [React 19](https://react.dev/)
- **Build Tool**: [Vite 8](https://vitejs.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Animation Engine**: [GSAP](https://greensock.com/gsap/) & `@gsap/react`
- **Backend**: [Express.js 5](https://expressjs.com/) + Axios
- **Icon Pack**: [Lucide React](https://lucide.dev/)

---

## Struktur Direktori

```text
Persona-Musify/
├── api/                         # Handler API MusifyRik (Express)
│   ├── search.js
│   ├── ytplay.js
│   ├── lyrics.js
│   ├── artist.js
│   ├── album.js
│   └── ...
├── server.js                    # Entry point Express server
├── src/
│   ├── components/
│   │   ├── DesktopScaler.tsx
│   │   ├── PersonaAudioPlayer.tsx
│   │   └── TransitionOverlay.tsx
│   ├── pages/home/
│   │   ├── HomePage.tsx
│   │   ├── About.tsx
│   │   ├── ContactMe.tsx
│   │   ├── Projects.tsx
│   │   ├── Skills.tsx
│   │   └── MusicPage.tsx        # Halaman musik baru
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── package.json
├── vite.config.ts
└── README.md
```

---

## Cara Menjalankan

### 1. Install dependencies

```bash
npm install
```

### 2. Jalankan development server

```bash
npm run dev
```

Perintah ini akan menjalankan:

- **Backend Express** di `http://localhost:3000`
- **Frontend Vite** di `http://localhost:5173`

Frontend akan mem-proxy semua request `/api/*` ke backend Express.

### 3. Build untuk production

```bash
npm run build
```

Hasil build akan berada di folder `dist/`.

### 4. Jalankan production server

```bash
npm start
```

Express akan melayani file static dari `dist/` dan API dari `/api/*`.

---

## Catatan

- Beberapa fitur musik bergantung pada ketersediaan layanan pihak ketiga (YouTube Music, downloader audio, dll).
- Pastikan koneksi internet stabil saat menggunakan fitur streaming musik.
- Untuk deployment, set environment variables jika diperlukan: `YT_MUSIC_API_KEY`, `ASSEMBLYAI_API_KEY`.
