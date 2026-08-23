# Persona Musify

![React](https://img.shields.io/badge/React-19-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-8.0-646CFF?logo=vite)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?logo=tailwindcss)
![Express](https://img.shields.io/badge/Express-5.2-000000?logo=express)

Aplikasi streaming musik yang responsif untuk mencari lagu, memutar audio, melihat lirik, dan mengelola antrian.

## Fitur

- Pencarian lagu dari YouTube Music.
- Pemutaran audio dengan kontrol play, pause, next, seek, volume, dan mute.
- Lirik untuk lagu yang sedang diputar.
- Antrian lagu.
- Tampilan ponsel responsif tanpa permintaan fullscreen atau penguncian orientasi.

## Teknologi

- React 19 + TypeScript
- Vite + Tailwind CSS
- Express + Axios
- Lucide React

## Menjalankan proyek

### 1. Instal dependensi

```bash
npm install
```

### 2. Jalankan mode development

```bash
npm run dev
```

Perintah ini menjalankan backend Express pada port `3000` dan frontend Vite pada port `5173`. Request `/api/*` dari frontend diteruskan ke backend secara otomatis.

### 3. Build production

```bash
npm run build
npm start
```

Hasil build disimpan di `dist/`. Express akan melayani aplikasi dan API dari origin yang sama.

## Endpoint utama

- `GET /api/search`
- `POST /api/ytplay`
- `GET /api/lyrics`
- `GET /api/proxy-audio`

Beberapa fitur bergantung pada layanan pihak ketiga, sehingga hasil pencarian dan pemutaran audio membutuhkan koneksi internet.
