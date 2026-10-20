"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Performer = {
  id: string;
  name: string;
  type: "solo" | "dupla";
};

export default function CantoresPage() {
  const [performers, setPerformers] = useState<Performer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/performers");
        if (!response.ok) {
          throw new Error("Falha ao carregar cantores");
        }
        const data = (await response.json()) as Performer[];
        setPerformers(data);
      } catch {
        setPerformers([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-300/50 bg-gradient-to-br from-emerald-200 via-green-400 to-emerald-600 text-xl text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.35)]">
              ♪
            </div>
            <div>
              <div className="text-[9px] uppercase tracking-[0.26em] text-emerald-100">Karaoke</div>
              <div className="text-lg font-black uppercase tracking-[0.14em]">Cantores</div>
            </div>
          </Link>

          <Link
            href="/"
            className="rounded-full border border-white/10 bg-slate-900 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:border-emerald-300/50 hover:text-white"
          >
            Início
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6">
          <div className="text-[10px] uppercase tracking-[0.28em] text-emerald-200">Cantores</div>
          <h1 className="mt-2 text-3xl font-black text-white">Lista de cantores</h1>
        </div>

        {loading ? (
          <div className="rounded-[24px] border border-white/10 bg-slate-900/80 p-6 text-slate-300">
            Carregando cantores...
          </div>
        ) : performers.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-slate-700 bg-slate-900/80 p-6 text-slate-300">
            Nenhum cantor cadastrado até o momento.
          </div>
        ) : (
          <div className="space-y-3">
            {performers.map((performer, index) => (
              <div key={performer.id} className="flex items-center justify-between rounded-[24px] border border-white/10 bg-slate-900/80 px-4 py-3 shadow-[0_16px_28px_rgba(15,23,42,0.24)]">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-300/40 bg-emerald-500/10 text-sm font-bold text-emerald-100">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-semibold text-white">{performer.name}</div>
                    <div className="text-xs text-slate-400">{performer.type === "solo" ? "Solo" : "Dupla"}</div>
                  </div>
                </div>
                <div className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-emerald-100">
                  Ativo
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
