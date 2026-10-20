"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";

import { saveVideoForSong } from "../../../lib/video-storage";

type CatalogSong = {
  id: string;
  title: string;
  artist: string;
  genre: string;
  youtubeUrl: string;
  bpm: number;
  difficulty: string;
};

const genres = ["Pop", "Rock", "Sertanejo", "Pagode", "Axé", "Eletrônica", "Forró"];
const difficulties = ["fácil", "médio", "difícil"];

function normalizeYoutubeUrl(value: string) {
  if (!value) return "";

  try {
    const parsed = new URL(value);
    if (parsed.hostname.includes("youtu.be")) {
      return `https://www.youtube.com/watch?v=${parsed.pathname.replace("/", "")}`;
    }

    if (parsed.hostname.includes("youtube.com") || parsed.hostname.includes("www.youtube.com")) {
      return parsed.toString();
    }
  } catch {
    // Ignored for invalid URLs.
  }

  return "";
}

export default function AdminCatalogoPage() {
  const [songs, setSongs] = useState<CatalogSong[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [genre, setGenre] = useState("Pop");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [bpm, setBpm] = useState(110);
  const [difficulty, setDifficulty] = useState("médio");
  const [videoSearchError, setVideoSearchError] = useState("");
  const [isSearchingVideo, setIsSearchingVideo] = useState(false);
  const [downloadVideoOption, setDownloadVideoOption] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState("");
  const [localVideoName, setLocalVideoName] = useState("");

  const loadSongs = async () => {
    const response = await fetch("/api/catalog");
    if (!response.ok) return;
    const data = (await response.json()) as CatalogSong[];
    setSongs(data);
  };

  useEffect(() => {
    loadSongs();
  }, []);

  const filteredSongs = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return songs;

    return songs.filter(
      (song) =>
        song.title.toLowerCase().includes(term) ||
        song.artist.toLowerCase().includes(term) ||
        song.genre.toLowerCase().includes(term),
    );
  }, [searchTerm, songs]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const response = await fetch("/api/catalog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, artist, genre, youtubeUrl, bpm, difficulty }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      alert(data.error ?? "Não foi possível salvar a música.");
      return;
    }

    setTitle("");
    setArtist("");
    setGenre("Pop");
    setYoutubeUrl("");
    setBpm(110);
    setDifficulty("médio");
    await loadSongs();
  };

  const handleDelete = async (id: string) => {
    const response = await fetch(`/api/catalog?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      alert("Não foi possível remover a música.");
      return;
    }

    await loadSongs();
  };

  const handleLocalVideoUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!title.trim() || !artist.trim()) {
      alert("Preencha o título e o artista antes de selecionar um vídeo local.");
      event.target.value = "";
      return;
    }

    await saveVideoForSong(title, artist, file);
    setLocalVideoName(file.name);
    event.target.value = "";
  };

  const handleSearchYoutubeInfo = async () => {
    const cleanUrl = normalizeYoutubeUrl(youtubeUrl);

    if (!cleanUrl) {
      setVideoSearchError("Informe um link válido do YouTube antes de buscar.");
      return;
    }

    setIsSearchingVideo(true);
    setVideoSearchError("");
    setDownloadStatus("");
    setYoutubeUrl(cleanUrl);

    try {
      const response = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(cleanUrl)}`);

      if (!response.ok) {
        throw new Error("Erro ao buscar o vídeo");
      }

      const data = (await response.json()) as {
        title?: string;
        author_name?: string;
      };

      const nextTitle = data.title?.trim() || title.trim() || "Música";
      const nextArtist = data.author_name?.trim() || artist.trim() || "Artista";

      if (nextTitle) {
        setTitle(nextTitle);
      }

      if (nextArtist) {
        setArtist(nextArtist);
      }

      if (downloadVideoOption) {
        const downloadResponse = await fetch("/api/download-video", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: cleanUrl,
            title: nextTitle,
            artist: nextArtist,
          }),
        });

        if (!downloadResponse.ok) {
          throw new Error("Erro ao baixar o vídeo local");
        }

        const downloadData = (await downloadResponse.json()) as { downloadUrl?: string };
        if (downloadData.downloadUrl) {
          setDownloadStatus(`Vídeo baixado com sucesso: ${downloadData.downloadUrl}`);
        }
      }
    } catch {
      setVideoSearchError("Não foi possível buscar as informações do vídeo. Verifique o link.");
    } finally {
      setIsSearchingVideo(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/admin" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-300/50 bg-gradient-to-br from-cyan-200 via-sky-400 to-cyan-600 text-xl text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.35)]">
              ♪
            </div>
            <div>
              <div className="text-[9px] uppercase tracking-[0.26em] text-cyan-100">Admin</div>
              <div className="text-lg font-black uppercase tracking-[0.14em]">Catálogo</div>
            </div>
          </Link>

          <Link href="/admin" className="rounded-full border border-white/10 bg-slate-900 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:border-cyan-300/50 hover:text-white">
            Painel
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6">
          <div className="text-[10px] uppercase tracking-[0.28em] text-cyan-200">Gestão</div>
          <h1 className="mt-2 text-3xl font-black text-white">Cadastrar músicas do catálogo</h1>
        </div>

        <form onSubmit={handleSubmit} className="mb-8 rounded-[28px] border border-white/10 bg-slate-900/80 p-5 shadow-[0_20px_30px_rgba(15,23,42,0.24)]">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="title" className="mb-2 block text-sm text-slate-300">Título</label>
              <input
                id="title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Ex.: Shallow"
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-3 text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="artist" className="mb-2 block text-sm text-slate-300">Artista</label>
              <input
                id="artist"
                value={artist}
                onChange={(event) => setArtist(event.target.value)}
                placeholder="Ex.: Lady Gaga"
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-3 text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="genre" className="mb-2 block text-sm text-slate-300">Gênero</label>
              <select
                id="genre"
                value={genre}
                onChange={(event) => setGenre(event.target.value)}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-3 text-white focus:border-cyan-400 focus:outline-none"
              >
                {genres.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="difficulty" className="mb-2 block text-sm text-slate-300">Dificuldade</label>
              <select
                id="difficulty"
                value={difficulty}
                onChange={(event) => setDifficulty(event.target.value)}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-3 text-white focus:border-cyan-400 focus:outline-none"
              >
                {difficulties.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="bpm" className="mb-2 block text-sm text-slate-300">BPM</label>
              <input
                id="bpm"
                type="number"
                min={60}
                max={220}
                value={bpm}
                onChange={(event) => setBpm(Number(event.target.value) || 110)}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-3 text-white focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="youtubeUrl" className="mb-2 block text-sm text-slate-300">Link do YouTube</label>
              <div className="flex gap-2">
                <input
                  id="youtubeUrl"
                  value={youtubeUrl}
                  onChange={(event) => setYoutubeUrl(event.target.value)}
                  placeholder="https://youtu.be/..."
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-3 text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleSearchYoutubeInfo}
                  disabled={isSearchingVideo || !normalizeYoutubeUrl(youtubeUrl)}
                  className="rounded-2xl border border-cyan-500/50 bg-cyan-500/10 px-4 py-3 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSearchingVideo ? "Buscando..." : "Buscar"}
                </button>
              </div>
              {videoSearchError ? (
                <p className="mt-2 text-sm text-rose-300">{videoSearchError}</p>
              ) : null}

              <label className="mt-3 flex items-center gap-2 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={downloadVideoOption}
                  onChange={(event) => setDownloadVideoOption(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-950 text-cyan-500 focus:ring-cyan-500"
                />
                Baixar vídeo para uso offline
              </label>

              {downloadStatus ? (
                <p className="mt-2 text-xs text-emerald-300">{downloadStatus}</p>
              ) : null}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button type="submit" className="rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-bold uppercase tracking-[0.12em] text-slate-950 transition hover:bg-cyan-400">
              Salvar música
            </button>

            <label className="cursor-pointer rounded-2xl border border-violet-500/50 bg-violet-500/10 px-4 py-3 text-sm font-semibold text-violet-100 transition hover:bg-violet-500/20">
              <input type="file" accept="video/*" className="hidden" onChange={handleLocalVideoUpload} />
              {localVideoName ? "Vídeo local salvo" : "Selecionar vídeo local"}
            </label>
          </div>

          {localVideoName ? (
            <p className="mt-3 text-sm text-emerald-300">Vídeo local ativo: {localVideoName}</p>
          ) : null}
        </form>

        <div className="rounded-[28px] border border-white/10 bg-slate-900/80 p-5">
          <label htmlFor="search" className="mb-2 block text-sm text-slate-300">Buscar música</label>
          <input
            id="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar por título, artista ou gênero..."
            className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-3 text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
          />

          <div className="mt-5 space-y-3">
            {filteredSongs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/60 p-4 text-slate-400">
                Nenhuma música encontrada.
              </div>
            ) : (
              filteredSongs.map((song) => (
                <div key={song.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-3">
                  <div>
                    <div className="font-semibold text-white">{song.title}</div>
                    <div className="text-xs text-slate-400">{song.artist} · {song.genre}</div>
                  </div>

                  <button type="button" onClick={() => handleDelete(song.id)} className="rounded-xl border border-rose-500/50 bg-rose-500/10 px-2.5 py-1.5 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/20">
                    Remover
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
