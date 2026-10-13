"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type PerformerType = "solo" | "dupla";

type Genre =
  | "Pop"
  | "Rock"
  | "Sertanejo"
  | "Pagode"
  | "Pagode Baiano"
  | "Axé"
  | "Eletrônica"
  | "Forró";

type Performer = {
  id: string;
  name: string;
  type: PerformerType;
  createdAt: string;
};

type CatalogSong = {
  id: string;
  title: string;
  artist: string;
  genre: Genre;
  youtubeUrl: string;
  bpm: number;
  difficulty: "fácil" | "médio" | "difícil";
  createdAt: string;
};

type Performance = {
  id: string;
  performerId: string;
  catalogId: string;
  title: string;
  genre: Genre;
  youtubeUrl: string;
  note: number;
  createdAt: string;
};

type VoiceAnalysis = {
  pitch: number;
  timing: number;
  stability: number;
  clarity: number;
  final: number;
  duration: number;
};

type RankingItem = {
  performer: Performer;
  total: number;
  count: number;
  average: number;
};

const STORAGE_KEY = "karaoke-scoreboard-v2";
const GENRES: Genre[] = [
  "Pop",
  "Rock",
  "Sertanejo",
  "Pagode",
  "Pagode Baiano",
  "Axé",
  "Eletrônica",
  "Forró",
];

const seedCatalog: CatalogSong[] = [
  {
    id: "song-pop-1",
    title: "Shallow",
    artist: "Lady Gaga & Bradley Cooper",
    genre: "Pop",
    youtubeUrl: "https://www.youtube.com/watch?v=bo_efYhYU2A",
    bpm: 96,
    difficulty: "médio",
    createdAt: new Date().toISOString(),
  },
  {
    id: "song-rock-1",
    title: "The Pretender",
    artist: "Foo Fighters",
    genre: "Rock",
    youtubeUrl: "https://www.youtube.com/watch?v=SJOKlqGQHqA",
    bpm: 128,
    difficulty: "difícil",
    createdAt: new Date().toISOString(),
  },
  {
    id: "song-sertanejo-1",
    title: "Evidências",
    artist: "Chitãozinho & Xororó",
    genre: "Sertanejo",
    youtubeUrl: "https://www.youtube.com/watch?v=K5mYxxX4s3A",
    bpm: 104,
    difficulty: "médio",
    createdAt: new Date().toISOString(),
  },
  {
    id: "song-pagode-1",
    title: "Deixa Eu Te Amar",
    artist: "Turma do Pagode",
    genre: "Pagode",
    youtubeUrl: "https://www.youtube.com/watch?v=Qn8U-9v35nY",
    bpm: 88,
    difficulty: "fácil",
    createdAt: new Date().toISOString(),
  },
  {
    id: "song-electro-1",
    title: "Titanium",
    artist: "David Guetta",
    genre: "Eletrônica",
    youtubeUrl: "https://www.youtube.com/watch?v=JRfuAukYTKg",
    bpm: 126,
    difficulty: "médio",
    createdAt: new Date().toISOString(),
  },
  {
    id: "song-forro-1",
    title: "Baião de 2",
    artist: "Geraldo Azevedo",
    genre: "Forró",
    youtubeUrl: "https://www.youtube.com/watch?v=VQ7G55J7dH0",
    bpm: 110,
    difficulty: "médio",
    createdAt: new Date().toISOString(),
  },
];

const todayIso = () => new Date().toISOString();

