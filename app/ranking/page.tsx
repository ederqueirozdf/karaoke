"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Performer = {
  id: string;
  name: string;
  type: "solo" | "dupla";
};

type RankingItem = {
  performer: Performer;
  total: number;
  count: number;
  average: number;
};

export default function RankingPage() {
  const [leaderboard, setLeaderboard] = useState<RankingItem[]>([]);
  const [view, setView] = useState<"day" | "overall">("day");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/leaderboard");
        if (!response.ok) {
          throw new Error("Falha ao carregar leaderboard");
        }
        const data = (await response.json()) as RankingItem[];
        setLeaderboard(data);
      } catch {
        setLeaderboard([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const visibleRanking = useMemo(() => {
    if (!leaderboard.length) {
      return [];
    }

    return [...leaderboard]
      .sort((a, b) => b.average - a.average || b.total - a.total)
      .map((item, index) => ({ ...item, rank: index + 1 }));
  }, [leaderboard]);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-300/50 bg-gradient-to-br from-amber-200 via-yellow-400 to-amber-600 text-xl text-slate-950 shadow-[0_0_20px_rgba(251,191,36,0.35)]">
              ♪
            </div>
            <div>
              <div className="text-[9px] uppercase tracking-[0.26em] text-amber-100">Primos</div>
              <div className="text-lg font-black uppercase tracking-[0.14em]">Ranking</div>
            </div>
          </Link>

          <Link
            href="/"
            className="rounded-full border border-white/10 bg-slate-900 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:border-amber-300/50 hover:text-white"
          >
            Início
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.28em] text-amber-200">Ranking</div>
            <h1 className="mt-2 text-3xl font-black text-white">
              {view === "day" ? "Ranking do Dia" : "Ranking Geral"}
            </h1>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setView("day")}
              className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                view === "day"
                  ? "border-amber-300 bg-amber-400 text-slate-950"
                  : "border-white/10 bg-slate-900 text-slate-300"
              }`}
            >
              Dia
            </button>
            <button
              type="button"
              onClick={() => setView("overall")}
              className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                view === "overall"
                  ? "border-violet-300 bg-violet-400 text-slate-950"
                  : "border-white/10 bg-slate-900 text-slate-300"
              }`}
            >
              Geral
            </button>
          </div>
        </div>

        {loading ? (
          <div className="rounded-[24px] border border-white/10 bg-slate-900/80 p-6 text-slate-300">
            Carregando rankings...
          </div>
        ) : visibleRanking.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-slate-700 bg-slate-900/80 p-6 text-slate-300">
            Nenhuma avaliação registrada até o momento.
          </div>
        ) : (
          <div className="space-y-3">
            {visibleRanking.map((entry) => (
              <div
                key={entry.performer.id}
                className="flex items-center justify-between rounded-[24px] border border-white/10 bg-slate-900/80 px-4 py-3 shadow-[0_18px_30px_rgba(15,23,42,0.28)]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-amber-300/40 bg-amber-500/10 text-sm font-bold text-amber-100">
                    #{entry.rank}
                  </div>
                  <div>
                    <div className="font-semibold text-white">{entry.performer.name}</div>
                    <div className="text-xs text-slate-400">{entry.performer.type === "solo" ? "Solo" : "Dupla"}</div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xl font-black text-white">{entry.total.toFixed(1)}</div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                    Média {entry.average.toFixed(1)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
