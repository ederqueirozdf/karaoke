"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";

import { analyzeVoiceFromAudioBuffer, buildFinalScore, type VoiceAnalysis } from "../../lib/audio-scoring";
import { deleteVideoForSong, getVideoForSong, saveVideoForSong } from "../../lib/video-storage";

type CatalogSong = {
  id: string;
  title: string;
  artist: string;
  genre: string;
  youtubeUrl: string;
  bpm: number;
  difficulty: string;
};

type Performer = {
  id: string;
  name: string;
  type: "solo" | "dupla";
};

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

function youtubeVideoId(url: string) {
  if (!url) return "";

  const normalized = normalizeYoutubeUrl(url);
  if (!normalized) return "";

  try {
    const parsed = new URL(normalized);
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

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function generateAutomaticScore(song: CatalogSong, performer: Performer) {
  const difficultyWeight = song.difficulty === "fácil" ? 0.9 : song.difficulty === "médio" ? 1.4 : 1.9;
  const rhythmMatch = 1 - Math.abs(song.bpm - 110) / 130;
  const performerBonus = performer.type === "dupla" ? 0.55 : 0.3;
  const randomStability = 0.85 + Math.random() * 1.75;

  const score = (rhythmMatch * 5 + difficultyWeight * 2 + performerBonus + randomStability) * 1.35;

  return Number(clamp(score, 4.5, 10).toFixed(1));
}

export default function KaraokeEmbedPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 text-white">Carregando...</div>}>
      <KaraokeEmbedContent />
    </Suspense>
  );
}