function makeId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 11)}`;
}

function normalizeYoutubeUrl(raw: string) {
  const value = raw.trim();
  if (!value) {
    return "";
  }

  try {
    const url = new URL(value);
    const hostname = url.hostname.replace(/^www\./, "");

    if (hostname === "youtu.be") {
      return value;
    }

    if (
      hostname === "youtube.com" ||
      hostname === "m.youtube.com" ||
      hostname.endsWith(".youtube.com")
    ) {
      return value;
    }
  } catch {
    return "";
  }

  return "";
}

function youtubeVideoId(url: string) {
  if (!url) {
    return "";
  }

  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) {
      return parsed.pathname.replace("/", "");
    }

    if (parsed.searchParams.has("v")) {
      return parsed.searchParams.get("v") ?? "";
    }
  } catch {
    // Ignored for invalid URLs.
  }

  return "";
}

function formatDate(dateValue: string) {
  const date = new Date(dateValue);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function generateAutomaticScore(song: CatalogSong, performer: Performer) {
  const difficultyWeight =
    song.difficulty === "fácil" ? 0.9 : song.difficulty === "médio" ? 1.4 : 1.9;
  const rhythmMatch = 1 - Math.abs(song.bpm - 110) / 130;
  const performerBonus = performer.type === "dupla" ? 0.55 : 0.3;
  const randomStability = 0.85 + Math.random() * 1.75;

  const score =
    (rhythmMatch * 5 + difficultyWeight * 2 + performerBonus + randomStability) * 1.35;

  return Number(clamp(score, 4.5, 10).toFixed(1));
}

function analyzeVoiceFromAudioBuffer(audioBuffer: AudioBuffer): VoiceAnalysis {
  const data = audioBuffer.getChannelData(0);
  let squaredSum = 0;
  let peak = 0;
  let silenceSamples = 0;

  for (let index = 0; index < data.length; index += 1) {
    const sample = Math.abs(data[index]);
    squaredSum += sample * sample;
    peak = Math.max(peak, sample);
    if (sample < 0.01) {
      silenceSamples += 1;
    }
  }

  const rms = Math.sqrt(squaredSum / Math.max(data.length, 1));
  const silenceRatio = silenceSamples / Math.max(data.length, 1);
  const energy = clamp(rms * 12, 0.15, 1);
  const stability = clamp(1 - silenceRatio * 1.8, 0.3, 1);
  const clarity = clamp(0.45 + peak * 2.2 + energy * 0.35, 0.2, 1);
  const timing = clamp(0.7 + (audioBuffer.duration / 60) * 0.25 + (1 - silenceRatio) * 0.2, 0.2, 1);
  const pitch = clamp(0.5 + energy * 0.6 + stability * 0.4, 0.2, 1);

  const finalScore = clamp((pitch * 0.35 + timing * 0.3 + stability * 0.2 + clarity * 0.15) * 10, 0, 10);

  return {
    pitch: Number((pitch * 10).toFixed(1)),
    timing: Number((timing * 10).toFixed(1)),
    stability: Number((stability * 10).toFixed(1)),
    clarity: Number((clarity * 10).toFixed(1)),
    final: Number(finalScore.toFixed(1)),
    duration: Number(audioBuffer.duration.toFixed(1)),
  };
}

function getRanking(
  performances: Performance[],
  performers: Performer[],
  filterByDay: boolean,
  dateKey: string,
) {
  const grouped = new Map<string, RankingItem>();

  for (const performance of performances) {
    const performanceDate = new Date(performance.createdAt).toISOString().slice(0, 10);
    const isForToday = performanceDate === dateKey;

    if (filterByDay && !isForToday) {
      continue;
    }

    const performer = performers.find((item) => item.id === performance.performerId);
    if (!performer) {
      continue;
    }

    const current = grouped.get(performer.id) ?? {
      performer,
      total: 0,
      count: 0,
      average: 0,
    };

    current.total += performance.note;
    current.count += 1;
    grouped.set(performer.id, current);
  }

  return Array.from(grouped.values())
    .map((item) => ({
      ...item,
      average: item.count ? Number((item.total / item.count).toFixed(2)) : 0,
    }))
    .sort((a, b) => b.total - a.total || b.average - a.average);
}

export default function Home() {
  const [performers, setPerformers] = useState<Performer[]>([]);
  const [catalogSongs, setCatalogSongs] = useState<CatalogSong[]>([]);
  const [performances, setPerformances] = useState<Performance[]>([]);
  const [leaderboard, setLeaderboard] = useState<RankingItem[]>([]);
  const [todayKey, setTodayKey] = useState("");

  const [performerName, setPerformerName] = useState("");
  const [performerType, setPerformerType] = useState<PerformerType>("solo");

  const [songTitle, setSongTitle] = useState("");
  const [songArtist, setSongArtist] = useState("");
  const [songGenre, setSongGenre] = useState<Genre>("Pop");
  const [songUrl, setSongUrl] = useState("");
  const [videoSearchError, setVideoSearchError] = useState("");
  const [isSearchingVideo, setIsSearchingVideo] = useState(false);

  const [selectedGenre, setSelectedGenre] = useState<Genre>("Pop");
  const [songSearchTerm, setSongSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"usadas" | "recentes" | "alfabetica" | "favoritas">(
    "usadas",
  );
  const [catalogViewMode, setCatalogViewMode] = useState<"grid" | "list">("grid");
  const [favoriteSongIds, setFavoriteSongIds] = useState<string[]>([]);
  const [selectedSongId, setSelectedSongId] = useState("");
  const [selectedPerformerId, setSelectedPerformerId] = useState("");
  const [performerSearchTerm, setPerformerSearchTerm] = useState("");
  const [editingPerformerId, setEditingPerformerId] = useState<string | null>(null);
  const [lastScore, setLastScore] = useState<number | null>(null);
  const [activeView, setActiveView] = useState<"admin" | "karaoke">("karaoke");
  const [showPlaybackScreen, setShowPlaybackScreen] = useState(false);
  const [showStartConfirmation, setShowStartConfirmation] = useState(false);
  const [videoCompleted, setVideoCompleted] = useState(false);
  const [activeRankingView, setActiveRankingView] = useState<"day" | "overall">("day");
  const [voiceAnalysis, setVoiceAnalysis] = useState<VoiceAnalysis | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [playbackStarted, setPlaybackStarted] = useState(false);
  const [performanceStatus, setPerformanceStatus] = useState("");
  const [recordingStatus, setRecordingStatus] = useState("Selecione o cantor e a música para iniciar");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const youtubePlayerRef = useRef<any>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [performersResponse, catalogResponse, performancesResponse, leaderboardResponse] =
          await Promise.all([
            fetch("/api/performers"),
            fetch("/api/catalog"),
            fetch("/api/performances"),
            fetch("/api/leaderboard"),
          ]);

        if (
          !performersResponse.ok ||
          !catalogResponse.ok ||
          !performancesResponse.ok ||
          !leaderboardResponse.ok
        ) {
          throw new Error("Falha ao carregar dados do banco");
        }

        const loadedPerformers = (await performersResponse.json()) as Performer[];
        const loadedCatalogSongs = (await catalogResponse.json()) as CatalogSong[];
        const loadedPerformances = (await performancesResponse.json()) as Performance[];
        const loadedLeaderboard = (await leaderboardResponse.json()) as RankingItem[];

        setPerformers(loadedPerformers);
        setCatalogSongs(loadedCatalogSongs);
        setPerformances(loadedPerformances);
        setLeaderboard(loadedLeaderboard);

        if (loadedPerformers[0]) {
          setSelectedPerformerId(loadedPerformers[0].id);
        }

        if (loadedCatalogSongs[0]) {
          setSelectedGenre(loadedCatalogSongs[0].genre);
          setSelectedSongId(loadedCatalogSongs[0].id);
        }
      } catch {
        setPerformers([]);
        setCatalogSongs([]);
        setPerformances([]);
        setLeaderboard([]);
      }
    };

    setTodayKey(new Date().toISOString().slice(0, 10));
    loadData();
  }, []);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const songUsageCounts = useMemo(() => {
    const counts = new Map<string, number>();

    performances.forEach((performance) => {
      counts.set(performance.catalogId, (counts.get(performance.catalogId) ?? 0) + 1);
    });

    return counts;
  }, [performances]);

  const filteredCatalog = useMemo(() => {
    const normalizedSearch = songSearchTerm.trim().toLowerCase();

    return catalogSongs
      .filter((song) => song.genre === selectedGenre)
      .filter((song) => {
        if (!normalizedSearch) {
          return true;
        }

        const searchableText = [song.title, song.artist, song.genre, song.difficulty]
          .join(" ")
          .toLowerCase();

        return searchableText.includes(normalizedSearch);
      })
      .map((song) => ({
        ...song,
        usageCount: songUsageCounts.get(song.id) ?? 0,
        isFavorite: favoriteSongIds.includes(song.id),
      }))
      .sort((a, b) => {
        if (sortBy === "favoritas") {
          return Number(b.isFavorite) - Number(a.isFavorite) || b.usageCount - a.usageCount;
        }

        if (sortBy === "recentes") {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }

        if (sortBy === "alfabetica") {
          return a.title.localeCompare(b.title);
        }

        return b.usageCount - a.usageCount || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [catalogSongs, favoriteSongIds, selectedGenre, songSearchTerm, songUsageCounts, sortBy]);

  const selectedSong = useMemo(
    () => catalogSongs.find((song) => song.id === selectedSongId) ?? null,
    [catalogSongs, selectedSongId],
  );

  const dailyRanking = useMemo(
    () => getRanking(performances, performers, true, todayKey || ""),
    [performances, performers, todayKey],
  );

  const overallRanking = useMemo(
    () =>
      leaderboard.length > 0
        ? leaderboard
        : getRanking(performances, performers, false, todayKey || ""),
    [leaderboard, performances, performers, todayKey],
  );

  const recentPerformances = performances.slice(0, 6);

  const filteredPerformers = useMemo(() => {
    const normalizedSearch = performerSearchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return performers;
    }

    return performers.filter((performer) => {
      const searchableText = [performer.name, performer.type].join(" ").toLowerCase();
      return searchableText.includes(normalizedSearch);
    });
  }, [performerSearchTerm, performers]);

  const handleResetRankings = () => {
    setPerformances([]);
    setLeaderboard([]);
    setLastScore(null);
    setVoiceAnalysis(null);
    setRecordingStatus("Rankings zerados. O sistema está pronto para nova avaliação.");
  };

  useEffect(() => {
    if (!showPlaybackScreen || !selectedSong || !playbackStarted) {
      if (youtubePlayerRef.current) {
        try {
          youtubePlayerRef.current.stopVideo?.();
          youtubePlayerRef.current.destroy?.();
        } catch {
          // ignored
        }
        youtubePlayerRef.current = null;
      }
      return;
    }

    const initializeYoutubePlayer = () => {
      const videoId = youtubeVideoId(selectedSong.youtubeUrl);
      if (!videoId) {
        return;
      }

      if (youtubePlayerRef.current) {
        try {
          youtubePlayerRef.current.destroy();
        } catch {
          // ignored
        }
      }

      const player = new (window as any).YT.Player("karaoke-player", {
        videoId,
        playerVars: {
          autoplay: 1,
          mute: 1,
          rel: 0,
          playsinline: 1,
          controls: 1,
        },
        events: {
          onReady: (event: any) => {
            try {
              event.target.playVideo();
              event.target.unMute();
            } catch {
              // ignored
            }
          },
          onStateChange: (event: any) => {
            if (event.data === (window as any).YT.PlayerState.ENDED) {
              void handleVideoFinished();
            }
          },
        },
      });

      youtubePlayerRef.current = player;
    };

    if (!(window as any).YT) {
      const existingScript = document.getElementById("youtube-iframe-api");

      if (!existingScript) {
        const script = document.createElement("script");
        script.id = "youtube-iframe-api";
        script.src = "https://www.youtube.com/iframe_api";
        script.async = true;
        document.body.appendChild(script);
      }

      const waitForApi = () => {
        if ((window as any).YT && (window as any).YT.Player) {
          initializeYoutubePlayer();
          return;
        }
        window.setTimeout(waitForApi, 200);
      };

      waitForApi();
      return;
    }

    initializeYoutubePlayer();
  }, [selectedSong, showPlaybackScreen, playbackStarted]);

  const handleAddPerformer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = performerName.trim();
    if (!trimmedName) {
      return;
    }

    const alreadyExists = performers.some(
      (performer) =>
        performer.name.trim().toLowerCase() === trimmedName.toLowerCase() &&
        performer.type === performerType &&
        performer.id !== editingPerformerId,
    );

    if (alreadyExists) {
      return;
    }

    try {
      const endpoint = editingPerformerId ? "/api/performers" : "/api/performers";
      const method = editingPerformerId ? "PUT" : "POST";
      const body = editingPerformerId
        ? { id: editingPerformerId, name: trimmedName, type: performerType }
        : { name: trimmedName, type: performerType };

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error("Não foi possível salvar o cantor");
      }

      const savedPerformer = (await response.json()) as Performer;

      if (editingPerformerId) {
        setPerformers((current) =>
          current.map((performer) =>
            performer.id === editingPerformerId ? { ...performer, ...savedPerformer } : performer,
          ),
        );
      } else {
        setPerformers((current) => [savedPerformer, ...current]);
        setSelectedPerformerId(savedPerformer.id);
      }

      setPerformerName("");
      setPerformerType("solo");
      setEditingPerformerId(null);
    } catch {
      // Silent fail to keep the UI stable; the user can retry.
    }
  };

  const handleDeletePerformer = async (id: string) => {
    if (!id) {
      return;
    }

    try {
      const response = await fetch(`/api/performers?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Não foi possível remover o cantor");
      }

      setPerformers((current) => current.filter((performer) => performer.id !== id));
      if (selectedPerformerId === id) {
        setSelectedPerformerId("");
      }
      if (editingPerformerId === id) {
        setEditingPerformerId(null);
        setPerformerName("");
        setPerformerType("solo");
      }
    } catch {
      // Silent fail to keep the UI stable; the user can retry.
    }
  };

  const handleEditPerformer = (performer: Performer) => {
    setEditingPerformerId(performer.id);
    setPerformerName(performer.name);
    setPerformerType(performer.type === "dupla" ? "dupla" : "solo");
  };

  const handleSearchYoutubeInfo = async () => {
    const cleanUrl = normalizeYoutubeUrl(songUrl);

    if (!cleanUrl) {
      setVideoSearchError("Informe um link válido do YouTube antes de buscar.");
      return;
    }

    setIsSearchingVideo(true);
    setVideoSearchError("");

    try {
      const response = await fetch(
        `https://noembed.com/embed?url=${encodeURIComponent(cleanUrl)}`,
      );

      if (!response.ok) {
        throw new Error("Erro ao buscar o vídeo");
      }

      const data = (await response.json()) as {
        title?: string;
        author_name?: string;
      };

      if (data.title) {
        setSongTitle(data.title);
      }

      if (data.author_name) {
        setSongArtist(data.author_name);
      }
    } catch {
      setVideoSearchError("Não foi possível buscar as informações do vídeo. Verifique o link.");
    } finally {
      setIsSearchingVideo(false);
    }
  };

  const handleAddCatalogSong = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const cleanUrl = normalizeYoutubeUrl(songUrl);
    const trimmedTitle = songTitle.trim();
    const trimmedArtist = songArtist.trim();

    if (!trimmedTitle || !trimmedArtist || !cleanUrl) {
      return;
    }

    try {
      const response = await fetch("/api/catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: trimmedTitle,
          artist: trimmedArtist,
          genre: songGenre,
          youtubeUrl: cleanUrl,
          bpm: 110,
          difficulty: "médio",
        }),
      });

      if (!response.ok) {
        throw new Error("Não foi possível salvar a música");
      }

      const createdSong = (await response.json()) as CatalogSong;

      setCatalogSongs((current) => [createdSong, ...current]);
      setSelectedGenre(createdSong.genre);
      setSelectedSongId(createdSong.id);
      setSongTitle("");
      setSongArtist("");
      setSongGenre("Pop");
      setSongUrl("");
      setVideoSearchError("");
    } catch {
      // Silent fail to keep the UI stable; the user can retry.
    }
  };

  const handleVoiceCapture = async (shouldStart: boolean) => {
    if (!shouldStart) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      setRecordingStatus("Processando gravação...");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;

        if (blob.size === 0) {
          setRecordingStatus("Nenhum áudio foi capturado");
          return;
        }

        try {
          const arrayBuffer = await blob.arrayBuffer();
          const audioContext = new AudioContext();
          const decodedAudio = await audioContext.decodeAudioData(arrayBuffer.slice(0));
          const nextAnalysis = analyzeVoiceFromAudioBuffer(decodedAudio);
          setVoiceAnalysis(nextAnalysis);
          setRecordingStatus(`Voz capturada · ${nextAnalysis.duration}s`);
          await audioContext.close();
        } catch {
          setRecordingStatus("Não foi possível analisar a gravação");
        }
      };

      recorder.start();
      setIsRecording(true);
      setRecordingStatus("Gravando voz do cantor...");
    } catch {
      setRecordingStatus("Permita o acesso ao microfone para avaliar a voz");
    }
  };

  const handleStartPerformance = async () => {
    if (!selectedPerformerId || !selectedSongId) {
      setRecordingStatus("Selecione o cantor e a música antes de iniciar");
      return;
    }

    setVideoCompleted(false);
    setPlaybackStarted(true);
    setPerformanceStatus("");
    setRecordingStatus("Preparando vídeo e gravação...");

    window.setTimeout(() => {
      try {
        youtubePlayerRef.current?.playVideo?.();
        youtubePlayerRef.current?.unMute?.();
      } catch {
        // ignored
      }
    }, 250);

    await handleVoiceCapture(true);
  };

  const handleVideoFinished = async () => {
    setVideoCompleted(true);
    setPlaybackStarted(false);
    setPerformanceStatus("Vídeo finalizado. Finalize a avaliação desta performance.");
    setRecordingStatus("Vídeo finalizado. Finalize a avaliação desta performance.");
    await handleVoiceCapture(false);
  };

  const handleFinalizePerformance = async () => {
    if (!selectedPerformerId || !selectedSongId) {
      return;
    }

    const performer = performers.find((item) => item.id === selectedPerformerId);
    const song = catalogSongs.find((item) => item.id === selectedSongId);

    if (!performer || !song) {
      return;
    }

    const baseScore = generateAutomaticScore(song, performer);
    const score = voiceAnalysis
      ? Number(((baseScore * 0.55 + voiceAnalysis.final * 0.45)).toFixed(1))
      : baseScore;

    try {
      const response = await fetch("/api/performances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          performerId: performer.id,
          catalogId: song.id,
          title: song.title,
          genre: song.genre,
          youtubeUrl: song.youtubeUrl,
          note: score,
        }),
      });

      if (!response.ok) {
        throw new Error("Não foi possível salvar a avaliação");
      }

      const createdPerformance = (await response.json()) as Performance;

      setPerformanceStatus("Avaliação concluída — nota registrada");
      setRecordingStatus("Avaliação concluída — nota registrada");
      setPerformances((current) => [createdPerformance, ...current]);
      setLeaderboard((current) => {
        const performer = performers.find((item) => item.id === selectedPerformerId);
        if (!performer) {
          return current;
        }

        const nextItem = {
          performer,
          total: score,
          count: 1,
          average: score,
        };

        const existing = current.find((item) => item.performer.id === performer.id);
        if (!existing) {
          return [nextItem, ...current];
        }

        return current
          .map((item) =>
            item.performer.id === performer.id
              ? {
                  ...item,
                  total: Number((item.total + score).toFixed(1)),
                  count: item.count + 1,
                  average: Number(((item.total + score) / (item.count + 1)).toFixed(2)),
                }
              : item,
          )
          .sort((a, b) => b.total - a.total || b.average - a.average);
      });
      setLastScore(score);
    } catch {
      // Silent fail to keep the UI stable; the user can retry.
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(124,58,237,0.28),_transparent_35%),linear-gradient(135deg,_#020617_0%,_#0f172a_35%,_#111827_100%)] px-4 py-8 text-slate-50">
      <div className="mx-auto max-w-7xl">
        {showStartConfirmation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-[28px] border border-violet-500/20 bg-slate-900 p-6 shadow-[0_0_50px_rgba(124,58,237,0.25)]">
              <div className="mb-4 text-xs uppercase tracking-[0.26em] text-violet-200">Confirmação antes do início</div>
              <h3 className="text-2xl font-bold text-white">Selecione o cantor</h3>
              <p className="mt-3 text-sm text-slate-300">
                {selectedPerformerId
                  ? `O cantor selecionado é ${performers.find((item) => item.id === selectedPerformerId)?.name ?? "não identificado"}.`
                  : "Nenhum cantor foi selecionado ainda."}
              </p>
              <p className="mt-2 text-sm text-slate-400">
                Confirme o nome antes de iniciar o vídeo e a gravação da voz.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setShowStartConfirmation(false)}
                  className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-slate-500"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setShowStartConfirmation(false);
                    if (!selectedPerformerId) {
                      setRecordingStatus("Selecione um cantor antes de iniciar");
                      return;
                    }
                    await handleStartPerformance();
                  }}
                  className="rounded-2xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
                >
                  Iniciar gravação
                </button>
              </div>
            </div>
          </div>
        )}

        <header className="relative mb-8 overflow-hidden rounded-[28px] border border-violet-500/25 bg-slate-900/80 p-6 shadow-[0_0_50px_rgba(124,58,237,0.18)] backdrop-blur-xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(236,72,153,0.18),_transparent_30%)]" />
          <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="flex flex-col gap-1">
              <div className="text-xs font-black uppercase tracking-[0.38em] text-yellow-300 md:text-sm">
                Karaoke dos Primos
              </div>
              <h1 className="text-2xl font-black uppercase tracking-[0.1em] text-white md:text-4xl">
                PRIMOS DF GO RN
              </h1>
            </div>
            <div className="flex gap-3 text-sm text-slate-300">
              <div className="rounded-2xl border border-slate-700 bg-slate-800/90 px-4 py-3 shadow-lg shadow-slate-950/40">
                <div className="text-slate-400">Cantores</div>
                <div className="text-xl font-bold text-white">{performers.length}</div>
              </div>
              <div className="rounded-2xl border border-slate-700 bg-slate-800/90 px-4 py-3 shadow-lg shadow-slate-950/40">
                <div className="text-slate-400">Músicas</div>
                <div className="text-xl font-bold text-white">{catalogSongs.length}</div>
              </div>
              <div className="rounded-2xl border border-slate-700 bg-slate-800/90 px-4 py-3 shadow-lg shadow-slate-950/40">
                <div className="text-slate-400">Avaliações</div>
                <div className="text-xl font-bold text-white">{performances.length}</div>
              </div>
            </div>
          </div>
        </header>

        <div className="mb-8 flex flex-wrap gap-3 rounded-3xl border border-slate-800 bg-slate-900/90 p-3">
          <button
            type="button"
            onClick={() => setActiveView("admin")}
            className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
              activeView === "admin"
                ? "bg-violet-500 text-white shadow-lg shadow-violet-500/20"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            Administração
          </button>
          <button
            type="button"
            onClick={() => setActiveView("karaoke")}
            className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
              activeView === "karaoke"
                ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            Tela de karaoke
          </button>
        </div>

        <div className="mb-8 rounded-[28px] border border-slate-800 bg-slate-900/90 p-5 shadow-lg shadow-slate-950/40">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-violet-200">
                Ranking
              </div>
              <h2 className="mt-2 text-xl font-semibold text-white">Melhores cantores</h2>
            </div>

            <div className="flex gap-2">
              {([
                { key: "day", label: "Ranking do dia" },
                { key: "overall", label: "Ranking geral" },
              ] as const).map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActiveRankingView(item.key)}
                  className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide transition ${
                    activeRankingView === item.key
                      ? "border-violet-400 bg-violet-500 text-white"
                      : "border-slate-700 bg-slate-950 text-slate-300 hover:border-violet-500/50"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {(activeRankingView === "day" ? dailyRanking : overallRanking)
              .slice(0, 5)
              .map((entry, index) => (
                <div
                  key={`${activeRankingView}-${entry.performer.id}`}
                  className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-2.5"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-500/20 text-sm font-bold text-violet-200">
                      #{index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-white">{entry.performer.name}</div>
                      <div className="text-xs text-slate-400">
                        {entry.performer.type === "solo" ? "Solo" : "Dupla"}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-lg font-bold text-white">{entry.total.toFixed(1)}</div>
                    <div className="text-[11px] uppercase tracking-wide text-slate-400">
                      Média {entry.average.toFixed(1)}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {activeView === "admin" ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="space-y-6">
              <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-lg shadow-slate-950/40">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-white">Controle do sistema</h2>
                  <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-xs uppercase tracking-wide text-amber-200">
                    ranking
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleResetRankings}
                  className="w-full rounded-2xl border border-amber-500/60 bg-amber-500/10 px-4 py-3 font-semibold text-amber-100 transition hover:bg-amber-500/20"
                >
                  Zerar rankings
                </button>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-lg shadow-slate-950/40">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-white">Cantores cadastrados</h2>
                  <span className="rounded-full border border-violet-500/40 bg-violet-500/10 px-2 py-1 text-xs uppercase tracking-wide text-violet-200">
                    {performers.length}
                  </span>
                </div>

                <div className="mb-4">
                  <label htmlFor="performerSearch" className="mb-2 block text-sm text-slate-300">
                    Buscar cantor
                  </label>
                  <input
                    id="performerSearch"
                    value={performerSearchTerm}
                    onChange={(event) => setPerformerSearchTerm(event.target.value)}
                    placeholder="Digite o nome ou o tipo..."
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-3 text-white placeholder:text-slate-500 focus:border-violet-400 focus:outline-none"
                  />
                </div>

                <div className="space-y-3">
                  {filteredPerformers.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 p-4 text-sm text-slate-400">
                      Nenhum cantor encontrado.
                    </div>
                  ) : (
                    filteredPerformers.map((performer) => (
                      <div
                        key={performer.id}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-2.5"
                      >
                        <div>
                          <div className="font-medium text-white">{performer.name}</div>
                          <div className="text-xs text-slate-400">
                            {performer.type === "solo" ? "Carreira solo" : "Dupla"}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditPerformer(performer)}
                            className="rounded-xl border border-cyan-500/50 bg-cyan-500/10 px-2.5 py-1.5 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-500/20"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePerformer(performer.id)}
                            className="rounded-xl border border-rose-500/50 bg-rose-500/10 px-2.5 py-1.5 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/20"
                          >
                            Remover
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <form
                onSubmit={handleAddPerformer}
                className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-lg shadow-slate-950/40"
              >
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-white">Cadastrar usuário / cantor</h2>
                  <span className="rounded-full border border-violet-500/40 bg-violet-500/10 px-2 py-1 text-xs uppercase tracking-wide text-violet-200">
                    usuários
                  </span>
                </div>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="performerName" className="mb-2 block text-sm text-slate-300">
                      Nome do cantor ou dupla
                    </label>
                    <input
                      id="performerName"
                      value={performerName}
                      onChange={(event) => setPerformerName(event.target.value)}
                      placeholder="Ex.: Maria Silva"
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-3 text-white placeholder:text-slate-500 focus:border-violet-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="performerType" className="mb-2 block text-sm text-slate-300">
                      Tipo
                    </label>
                    <select
                      id="performerType"
                      value={performerType}
                      onChange={(event) => setPerformerType(event.target.value as PerformerType)}
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-3 text-white focus:border-violet-400 focus:outline-none"
                    >
                      <option value="solo">Carreira solo</option>
                      <option value="dupla">Dupla</option>
                    </select>
                  </div>

                  {editingPerformerId ? (
                    <div className="flex gap-3">
                      <button
                        type="submit"
                        className="flex-1 rounded-2xl bg-violet-500 px-4 py-3 font-semibold text-white transition hover:bg-violet-400"
                      >
                        Atualizar cantor
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPerformerId(null);
                          setPerformerName("");
                          setPerformerType("solo");
                        }}
                        className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 font-semibold text-slate-300 transition hover:border-slate-500"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      type="submit"
                      className="w-full rounded-2xl bg-violet-500 px-4 py-3 font-semibold text-white transition hover:bg-violet-400"
                    >
                      Salvar cantor
                    </button>
                  )}
                </div>
              </form>
            </section>

            <section className="space-y-6">
              <form
                onSubmit={handleAddCatalogSong}
                className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-lg shadow-slate-950/40"
              >
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-white">Cadastrar catálogo de vídeos</h2>
                  <span className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2 py-1 text-xs uppercase tracking-wide text-cyan-200">
                    catálogo
                  </span>
                </div>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="songTitle" className="mb-2 block text-sm text-slate-300">
                      Nome da música
                    </label>
                    <input
                      id="songTitle"
                      value={songTitle}
                      onChange={(event) => setSongTitle(event.target.value)}
                      placeholder="Ex.: Into Your Arms"
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-3 text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="songArtist" className="mb-2 block text-sm text-slate-300">
                      Artista / Banda
                    </label>
                    <input
                      id="songArtist"
                      value={songArtist}
                      onChange={(event) => setSongArtist(event.target.value)}
                      placeholder="Ex.: The Lemonheads"
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-3 text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="songGenre" className="mb-2 block text-sm text-slate-300">
                      Gênero
                    </label>
                    <select
                      id="songGenre"
                      value={songGenre}
                      onChange={(event) => setSongGenre(event.target.value as Genre)}
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-3 text-white focus:border-cyan-400 focus:outline-none"
                    >
                      {GENRES.map((genre) => (
                        <option key={genre} value={genre}>
                          {genre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="songUrl" className="mb-2 block text-sm text-slate-300">
                      Link do vídeo do YouTube
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="songUrl"
                        value={songUrl}
                        onChange={(event) => setSongUrl(event.target.value)}
                        placeholder="https://youtu.be/..."
                        className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-3 text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleSearchYoutubeInfo}
                        disabled={isSearchingVideo || !normalizeYoutubeUrl(songUrl)}
                        className="rounded-2xl border border-cyan-500/50 bg-cyan-500/10 px-4 py-3 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isSearchingVideo ? "Buscando..." : "Buscar"}
                      </button>
                    </div>
                    {videoSearchError ? (
                      <p className="mt-2 text-sm text-rose-300">{videoSearchError}</p>
                    ) : null}
                  </div>

                  <button
                    type="submit"
                    className="w-full rounded-2xl bg-cyan-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400"
                  >
                    Adicionar ao catálogo
                  </button>
                </div>
              </form>
            </section>
          </div>
        ) : showPlaybackScreen ? (
          <section className="space-y-6">
            {selectedSong ? (
              <div className="overflow-hidden rounded-[30px] border border-violet-500/20 bg-slate-900/90 p-4 shadow-[0_0_35px_rgba(124,58,237,0.16)] md:p-5">
                <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">Reprodução</p>
                    <h3 className="mt-2 text-2xl font-black text-white md:text-3xl">
                      {selectedSong.title}
                    </h3>
                    <p className="mt-1 text-sm text-slate-400">{selectedSong.artist}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPlaybackScreen(false);
                      setPlaybackStarted(false);
                      setPerformanceStatus("");
                      setVoiceAnalysis(null);
                      setRecordingStatus("Selecione uma música para iniciar");
                    }}
                    className="rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500"
                  >
                    Voltar à lista
                  </button>
                </div>

                <div className="overflow-hidden rounded-[30px] border border-violet-500/20 bg-black shadow-[0_0_45px_rgba(168,85,247,0.20)]">
                  <div className="relative mx-auto aspect-video w-full max-w-[1400px]">
                    {playbackStarted || videoCompleted ? (
                      <div id="karaoke-player" className="h-full w-full" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_center,_rgba(168,85,247,0.22),_rgba(15,23,42,0.9))] p-6 text-center">
                        <div>
                          <div className="mb-3 text-xs uppercase tracking-[0.25em] text-violet-200">
                            Pronto para começar
                          </div>
                          <div className="text-xl font-semibold text-white">
                            Selecione o cantor e clique em reproduzir
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-5 space-y-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <div>
                    <label htmlFor="performancePerformer" className="mb-2 block text-sm text-slate-300">
                      Selecionar cantor
                    </label>
                    <select
                      id="performancePerformer"
                      value={selectedPerformerId}
                      onChange={(event) => setSelectedPerformerId(event.target.value)}
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-3 text-white focus:border-violet-400 focus:outline-none"
                    >
                      <option value="">Selecione um cantor</option>
                      {performers.map((performer) => (
                        <option key={performer.id} value={performer.id}>
                          {performer.name} ({performer.type === "solo" ? "Solo" : "Dupla"})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                    <button
                      type="button"
                      onClick={() => {
                        if (playbackStarted) {
                          handleVoiceCapture(false);
                          setPlaybackStarted(false);
                          setPerformanceStatus("");
                          setVideoCompleted(false);
                          setVoiceAnalysis(null);
                          setRecordingStatus("Gravação interrompida. Selecione novamente para reiniciar");
                          return;
                        }

                        if (!selectedPerformerId) {
                          setRecordingStatus("Antes de iniciar, confirme o cantor selecionado no modal.");
                          setShowStartConfirmation(true);
                          return;
                        }

                        setShowStartConfirmation(true);
                      }}
                      disabled={!selectedSongId}
                      className={`rounded-2xl border px-4 py-3 font-semibold transition ${
                        playbackStarted
                          ? "border-rose-400 bg-rose-500/20 text-rose-100"
                          : "border-cyan-400/70 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                      }`}
                    >
                      {playbackStarted ? "Parar gravação" : "Play e gravar"}
                    </button>

                    <button
                      type="button"
                      onClick={handleFinalizePerformance}
                      disabled={!selectedPerformerId || !videoCompleted}
                      className="rounded-2xl bg-emerald-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                    >
                      Finalizar
                    </button>
                  </div>

                  <div className="rounded-2xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-300">
                    {recordingStatus}
                  </div>

                  {performanceStatus && (
                    <div className="animate-[pulse_1.2s_ease-in-out_1] rounded-2xl border border-emerald-400/60 bg-gradient-to-r from-emerald-500/20 via-emerald-400/15 to-green-500/10 px-4 py-3 shadow-[0_0_25px_rgba(16,185,129,0.35)]">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-300/80 bg-emerald-500/20 text-xl font-black text-emerald-200 shadow-[0_0_18px_rgba(52,211,153,0.6)]">
                          ✓
                        </div>
                        <div className="text-sm font-semibold text-emerald-100">{performanceStatus}</div>
                      </div>
                    </div>
                  )}

                  {voiceAnalysis && (
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      {[
                        { label: "Afinação", value: `${voiceAnalysis.pitch}/10` },
                        { label: "Timing", value: `${voiceAnalysis.timing}/10` },
                        { label: "Estabilidade", value: `${voiceAnalysis.stability}/10` },
                        { label: "Clareza", value: `${voiceAnalysis.clarity}/10` },
                      ].map((metric) => (
                        <div key={metric.label} className="rounded-2xl border border-violet-500/25 bg-violet-500/10 p-3 text-center">
                          <div className="text-[10px] uppercase tracking-[0.18em] text-violet-200">{metric.label}</div>
                          <div className="mt-2 text-xl font-bold text-white">{metric.value}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {lastScore !== null && (
                    <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">
                      Avaliação atribuída: <strong className="text-lg text-white">{lastScore.toFixed(1)}</strong> / 10
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-[30px] border border-dashed border-slate-700 bg-slate-900/80 p-6 text-center text-slate-300">
                Nenhuma música selecionada.
              </div>
            )}
          </section>
        ) : (
          <section className="space-y-6">
              <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
              <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white">Selecione uma música</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    {filteredCatalog.length} músicas encontradas para {selectedGenre}
                  </p>
                </div>
              </div>

              <div className="mb-5 space-y-4">
                <div>
                  <label htmlFor="songSearch" className="mb-2 block text-sm text-slate-300">
                    Buscar música ou artista
                  </label>
                  <input
                    id="songSearch"
                    value={songSearchTerm}
                    onChange={(event) => setSongSearchTerm(event.target.value)}
                    placeholder="Digite o título, artista ou gênero..."
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-3 text-white placeholder:text-slate-500 focus:border-violet-400 focus:outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <div className="mb-1 text-sm text-slate-300">Ordenar por</div>
                  <div className="flex flex-wrap gap-2">
                    {(["usadas", "recentes", "alfabetica", "favoritas"] as const).map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setSortBy(item)}
                        className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide transition ${
                          sortBy === item
                            ? "border-violet-400 bg-violet-500 text-white shadow-lg shadow-violet-500/20"
                            : "border-slate-700 bg-slate-950 text-slate-300 hover:border-violet-500/50"
                        }`}
                      >
                        {item === "usadas" && "Mais usadas"}
                        {item === "recentes" && "Mais recentes"}
                        {item === "alfabetica" && "A-Z"}
                        {item === "favoritas" && "Favoritas"}
                      </button>
                    ))}
                  </div>
                </div>

              </div>

              <div className="mb-5 flex flex-wrap gap-3">
                {GENRES.map((genre) => (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => {
                      setSelectedGenre(genre);
                      const firstSong = catalogSongs.find((song) => song.genre === genre);
                      setSelectedSongId(firstSong ? firstSong.id : "");
                    }}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                      selectedGenre === genre
                        ? "border-violet-400 bg-violet-500 text-white shadow-lg shadow-violet-500/20"
                        : "border-slate-700 bg-slate-950 text-slate-300 hover:border-violet-500/60"
                    }`}
                  >
                    {genre}
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                {filteredCatalog.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 p-5 text-sm text-slate-400">
                    Nenhuma música foi encontrada com esses filtros.
                  </div>
                ) : (
                  filteredCatalog.map((song) => (
                    <div
                      key={song.id}
                      className={`rounded-2xl border p-3 transition ${
                        selectedSongId === song.id
                          ? "border-violet-400 bg-violet-500/10"
                          : "border-slate-800 bg-slate-950"
                      }`}
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <button
                          type="button"
                          onClick={() => setSelectedSongId(song.id)}
                          className="flex min-w-0 flex-1 items-center gap-3 text-left"
                        >
                          <img
                            src={`https://img.youtube.com/vi/${youtubeVideoId(song.youtubeUrl)}/hqdefault.jpg`}
                            alt={song.title}
                            className="h-16 w-24 rounded-xl object-cover"
                          />
                          <div className="min-w-0">
                            <div className="truncate text-base font-semibold text-white">{song.title}</div>
                            <div className="mt-1 truncate text-sm text-slate-400">{song.artist}</div>
                          </div>
                        </button>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setFavoriteSongIds((current) =>
                                current.includes(song.id)
                                  ? current.filter((id) => id !== song.id)
                                  : [...current, song.id],
                              );
                            }}
                            className={`rounded-full p-1.5 ${
                              song.isFavorite ? "bg-rose-500 text-white" : "bg-slate-800 text-slate-200"
                            }`}
                            aria-label={song.isFavorite ? "Remover favorito" : "Adicionar favorito"}
                          >
                            {song.isFavorite ? "♥" : "♡"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSongId(song.id);
                              setShowPlaybackScreen(true);
                            }}
                            className="rounded-2xl bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
                          >
                            Dar o play
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
