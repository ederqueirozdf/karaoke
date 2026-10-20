"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type CatalogSong = {
  id: string;
  title: string;
  artist: string;
  genre: string;
  youtubeUrl: string;
  bpm: number;
  difficulty: string;
};

const GENRES = ["Todos", "Pop", "Rock", "Sertanejo", "Pagode", "Axé", "Eletrônica", "Forró"];

export default function CatalogoPage() {
  const [songs, setSongs] = useState<CatalogSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("Todos");

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/catalog");
        if (!response.ok) {
          throw new Error("Falha ao carregar catálogo");
        }
        const data = (await response.json()) as CatalogSong[];
        setSongs(data);
      } catch {
        setSongs([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const filteredSongs = useMemo(() => {
    const term = search.trim().toLowerCase();

    return songs.filter((song) => {
      const matchesGenre = selectedGenre === "Todos" || song.genre === selectedGenre;
      const matchesSearch =
        !term ||
        song.title.toLowerCase().includes(term) ||
        song.artist.toLowerCase().includes(term) ||
        song.genre.toLowerCase().includes(term);

      return matchesGenre && matchesSearch;
    });
  }, [search, selectedGenre, songs]);

  const handleDownloadVideo = async (song: CatalogSong) => {
    try {
      const response = await fetch("/api/download-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: song.youtubeUrl,
          title: song.title,
          artist: song.artist,
        }),
      });

      if (!response.ok) {
        throw new Error("Erro ao baixar o vídeo");
      }

      const data = (await response.json()) as { downloadUrl?: string; fileName?: string };
      if (!data.downloadUrl) {
        throw new Error("Arquivo não encontrado");
      }

      const link = document.createElement("a");
      link.href = data.downloadUrl;
      link.download = data.fileName ?? `${song.title}.mp4`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      alert("Não foi possível baixar este vídeo no momento.");
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-300/50 bg-gradient-to-br from-cyan-200 via-sky-400 to-cyan-600 text-xl text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.35)]">
              ♪
            </div>
            <div>
              <div className="text-[9px] uppercase tracking-[0.26em] text-cyan-100">Karaoke</div>
              <div className="text-lg font-black uppercase tracking-[0.14em]">Catálogo</div>
            </div>
          </Link>

          <Link
            href="/"
            className="rounded-full border border-white/10 bg-slate-900 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:border-cyan-300/50 hover:text-white"
          >
            Início
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6">
          <div className="text-[10px] uppercase tracking-[0.28em] text-cyan-200">Catálogo</div>
          <h1 className="mt-2 text-3xl font-black text-white">Músicas do karaokê</h1>
        </div>

        <div className="mb-6 rounded-[24px] border border-white/10 bg-slate-900/80 p-4 shadow-[0_18px_30px_rgba(15,23,42,0.24)]">
          <label htmlFor="catalog-search" className="mb-2 block text-sm text-slate-300">
            Buscar música
          </label>
          <input
            id="catalog-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Pesquise por título, artista ou gênero..."
            className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-3 text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
          />

          <div className="mt-4 flex flex-wrap gap-2">
            {GENRES.map((genre) => (
              <button
                key={genre}
                type="button"
                onClick={() => setSelectedGenre(genre)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                  selectedGenre === genre
                    ? "border-cyan-300 bg-cyan-400 text-slate-950"
                    : "border-white/10 bg-slate-950 text-slate-300 hover:border-cyan-300/50"
                }`}
              >
                {genre}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="rounded-[24px] border border-white/10 bg-slate-900/80 p-6 text-slate-300">
            Carregando catálogo...
          </div>
        ) : filteredSongs.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-slate-700 bg-slate-900/80 p-6 text-slate-300">
            Nenhuma música encontrada para os filtros selecionados.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredSongs.map((song, index) => {
              const videoId = (() => {
                try {
                  const url = new URL(song.youtubeUrl);
                  if (url.hostname.includes("youtu.be")) {
                    return url.pathname.replace("/", "");
                  }
                  return url.searchParams.get("v") ?? "";
                } catch {
                  return "";
                }
              })();

              return (
                <div
                  key={song.id}
                  className="group overflow-hidden rounded-[26px] border border-white/10 bg-slate-900/80 shadow-[0_22px_36px_rgba(15,23,42,0.28)] transition duration-300 hover:-translate-y-1 hover:border-cyan-400/40 hover:shadow-[0_26px_48px_rgba(34,211,238,0.18)]"
                >
                  <div className="relative overflow-hidden">
                    {videoId ? (
                      <>
                        <div className="absolute inset-0 z-10 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                        <span className="absolute left-3 top-3 z-20 rounded-full border border-cyan-400/60 bg-slate-950/80 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.24em] text-cyan-100 backdrop-blur-sm">
                          Vídeo
                        </span>
                        <div className="absolute inset-x-0 bottom-0 z-20 p-4">
                          <div className="text-[10px] uppercase tracking-[0.24em] text-cyan-100/80">Preview</div>
                          <div className="mt-2 text-lg font-black text-white">{song.title}</div>
                        </div>
                        <img
                          src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
                          alt={song.title}
                          className="h-64 w-full object-cover transition duration-500 group-hover:scale-110"
                        />
                      </>
                    ) : (
                      <div className="flex h-64 w-full items-center justify-center bg-slate-800 text-sm text-slate-400">
                        Sem preview
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <div className="mb-3 text-[10px] uppercase tracking-[0.26em] text-cyan-200">#{index + 1}</div>
                    <h2 className="text-xl font-bold text-white">{song.title}</h2>
                    <p className="mt-2 text-sm text-slate-300">{song.artist}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="inline-flex rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] text-cyan-100">
                        {song.genre}
                      </span>
                      <span className="inline-flex rounded-full border border-white/10 bg-slate-800 px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] text-slate-200">
                        {song.difficulty}
                      </span>
                    </div>

                    <div className="mt-5 flex gap-2">
                      <Link
                        href={`/karaoke?song=${encodeURIComponent(song.id)}`}
                        className="inline-flex flex-1 items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-400 to-sky-500 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-slate-950 shadow-[0_18px_26px_rgba(34,211,238,0.35)] transition hover:brightness-110"
                      >
                        Ver música
                      </Link>

                      <button
                        type="button"
                        onClick={() => void handleDownloadVideo(song)}
                        className="rounded-2xl border border-violet-500/50 bg-violet-500/10 px-3 py-3 text-xs font-bold uppercase tracking-[0.14em] text-violet-100 transition hover:bg-violet-500/20"
                      >
                        Baixar
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
