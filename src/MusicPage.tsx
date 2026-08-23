import { useEffect, useRef, useState } from 'react'
import { Search, Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, X, Music, Disc, ListMusic, Mic2, Loader2 } from 'lucide-react'

interface Song {
  title: string
  videoId: string
  thumbnail: string
  artist: string
  artistId?: string
  album?: string
  albumId?: string
  duration?: string
}

interface LyricLine {
  startTimeMs?: string
  words?: string
  time?: number
  text?: string
}

interface QueueItem extends Song {}

export function MusicPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Song[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [currentSong, setCurrentSong] = useState<Song | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.8)
  const [isMuted, setIsMuted] = useState(false)
  const [audioUrl, setAudioUrl] = useState('')
  const [audioLoading, setAudioLoading] = useState(false)

  const [queue, setQueue] = useState<QueueItem[]>([])
  const [showQueue, setShowQueue] = useState(false)
  const [lyrics, setLyrics] = useState<LyricLine[]>([])
  const [showLyrics, setShowLyrics] = useState(false)
  const [lyricsLoading, setLyricsLoading] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const queueRef = useRef<QueueItem[]>([])
  const playSongRef = useRef<(song: Song) => Promise<void>>(async () => undefined)

  useEffect(() => {
    searchInputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!audioRef.current) return
    audioRef.current.volume = isMuted ? 0 : volume
  }, [volume, isMuted])

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    setError('')
    setResults([])

    try {
      const res = await fetch(`/api/search?query=${encodeURIComponent(query.trim())}&type=all`)
      const data = await res.json()

      if (data.status && data.result?.songs) {
        setResults(data.result.songs)
      } else {
        setError(data.message || 'Tidak ada hasil')
      }
    } catch {
      setError('Gagal mencari lagu. Pastikan server berjalan.')
    } finally {
      setLoading(false)
    }
  }

  const fetchAudio = async (song: Song) => {
    setAudioLoading(true)
    try {
      const res = await fetch('/api/ytplay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: `https://music.youtube.com/watch?v=${song.videoId}` })
      })
      const data = await res.json()

      if (data.status && data.result?.download?.audio) {
        const proxyUrl = `/api/proxy-audio?url=${encodeURIComponent(data.result.download.audio)}`
        setAudioUrl(proxyUrl)
        if (audioRef.current) {
          audioRef.current.src = proxyUrl
          audioRef.current.currentTime = 0
          const playPromise = audioRef.current.play()
          if (playPromise !== undefined) {
            playPromise.then(() => setIsPlaying(true)).catch(() => setIsPlaying(false))
          }
        }
      } else {
        setError('Gagal memuat audio untuk lagu ini')
      }
    } catch {
      setError('Gagal memuat audio')
    } finally {
      setAudioLoading(false)
    }
  }

  const fetchLyrics = async (song: Song) => {
    setLyricsLoading(true)
    try {
      const res = await fetch(`/api/lyrics?id=${song.videoId}&title=${encodeURIComponent(song.title)}&artist=${encodeURIComponent(song.artist)}`)
      const data = await res.json()

      if (data.status && data.result?.lyrics?.lines) {
        setLyrics(data.result.lyrics.lines)
      } else {
        setLyrics([])
      }
    } catch {
      setLyrics([])
    } finally {
      setLyricsLoading(false)
    }
  }

  const playSong = async (song: Song, autoPlay = true) => {
    setCurrentSong(song)
    setIsPlaying(false)
    setCurrentTime(0)
    setDuration(0)
    fetchLyrics(song)
    if (autoPlay) {
      await fetchAudio(song)
    }
  }

  useEffect(() => {
    playSongRef.current = playSong
  })

  useEffect(() => {
    const audio = new Audio()
    audio.volume = 0.8
    audioRef.current = audio

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime)
    const handleLoadedMetadata = () => setDuration(audio.duration || 0)
    const handleEnded = () => {
      const [next, ...rest] = queueRef.current
      if (!next) {
        setIsPlaying(false)
        return
      }

      queueRef.current = rest
      setQueue(rest)
      void playSongRef.current(next)
    }

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('ended', handleEnded)
      audio.pause()
      audioRef.current = null
    }
  }, [])

  const addToQueue = (song: Song) => {
    setQueue((previousQueue) => {
      if (previousQueue.some((item) => item.videoId === song.videoId)) return previousQueue

      const nextQueue = [...previousQueue, song]
      queueRef.current = nextQueue
      return nextQueue
    })
  }

  const handleNext = () => {
    const [next, ...rest] = queueRef.current
    if (!next) {
      setIsPlaying(false)
      return
    }

    queueRef.current = rest
    setQueue(rest)
    void playSong(next)
  }

  const handlePrev = () => {
    // In a real app we'd track history; for now restart current
    if (audioRef.current) {
      audioRef.current.currentTime = 0
    }
  }

  const togglePlay = () => {
    if (!audioRef.current || !currentSong) return
    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      if (!audioRef.current.src && audioUrl) {
        audioRef.current.src = audioUrl
      }
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {})
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value)
    setCurrentTime(val)
    if (audioRef.current) audioRef.current.currentTime = val
  }

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00'
    const m = Math.floor(secs / 60)
    const s = Math.floor(secs % 60)
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  const renderLyrics = () => {
    if (lyricsLoading) return <p className="text-white/60 text-sm">Memuat lirik...</p>
    if (lyrics.length === 0) return <p className="text-white/60 text-sm">Lirik tidak tersedia.</p>

    return (
      <div className="space-y-2 max-h-[180px] overflow-y-auto no-scrollbar pr-1">
        {lyrics.map((line, idx) => (
          <p key={idx} className="text-sm text-white/80 leading-relaxed">
            {line.words || line.text || ''}
          </p>
        ))}
      </div>
    )
  }

  return (
    <main className="h-dvh w-full overflow-hidden bg-black text-white">
      <style>{`
        @keyframes spinDisc {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes slideInRight {
          from { transform: translateX(40px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes pulseEqualizer {
          0%, 100% { height: 4px; }
          50% { height: 14px; }
        }
        .animate-disc-spin {
          animation: spinDisc 7s linear infinite;
        }
        .animate-slide-in {
          animation: slideInRight 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      <section className="relative h-full w-full overflow-hidden animate-slide-in">
        {/* Background gradient */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-neutral-900 via-black to-neutral-900" />
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'radial-gradient(circle at 20% 30%, #e60012 0%, transparent 40%), radial-gradient(circle at 80% 70%, #00A6E8 0%, transparent 35%)'
          }}
        />

        <div className="relative z-10 flex h-full flex-col p-4 md:p-6">
          {/* Header */}
          <header className="flex items-center justify-between gap-4 mb-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 -skew-x-12 items-center justify-center bg-[#e60012] shadow-[3px_3px_0_#fff]">
                <Music className="skew-x-12 text-white" size={22} />
              </div>
              <div>
                <h1 className="font-['Anton','Archivo_Black',Impact] text-2xl uppercase tracking-wide leading-none">
                  Persona <span className="text-[#e60012]">Musify</span>
                </h1>
                <p className="text-[0.65rem] uppercase tracking-widest text-white/60">Streaming Music Interface</p>
              </div>
            </div>
          </header>

          {/* Search */}
          <form onSubmit={handleSearch} className="mb-4 shrink-0">
            <div className="flex -skew-x-12 items-center gap-2 border-2 border-white bg-black p-1 shadow-[4px_4px_0_#e60012]">
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari lagu, artis, atau album..."
                className="skew-x-12 flex-1 bg-transparent px-3 py-2 text-sm text-white placeholder-white/40 outline-none"
              />
              <button
                type="submit"
                disabled={loading}
                className="skew-x-12 flex items-center gap-1 bg-[#e60012] px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-white hover:text-black disabled:opacity-50"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                <span>Cari</span>
              </button>
            </div>
          </form>

          {/* Main content */}
          <div className="flex flex-1 min-h-0 gap-4">
            {/* Results */}
            <div className="flex flex-1 flex-col min-h-0 overflow-hidden rounded-sm border-2 border-white/20 bg-black/60 backdrop-blur-sm">
              <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
                <h2 className="font-['Anton','Archivo_Black',Impact] text-sm uppercase tracking-wider text-white/80">
                  Hasil Pencarian
                </h2>
                <span className="text-[0.65rem] text-white/40">{results.length} lagu ditemukan</span>
              </div>

              <div className="flex-1 overflow-y-auto p-2 no-scrollbar">
                {error && (
                  <div className="mb-3 border border-[#e60012]/50 bg-[#e60012]/10 p-2 text-xs text-[#e60012]">
                    {error}
                  </div>
                )}

                {results.length === 0 && !loading && !error && (
                  <div className="flex h-full flex-col items-center justify-center text-white/30">
                    <Disc size={48} className="mb-2 opacity-50" />
                    <p className="text-xs uppercase tracking-widest">Cari musik untuk memulai</p>
                  </div>
                )}

                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {results.map((song, idx) => {
                    const isCurrent = currentSong?.videoId === song.videoId
                    return (
                      <div
                        key={`${song.videoId}-${idx}`}
                        className={`group relative flex cursor-pointer flex-col gap-2 border-2 p-2 transition hover:-translate-y-0.5 ${
                          isCurrent ? 'border-[#e60012] bg-[#e60012]/10' : 'border-white/20 bg-black hover:border-white'
                        }`}
                        style={{ transform: 'skewX(-2deg)' }}
                        onClick={() => playSong(song)}
                      >
                        <div className="flex gap-3" style={{ transform: 'skewX(2deg)' }}>
                          <div className="relative h-16 w-16 shrink-0 overflow-hidden border border-white/20 bg-neutral-800">
                            <img
                              src={song.thumbnail || `https://i.ytimg.com/vi/${song.videoId}/hqdefault.jpg`}
                              alt={song.title}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                            {isCurrent && isPlaying && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                <div className="flex items-end gap-0.5 h-3">
                                  <span className="w-0.5 animate-[pulseEqualizer_0.5s_infinite] bg-[#e60012]" />
                                  <span className="w-0.5 animate-[pulseEqualizer_0.7s_infinite_0.1s] bg-white" />
                                  <span className="w-0.5 animate-[pulseEqualizer_0.4s_infinite_0.2s] bg-[#e60012]" />
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="truncate text-sm font-bold uppercase leading-tight text-white">
                              {song.title}
                            </h3>
                            <p className="truncate text-xs text-white/60">{song.artist}</p>
                            <p className="text-[0.65rem] text-white/40">{song.duration || '--:--'}</p>
                          </div>
                        </div>

                        <div className="flex gap-2" style={{ transform: 'skewX(2deg)' }}>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); playSong(song) }}
                            className="flex flex-1 items-center justify-center gap-1 bg-white py-1 text-xs font-bold uppercase text-black transition hover:bg-[#e60012] hover:text-white"
                          >
                            {isCurrent && isPlaying ? <Pause size={12} /> : <Play size={12} />}
                            {isCurrent && isPlaying ? 'Pause' : 'Play'}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); addToQueue(song) }}
                            className="flex items-center justify-center border border-white/30 px-2 py-1 text-white/70 transition hover:bg-white hover:text-black"
                            title="Tambah ke antrian"
                          >
                            <ListMusic size={14} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Side panel: Queue / Lyrics */}
            <div className="hidden w-72 shrink-0 flex-col gap-4 md:flex">
              {/* Now Playing */}
              <div className="border-2 border-white bg-black p-3 shadow-[4px_4px_0_#00A6E8]">
                <h3 className="mb-2 font-['Anton','Archivo_Black',Impact] text-xs uppercase tracking-wider text-[#00A6E8]">
                  Sedang Diputar
                </h3>
                {currentSong ? (
                  <div className="flex gap-3">
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden border border-white/20">
                      <img
                        src={currentSong.thumbnail}
                        alt={currentSong.title}
                        className={`h-full w-full object-cover ${isPlaying ? 'animate-disc-spin' : ''}`}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold uppercase text-white">{currentSong.title}</p>
                      <p className="truncate text-xs text-white/60">{currentSong.artist}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-white/40">Belum ada lagu diputar</p>
                )}
              </div>

              {/* Lyrics */}
              <div className="flex flex-1 min-h-0 flex-col border-2 border-white bg-black p-3 shadow-[4px_4px_0_#e60012]">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-['Anton','Archivo_Black',Impact] text-xs uppercase tracking-wider text-[#e60012]">
                    <Mic2 size={12} className="inline mr-1" />
                    Lirik
                  </h3>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
                  {renderLyrics()}
                </div>
              </div>

              {/* Queue */}
              <div className="flex h-48 flex-col border-2 border-white bg-black p-3 shadow-[4px_4px_0_#00A6E8]">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-['Anton','Archivo_Black',Impact] text-xs uppercase tracking-wider text-[#00A6E8]">
                    <ListMusic size={12} className="inline mr-1" />
                    Antrian ({queue.length})
                  </h3>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-2">
                  {queue.length === 0 ? (
                    <p className="text-xs text-white/40">Antrian kosong</p>
                  ) : (
                    queue.map((item, idx) => (
                      <div key={`${item.videoId}-${idx}`} className="flex items-center gap-2 text-xs">
                        <span className="text-white/40">{idx + 1}.</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-bold text-white">{item.title}</p>
                          <p className="truncate text-white/50">{item.artist}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Player bar */}
          <div className="mt-4 shrink-0 border-2 border-white bg-black p-3 shadow-[4px_4px_0_#e60012]">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
              <div className="flex items-center gap-3 md:w-1/3">
                <div className="relative h-12 w-12 shrink-0 overflow-hidden border border-white/20 bg-neutral-800">
                  {currentSong ? (
                    <img
                      src={currentSong.thumbnail}
                      alt={currentSong.title}
                      className={`h-full w-full object-cover ${isPlaying ? 'animate-disc-spin' : ''}`}
                    />
                  ) : (
                    <Music size={20} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white/30" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold uppercase text-white">
                    {currentSong?.title || 'Pilih Lagu'}
                  </p>
                  <p className="truncate text-xs text-white/60">{currentSong?.artist || '---'}</p>
                </div>
              </div>

              <div className="flex flex-1 flex-col gap-1">
                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="flex h-8 w-8 items-center justify-center border border-white/30 text-white transition hover:bg-white hover:text-black"
                  >
                    <SkipBack size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={togglePlay}
                    disabled={!currentSong || audioLoading}
                    className="flex h-10 w-10 -skew-x-12 items-center justify-center bg-[#e60012] text-white shadow-[2px_2px_0_#fff] transition hover:bg-white hover:text-black disabled:opacity-50"
                  >
                    {audioLoading ? (
                      <Loader2 size={18} className="skew-x-12 animate-spin" />
                    ) : isPlaying ? (
                      <Pause size={18} className="skew-x-12" />
                    ) : (
                      <Play size={18} className="skew-x-12" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    className="flex h-8 w-8 items-center justify-center border border-white/30 text-white transition hover:bg-white hover:text-black"
                  >
                    <SkipForward size={16} />
                  </button>
                </div>
                <div className="flex items-center gap-2 text-[0.65rem] font-mono text-white/60">
                  <span>{formatTime(currentTime)}</span>
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    value={currentTime}
                    onChange={handleSeek}
                    className="h-1 flex-1 cursor-pointer appearance-none bg-neutral-800"
                    style={{ accentColor: '#e60012' }}
                  />
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 md:w-1/4 md:justify-end">
                <button
                  type="button"
                  onClick={() => setShowLyrics(!showLyrics)}
                  className={`flex h-8 items-center gap-1 border px-2 text-xs font-bold uppercase transition md:hidden ${showLyrics ? 'border-[#e60012] bg-[#e60012] text-white' : 'border-white/30 text-white hover:bg-white hover:text-black'}`}
                >
                  <Mic2 size={12} /> Lirik
                </button>
                <button
                  type="button"
                  onClick={() => setShowQueue(!showQueue)}
                  className={`flex h-8 items-center gap-1 border px-2 text-xs font-bold uppercase transition md:hidden ${showQueue ? 'border-[#00A6E8] bg-[#00A6E8] text-white' : 'border-white/30 text-white hover:bg-white hover:text-black'}`}
                >
                  <ListMusic size={12} /> Antrian
                </button>
                <button
                  type="button"
                  onClick={() => setIsMuted(!isMuted)}
                  className="flex h-8 w-8 items-center justify-center border border-white/30 text-white transition hover:bg-white hover:text-black"
                  aria-label={isMuted ? 'Nyalakan suara' : 'Matikan suara'}
                >
                  {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="hidden h-1 w-20 cursor-pointer appearance-none bg-neutral-800 sm:block"
                  style={{ accentColor: '#e60012' }}
                  aria-label="Volume"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mobile Lyrics Drawer */}
      {showLyrics && (
        <div className="fixed inset-0 z-50 bg-black/90 p-4 md:hidden">
          <div className="flex h-full flex-col border-2 border-white bg-black p-3">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-['Anton','Archivo_Black',Impact] text-sm uppercase text-[#e60012]">Lirik</h3>
              <button onClick={() => setShowLyrics(false)} className="text-white"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar">{renderLyrics()}</div>
          </div>
        </div>
      )}

      {/* Mobile Queue Drawer */}
      {showQueue && (
        <div className="fixed inset-0 z-50 bg-black/90 p-4 md:hidden">
          <div className="flex h-full flex-col border-2 border-white bg-black p-3">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-['Anton','Archivo_Black',Impact] text-sm uppercase text-[#00A6E8]">Antrian</h3>
              <button onClick={() => setShowQueue(false)} className="text-white"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar space-y-2">
              {queue.map((item, idx) => (
                <div key={`m-${item.videoId}-${idx}`} className="flex items-center gap-2 text-xs">
                  <span className="text-white/40">{idx + 1}.</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-white">{item.title}</p>
                    <p className="truncate text-white/50">{item.artist}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
