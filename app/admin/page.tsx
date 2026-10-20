"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type AdminSummary = {
  performers: number;
  catalog: number;
  performances: number;
};

export default function AdminPage() {
  const [summary, setSummary] = useState<AdminSummary>({ performers: 0, catalog: 0, performances: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [performersRes, catalogRes, performancesRes] = await Promise.all([
          fetch("/api/performers"),
          fetch("/api/catalog"),
          fetch("/api/performances"),
        ]);

        if (!performersRes.ok || !catalogRes.ok || !performancesRes.ok) {
          throw new Error("Falha ao carregar painel");
        }

        const [performers, catalog, performances] = await Promise.all([
          performersRes.json(),
          catalogRes.json(),
          performancesRes.json(),
        ]);

        setSummary({
          performers: Array.isArray(performers) ? performers.length : 0,
          catalog: Array.isArray(catalog) ? catalog.length : 0,
          performances: Array.isArray(performances) ? performances.length : 0,
        });
      } catch {
        setSummary({ performers: 0, catalog: 0, performances: 0 });
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
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-300/50 bg-gradient-to-br from-amber-200 via-yellow-400 to-amber-600 text-xl text-slate-950 shadow-[0_0_20px_rgba(251,191,36,0.35)]">
              ♪
            </div>
            <div>
              <div className="text-[9px] uppercase tracking-[0.26em] text-amber-100">Karaoke</div>
              <div className="text-lg font-black uppercase tracking-[0.14em]">Admin</div>
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

      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6">
          <div className="text-[10px] uppercase tracking-[0.28em] text-amber-200">Administração</div>
          <h1 className="mt-2 text-3xl font-black text-white">Painel de gestão</h1>
        </div>

        {loading ? (
          <div className="rounded-[24px] border border-white/10 bg-slate-900/80 p-6 text-slate-300">
            Carregando painel...
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            <Link href="/admin/cantores" className="rounded-[24px] border border-white/10 bg-slate-900/80 p-5 transition hover:border-violet-300/60 hover:bg-slate-900">
              <div className="text-[10px] uppercase tracking-[0.26em] text-violet-200">Cantores</div>
              <div className="mt-3 text-4xl font-black text-white">{summary.performers}</div>
              <div className="mt-4 text-xs uppercase tracking-[0.2em] text-slate-400">Editar / cadastrar</div>
            </Link>

            <Link href="/admin/catalogo" className="rounded-[24px] border border-white/10 bg-slate-900/80 p-5 transition hover:border-cyan-300/60 hover:bg-slate-900">
              <div className="text-[10px] uppercase tracking-[0.26em] text-cyan-200">Catálogo</div>
              <div className="mt-3 text-4xl font-black text-white">{summary.catalog}</div>
              <div className="mt-4 text-xs uppercase tracking-[0.2em] text-slate-400">Gerenciar músicas</div>
            </Link>

            <Link href="/admin/ranking" className="rounded-[24px] border border-white/10 bg-slate-900/80 p-5 transition hover:border-rose-300/60 hover:bg-slate-900">
              <div className="text-[10px] uppercase tracking-[0.26em] text-rose-200">Ranking</div>
              <div className="mt-3 text-4xl font-black text-white">{summary.performances}</div>
              <div className="mt-4 text-xs uppercase tracking-[0.2em] text-slate-400">Zerar avaliações</div>
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
