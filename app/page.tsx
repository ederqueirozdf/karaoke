import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#050b14] text-[#f8f4ee]">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#07111d]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-300/50 bg-gradient-to-br from-amber-200 via-yellow-400 to-amber-600 text-xl text-slate-950 shadow-[0_0_20px_rgba(251,191,36,0.35)]">
              ♪
            </div>
            <div>
              <div className="text-[9px] uppercase tracking-[0.28em] text-amber-100">Karaoke</div>
              <div className="text-lg font-black uppercase tracking-[0.14em] text-white">Primos</div>
            </div>
          </Link>

          <Link
            href="/admin"
            className="rounded-full border border-white/10 bg-slate-900/80 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-300 transition hover:border-white/20 hover:text-white"
          >
            Administração
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-8 text-center">
          <div className="text-[10px] uppercase tracking-[0.36em] text-amber-200">Painel principal</div>
          <h1 className="mt-3 text-4xl font-black uppercase tracking-[0.12em] text-white md:text-5xl">
            Karaoke dos Primos
          </h1>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {[
            { href: "/ranking?view=day", label: "Ranking do Dia", accent: "from-amber-500/20 to-yellow-500/10", icon: "🏆" },
            { href: "/ranking?view=overall", label: "Ranking Geral", accent: "from-violet-500/20 to-purple-500/10", icon: "🔥" },
            { href: "/catalogo", label: "Catálogo", accent: "from-cyan-500/20 to-sky-500/10", icon: "🎵" },
            { href: "/cantores", label: "Cantores", accent: "from-emerald-500/20 to-green-500/10", icon: "👤" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`group relative block overflow-hidden rounded-[26px] border border-white/10 bg-gradient-to-br ${item.accent} p-4 text-left shadow-[0_18px_40px_rgba(15,23,42,0.35)] transition duration-300 hover:-translate-y-1 hover:border-white/20 hover:shadow-[0_26px_50px_rgba(15,23,42,0.45)]`}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.18),_transparent_32%)] opacity-70" />
              <div className="relative">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/60 text-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-transform duration-300 group-hover:scale-105">
                  {item.icon}
                </div>
                <div className="text-[10px] font-bold uppercase tracking-[0.26em] text-slate-300">Acesso rápido</div>
                <div className="mt-2 text-xl font-black text-white">{item.label}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