function KaraokeEmbedContent() {
  const searchParams = useSearchParams();
  const [songs, setSongs] = useState<CatalogSong[]>([]);
  const [performers, setPerformers] = useState<Performer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPerformer, setSelectedPerformer] = useState("");
  const [voiceAnalysis, setVoiceAnalysis] = useState<VoiceAnalysis | null>(null);
  const [recordingStatus, setRecordingStatus] = useState("Selecione o cantor e a música para iniciar");
  const [performanceStatus, setPerformanceStatus] = useState("");
  const [playbackStarted, setPlaybackStarted] = useState(false);
  const [videoCompleted, setVideoCompleted] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [lastScore, setLastScore] = useState<number | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showFinalScoreModal, setShowFinalScoreModal] = useState(false);
  const [isCalculatingScore, setIsCalculatingScore] = useState(false);
  const [scoreRevealValue, setScoreRevealValue] = useState<number | null>(null);
  const [localVideoUrl, setLocalVideoUrl] = useState<string | null>(null);
  const [localVideoName, setLocalVideoName] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const youtubePlayerRef = useRef<any>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const localVideoInputRef = useRef<HTMLInputElement | null>(null);
  const playerReadyRef = useRef(false);
  const pendingPlayRef = useRef(false);
  const progressTimerRef = useRef<number | null>(null);
  const autoFinalizeTriggeredRef = useRef(false);

  const songId = searchParams.get("song") ?? "";

  useEffect(() => {
    const load = async () => {
      try {
        const [songsRes, performersRes] = await Promise.all([
          fetch("/api/catalog"),
          fetch("/api/performers"),
        ]);

        if (!songsRes.ok || !performersRes.ok) {
          throw new Error("Falha ao carregar dados");
        }

        const [songsData, performersData] = await Promise.all([
          songsRes.json() as Promise<CatalogSong[]>,
          performersRes.json() as Promise<Performer[]>,
        ]);

        setSongs(songsData);
        setPerformers(performersData);
      } catch {
        setSongs([]);
        setPerformers([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const selectedSong = useMemo(
    () => songs.find((song) => song.id === songId) ?? null,
    [songId, songs],
  );

  const videoId = selectedSong ? youtubeVideoId(selectedSong.youtubeUrl) : "";
  const hasEnoughProgress = videoProgress >= 90 || videoCompleted;

  useEffect(() => {
    if (!selectedSong) {
      setLocalVideoUrl(null);
      setLocalVideoName("");
      return;
    }

    let revoked = false;

    const loadLocalVideo = async () => {
      const savedVideo = await getVideoForSong(selectedSong.title, selectedSong.artist);
      if (!savedVideo) {
        if (!revoked) {
          setLocalVideoUrl(null);
          setLocalVideoName("");
        }
        return;
      }

      if (!revoked) {
        setLocalVideoUrl(savedVideo.url);
        setLocalVideoName(savedVideo.name);
      }
    };

    void loadLocalVideo();

    return () => {
      revoked = true;
    };
  }, [selectedSong]);

  useEffect(() => {
    return () => {
      if (progressTimerRef.current) {
        window.clearInterval(progressTimerRef.current);
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }

      if (youtubePlayerRef.current) {
        try {
          youtubePlayerRef.current.stopVideo?.();
          youtubePlayerRef.current.destroy?.();
        } catch {
          // ignored
        }
      }
    };
  }, []);

  useEffect(() => {
    if (!selectedSong || !videoId) {
      if (youtubePlayerRef.current) {
        try {
          youtubePlayerRef.current.stopVideo?.();
          youtubePlayerRef.current.destroy?.();
        } catch {
          // ignored
        }
        youtubePlayerRef.current = null;
      }
      playerReadyRef.current = false;
      pendingPlayRef.current = false;
      return;
    }

    playerReadyRef.current = false;
    pendingPlayRef.current = false;

    const initializeYoutubePlayer = () => {
      if (youtubePlayerRef.current) {
        try {
          youtubePlayerRef.current.destroy?.();
        } catch {
          // ignored
        }
        youtubePlayerRef.current = null;
      }

      playerReadyRef.current = false;

      const player = new (window as any).YT.Player("karaoke-player", {
        videoId,
        playerVars: {
          autoplay: 0,
          mute: 1,
          rel: 0,
          playsinline: 1,
          controls: 1,
        },
        events: {
          onReady: () => {
            playerReadyRef.current = true;
            setRecordingStatus("Vídeo pronto. Selecione o cantor e pressione play para gravar.");

            if (pendingPlayRef.current) {
              startYoutubePlayback();
            }
          },
          onStateChange: (event: any) => {
            if (event.data === (window as any).YT.PlayerState.PLAYING) {
              setPlaybackStarted(true);
              setRecordingStatus("Gravando... acompanhe a performance e finalize quando o vídeo atingir 90%.");
            }

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
        window.setTimeout(waitForApi, 250);
      };

      waitForApi();
      return;
    }

    initializeYoutubePlayer();
  }, [selectedSong, videoId]);

  useEffect(() => {
    if (!playbackStarted) {
      if (progressTimerRef.current) {
        window.clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
      return;
    }

    progressTimerRef.current = window.setInterval(() => {
      if (localVideoUrl && localVideoRef.current) {
        const video = localVideoRef.current;
        const total = Number.isFinite(video.duration) ? video.duration : 0;
        const current = Number.isFinite(video.currentTime) ? video.currentTime : 0;

        if (total > 0) {
          const percent = clamp((current / total) * 100, 0, 100);
          setVideoProgress(percent);

          if (percent >= 99.5) {
            setVideoProgress(100);
            window.clearInterval(progressTimerRef.current ?? undefined);
            progressTimerRef.current = null;
            void handleVideoFinished();
          }
        }
        return;
      }

      const player = youtubePlayerRef.current;
      if (!player) return;

      const total = Number(player.getDuration?.() ?? 0);
      const current = Number(player.getCurrentTime?.() ?? 0);

      if (total > 0) {
        const percent = clamp((current / total) * 100, 0, 100);
        setVideoProgress(percent);

        if (percent >= 99.5) {
          setVideoProgress(100);
          window.clearInterval(progressTimerRef.current ?? undefined);
          progressTimerRef.current = null;
          void handleVideoFinished();
        }
      }
    }, 400);

    return () => {
      if (progressTimerRef.current) {
        window.clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
    };
  }, [playbackStarted, localVideoUrl]);

  const handleVoiceCapture = async (shouldStart: boolean) => {
    if (!shouldStart) {
      mediaRecorderRef.current?.stop();
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

          if (nextAnalysis.silence) {
            setRecordingStatus("Silêncio detectado — sem presença vocal suficiente.");
          } else {
            setRecordingStatus(`Voz capturada · ${nextAnalysis.duration}s`);
          }

          await audioContext.close();
        } catch {
          setRecordingStatus("Não foi possível analisar a gravação");
        }
      };

      recorder.start();
      setVoiceAnalysis(null);
      setRecordingStatus("Gravando voz do cantor...");
    } catch {
      setRecordingStatus("Permita o acesso ao microfone para avaliar a voz");
    }
  };

  const handleLocalVideoSelection = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedSong) {
      event.target.value = "";
      return;
    }

    await saveVideoForSong(selectedSong.title, selectedSong.artist, file);
    const savedVideo = await getVideoForSong(selectedSong.title, selectedSong.artist);

    setLocalVideoUrl(savedVideo?.url ?? null);
    setLocalVideoName(savedVideo?.name ?? file.name);
    setRecordingStatus(`Vídeo local carregado: ${file.name}. Clique em Play e gravar para começar.`);
    event.target.value = "";
  };

  const handleVideoFinished = async () => {
    if (localVideoRef.current) {
      localVideoRef.current.pause();
    }

    setVideoCompleted(true);
    setPlaybackStarted(false);
    setVideoProgress(100);
    setPerformanceStatus("Vídeo finalizado. Calculando nota final...");
    setRecordingStatus("Vídeo finalizado. Calculando nota final...");
    autoFinalizeTriggeredRef.current = false;
    await handleVoiceCapture(false);
  };

  useEffect(() => {
    if (!videoCompleted || !voiceAnalysis || autoFinalizeTriggeredRef.current) {
      return;
    }

    autoFinalizeTriggeredRef.current = true;
    void handleFinalizePerformance(true);
  }, [videoCompleted, voiceAnalysis]);

  const startYoutubePlayback = () => {
    const player = youtubePlayerRef.current;

    if (!player || typeof player.playVideo !== "function") {
      pendingPlayRef.current = true;
      setRecordingStatus("Vídeo carregando. Aguarde um instante para iniciar a gravação.");
      return false;
    }

    if (!playerReadyRef.current) {
      pendingPlayRef.current = true;
      setRecordingStatus("Vídeo carregando. Aguarde um instante para iniciar a gravação.");
      return false;
    }

    try {
      if (typeof player.getPlayerState === "function") {
        const currentState = player.getPlayerState();
        if (currentState === (window as any).YT.PlayerState.ENDED) {
          player.seekTo?.(0, true);
        }
      }

      player.playVideo();
      player.unMute?.();
      pendingPlayRef.current = false;
      setPlaybackStarted(true);
      setVideoProgress(0);
      setRecordingStatus("Gravando... acompanhe a performance e finalize quando o vídeo atingir 90%.");
      return true;
    } catch {
      pendingPlayRef.current = true;
      setRecordingStatus("Não foi possível iniciar a reprodução do vídeo.");
      return false;
    }
  };

  const startLocalPlayback = async () => {
    const video = localVideoRef.current;
    if (!video || !localVideoUrl) {
      setRecordingStatus("Selecione um vídeo local antes de iniciar a avaliação.");
      return false;
    }

    try {
      video.currentTime = 0;
      await video.play();
      pendingPlayRef.current = false;
      setPlaybackStarted(true);
      setVideoProgress(0);
      setRecordingStatus("Gravando... acompanhe a performance e finalize quando o vídeo atingir 90%.");
      return true;
    } catch {
      setRecordingStatus("Não foi possível iniciar a reprodução do vídeo local.");
      return false;
    }
  };

  const handleStartPerformance = async () => {
    if (!selectedPerformer || !selectedSong) {
      setRecordingStatus("Selecione o cantor e a música antes de iniciar");
      return;
    }

    setVideoCompleted(false);
    setVideoProgress(0);
    setPerformanceStatus("");
    setLastScore(null);
    setScoreRevealValue(null);
    setShowFinalScoreModal(false);
    setVoiceAnalysis(null);
    autoFinalizeTriggeredRef.current = false;
    setRecordingStatus("Preparando vídeo e gravação...");

    pendingPlayRef.current = true;

    if (localVideoUrl && localVideoRef.current) {
      await startLocalPlayback();
    } else if (playerReadyRef.current && youtubePlayerRef.current) {
      startYoutubePlayback();
    } else {
      setRecordingStatus("Vídeo carregando. Aguarde um instante para iniciar a gravação e clique novamente quando o player estiver pronto.");
    }

    await handleVoiceCapture(true);
  };

  const handleFinalizePerformance = async (autoTriggered = false) => {
    if (!selectedPerformer || !selectedSong) {
      return;
    }

    if (!autoTriggered && !hasEnoughProgress) {
      setRecordingStatus("A avaliação só pode ser finalizada quando o vídeo ultrapassar 90% de reprodução.");
      return;
    }

    if (!voiceAnalysis || voiceAnalysis.silence) {
      setRecordingStatus("Silêncio detectado — sem presença vocal suficiente.");
      return;
    }

    const performer = performers.find((item) => item.id === selectedPerformer);
    if (!performer) {
      return;
    }

    setIsCalculatingScore(true);
    setShowFinalScoreModal(true);
    setScoreRevealValue(null);
    setPerformanceStatus(autoTriggered ? "Calculando nota final..." : "Calculando nota final...");

    const baseScore = generateAutomaticScore(selectedSong, performer);
    const score = buildFinalScore(baseScore, voiceAnalysis);

    try {
      await new Promise((resolve) => window.setTimeout(resolve, 1600));

      const response = await fetch("/api/performances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          performerId: performer.id,
          catalogId: selectedSong.id,
          title: selectedSong.title,
          genre: selectedSong.genre,
          youtubeUrl: selectedSong.youtubeUrl,
          note: score,
        }),
      });

      if (!response.ok) {
        throw new Error("Não foi possível salvar a avaliação");
      }

      setLastScore(score);
      setScoreRevealValue(score);
      setPerformanceStatus("Avaliação concluída — nota registrada");
      setRecordingStatus("Avaliação concluída — nota registrada");
    } catch {
      setRecordingStatus("Não foi possível finalizar a avaliação");
    } finally {
      setIsCalculatingScore(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-300/50 bg-gradient-to-br from-amber-200 via-yellow-400 to-amber-600 text-xl text-slate-950 shadow-[0_0_20px_rgba(251,191,36,0.35)]">
              ♪
            </div>
            <div>
              <div className="text-[9px] uppercase tracking-[0.26em] text-amber-100">Karaoke</div>
              <div className="text-lg font-black uppercase tracking-[0.14em]">Avaliação</div>
            </div>
          </Link>

          <Link
            href="/catalogo"
            className="rounded-full border border-white/10 bg-slate-900 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:border-amber-300/50 hover:text-white"
          >
            Voltar ao catálogo
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8">
        {loading ? (
          <div className="rounded-[24px] border border-white/10 bg-slate-900/80 p-6 text-slate-300">
            Carregando música e avaliação...
          </div>
        ) : !selectedSong ? (
          <div className="rounded-[24px] border border-dashed border-slate-700 bg-slate-900/80 p-6 text-center text-slate-300">
            Nenhuma música selecionada. Volte ao catálogo e escolha uma faixa.
          </div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-[28px] border border-white/10 bg-slate-900/80 p-4 shadow-[0_20px_40px_rgba(15,23,42,0.3)]">
              <div className="mb-3 text-[10px] uppercase tracking-[0.3em] text-amber-200">Música selecionada</div>
              <h1 className="text-3xl font-black text-white">{selectedSong.title}</h1>
              <p className="mt-2 text-slate-300">{selectedSong.artist}</p>
            </div>

            {localVideoUrl ? (
              <div className="overflow-hidden rounded-[32px] border border-violet-300/20 bg-slate-950 p-2 shadow-[0_0_40px_rgba(167,139,250,0.15)]">
                <div className="aspect-video w-full overflow-hidden rounded-[24px] bg-slate-900">
                  <video
                    ref={localVideoRef}
                    src={localVideoUrl}
                    controls
                    playsInline
                    muted
                    className="h-full w-full object-cover"
                    onEnded={() => void handleVideoFinished()}
                  />
                </div>
              </div>
            ) : videoId ? (
              <div className="overflow-hidden rounded-[32px] border border-amber-300/20 bg-slate-950 p-2 shadow-[0_0_40px_rgba(251,191,36,0.12)]">
                <div className="aspect-video w-full overflow-hidden rounded-[24px]">
                  <div id="karaoke-player" className="h-full w-full" />
                </div>
              </div>
            ) : (
              <div className="rounded-[24px] border border-dashed border-slate-700 bg-slate-900/80 p-6 text-slate-300">
                Link do YouTube inválido para esta música.
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-[24px] border border-white/10 bg-slate-900/80 p-3">
              <label className="cursor-pointer rounded-2xl border border-violet-500/50 bg-violet-500/10 px-4 py-2 text-sm font-semibold text-violet-100 transition hover:bg-violet-500/20">
                <input ref={localVideoInputRef} type="file" accept="video/*" className="hidden" onChange={handleLocalVideoSelection} />
                {localVideoName ? "Trocar vídeo local" : "Selecionar vídeo local"}
              </label>

              {localVideoUrl ? (
                <button
                  type="button"
                  onClick={async () => {
                    if (!selectedSong) return;
                    await deleteVideoForSong(selectedSong.title, selectedSong.artist);
                    setLocalVideoUrl(null);
                    setLocalVideoName("");
                    setRecordingStatus("Vídeo local removido. O YouTube será usado novamente quando houver internet.");
                  }}
                  className="rounded-2xl border border-rose-500/50 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/20"
                >
                  Remover vídeo local
                </button>
              ) : null}

              {localVideoName ? <span className="text-sm text-emerald-300">{localVideoName}</span> : null}
            </div>

            <div className="rounded-[28px] border border-white/10 bg-slate-900/80 p-5">
              <label htmlFor="performer-select" className="mb-2 block text-sm text-slate-300">
                Selecionar cantor
              </label>
              <select
                id="performer-select"
                value={selectedPerformer}
                onChange={(event) => setSelectedPerformer(event.target.value)}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-3 text-white focus:border-amber-400 focus:outline-none"
              >
                <option value="">Selecione um cantor</option>
                {performers.map((performer) => (
                  <option key={performer.id} value={performer.id}>
                    {performer.name} ({performer.type === "solo" ? "Solo" : "Dupla"})
                  </option>
                ))}
              </select>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (playbackStarted) {
                      void handleVoiceCapture(false);
                      setPlaybackStarted(false);
                      setVideoCompleted(false);
                      setVideoProgress(0);
                      setPerformanceStatus("");
                      setRecordingStatus("Gravação interrompida. Selecione novamente para reiniciar");
                      return;
                    }

                    if (!selectedPerformer) {
                      setShowConfirm(true);
                      return;
                    }

                    if (!playerReadyRef.current) {
                      setRecordingStatus("Vídeo carregando. Aguarde o player ficar pronto antes de iniciar a gravação.");
                      return;
                    }

                    setShowConfirm(true);
                  }}
                  disabled={!selectedSong || !playerReadyRef.current}
                  className="rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-bold uppercase tracking-[0.12em] text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {playbackStarted ? "Parar gravação" : !playerReadyRef.current ? "Carregando vídeo..." : "Play e gravar"}
                </button>

                <button
                  type="button"
                  onClick={() => void handleFinalizePerformance(false)}
                  disabled={!selectedPerformer || !hasEnoughProgress}
                  className="rounded-2xl border border-emerald-500/60 bg-emerald-500/10 px-4 py-3 text-sm font-bold uppercase tracking-[0.12em] text-emerald-100 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Finalizar
                </button>

                <Link
                  href="/catalogo"
                  className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm font-bold uppercase tracking-[0.12em] text-slate-200 transition hover:border-white/20"
                >
                  Escolher outra música
                </Link>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-300">
                {recordingStatus}
              </div>

              {performanceStatus ? (
                <div className="mt-4 animate-[pulse_1.2s_ease-in-out_1] rounded-2xl border border-emerald-400/60 bg-gradient-to-r from-emerald-500/20 via-emerald-400/15 to-green-500/10 px-4 py-3 shadow-[0_0_25px_rgba(16,185,129,0.35)]">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-300/80 bg-emerald-500/20 text-xl font-black text-emerald-200 shadow-[0_0_18px_rgba(52,211,153,0.6)]">
                      ✓
                    </div>
                    <div className="text-sm font-semibold text-emerald-100">{performanceStatus}</div>
                  </div>
                </div>
              ) : null}

              <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/40 p-3">
                <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.22em] text-slate-400">
                  <span>Progresso</span>
                  <span>{Math.round(videoProgress)}%</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 via-emerald-400 to-cyan-400 transition-all duration-300"
                    style={{ width: `${Math.min(videoProgress, 100)}%` }}
                  />
                </div>
              </div>

              {voiceAnalysis ? (
                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
              ) : null}

              {lastScore !== null ? (
                <div className="mt-5 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">
                  Avaliação atribuída: <strong className="text-lg text-white">{lastScore.toFixed(1)}</strong> / 10
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {showConfirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[28px] border border-violet-500/20 bg-slate-900 p-6 shadow-[0_0_50px_rgba(124,58,237,0.25)]">
            <div className="mb-4 text-xs uppercase tracking-[0.26em] text-violet-200">Confirmação antes do início</div>
            <h3 className="text-2xl font-bold text-white">Selecione o cantor</h3>
            <p className="mt-3 text-sm text-slate-300">
              {selectedPerformer
                ? `O cantor selecionado é ${performers.find((item) => item.id === selectedPerformer)?.name ?? "não identificado"}.`
                : "Nenhum cantor foi selecionado ainda."}
            </p>
            <p className="mt-2 text-sm text-slate-400">
              Confirme o nome antes de iniciar o vídeo e a gravação da voz.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-slate-500"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowConfirm(false);
                  if (!selectedPerformer) {
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
      ) : null}

      {showFinalScoreModal ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
          <div className="relative w-full max-w-md overflow-hidden rounded-[30px] border border-emerald-400/30 bg-slate-900/95 p-6 shadow-[0_0_60px_rgba(16,185,129,0.2)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_42%)]" />
            <div className="relative">
              <div className="mb-3 text-center text-[10px] uppercase tracking-[0.32em] text-emerald-200">
                Resultado final
              </div>

              {isCalculatingScore ? (
                <div className="space-y-5 py-4 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-500/10 shadow-[0_0_24px_rgba(16,185,129,0.35)]">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-500" />
                  </div>
                  <div>
                    <div className="text-2xl font-black text-white">Calculando nota</div>
                    <div className="mt-2 text-sm text-slate-300">Afinação, timing, clareza e estabilidade em análise...</div>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[0, 1, 2, 3].map((item) => (
                      <div
                        key={item}
                        className="h-10 animate-pulse rounded-full bg-gradient-to-b from-emerald-400/60 to-emerald-500/10"
                        style={{ animationDelay: `${item * 120}ms` }}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-5 text-center">
                  <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border border-emerald-300/60 bg-gradient-to-br from-emerald-500/20 to-green-500/10 text-3xl font-black text-emerald-100 shadow-[0_0_32px_rgba(52,211,153,0.35)]">
                    {scoreRevealValue !== null ? scoreRevealValue.toFixed(1) : "0.0"}
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.32em] text-emerald-200">Nota final</div>
                    <div className="mt-2 text-4xl font-black text-white">{scoreRevealValue !== null ? scoreRevealValue.toFixed(1) : "0.0"}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowFinalScoreModal(false)}
                    className="w-full rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-bold uppercase tracking-[0.14em] text-slate-950 transition hover:bg-emerald-400"
                  >
                    Fechar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
