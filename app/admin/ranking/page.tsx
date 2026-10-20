"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type LeaderboardItem = {
  performer: { id: string; name: string; type: string };
  total: number;
  count: number;
  average: number;
};

export default function AdminRankingPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);

  const loadRanking = async () => {
    const response = await fetch("/api/leaderboard");
    if (!response.ok) return;
    const data = (await response.json()) as LeaderboardItem[];
    setLeaderboard(data);
  };

  useEffect(() => {
    loadRanking();
  }, []);

  const handleReset = async () => {
    const response = await fetch("/api/performances?all=true", {
      method: "DELETE",
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      alert(data.error ?? "Não foi possível zerar os rankings.");
      return;
    }

    await loadRanking();
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/admin" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-rose-300/50 bg-gradient-to-br from-rose-200 via-pink-400 to-rose-600 text-xl text-slate-950 shadow-[0_0_20px_rgba(251,113,133,0.35)]">
              ♪
            </div>
            <div>
              <div className="text-[9px] uppercase tracking-[0.26em] text-rose-100">Admin</div>
              <div className="text-lg font-black uppercase tracking-[0.14em]">Ranking</div>
            </div>
          </Link>

          <Link href="/admin" className="rounded-full border border-white/10 bg-slate-900 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:border-rose-300/50 hover:text-white">
            Painel
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.28em] text-rose-200">Gestão</div>
            <h1 className="mt-2 text-3xl font-black text-white">Zerar rankings</h1>
          </div>

          <button type="button" onClick={handleReset} className="rounded-2xl border border-rose-500/60 bg-rose-500/10 px-4 py-3 text-sm font-bold uppercase tracking-[0.12em] text-rose-100 transition hover:bg-rose-500/20">
            Zerar rankings
          </button>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-slate-900/80 p-5">
          <div className="mb-4 text-[10px] uppercase tracking-[0.26em] text-slate-400">Ranking atual</div>

          {leaderboard.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/60 p-4 text-slate-400">
              Nenhuma avaliação registrada.
            </div>
          ) : (
            <div className="space-y-3">
              {leaderboard.map((entry, index) => (
                <div key={entry.performer.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full border border-rose-300/40 bg-rose-500/10 text-sm font-bold text-rose-100">
                      #{index + 1}
                    </div>
                    <div>
                      <div className="font-semibold text-white">{entry.performer.name}</div>
                      <div className="text-xs text-slate-400">{entry.performer.type === "solo" ? "Solo" : "Dupla"}</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-lg font-black text-white">{entry.total.toFixed(1)}</div>
                    <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Média {entry.average.toFixed(1)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
