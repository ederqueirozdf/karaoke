"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

type Performer = {
  id: string;
  name: string;
  type: "solo" | "dupla";
};

export default function AdminCantoresPage() {
  const [performers, setPerformers] = useState<Performer[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<Performer["type"]>("solo");
  const [editingId, setEditingId] = useState<string | null>(null);

  const loadPerformers = async () => {
    const response = await fetch("/api/performers");
    if (!response.ok) return;
    const data = (await response.json()) as Performer[];
    setPerformers(data);
  };

  useEffect(() => {
    loadPerformers();
  }, []);

  const filteredPerformers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return performers;

    return performers.filter(
      (performer) =>
        performer.name.toLowerCase().includes(term) ||
        performer.type.toLowerCase().includes(term),
    );
  }, [performers, searchTerm]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const payload = { name, type };
    const method = editingId ? "PUT" : "POST";

    const response = await fetch("/api/performers", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editingId ? { ...payload, id: editingId } : payload),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      alert(data.error ?? "Não foi possível salvar o cantor.");
      return;
    }

    setName("");
    setType("solo");
    setEditingId(null);
    await loadPerformers();
  };

  const handleDelete = async (id: string) => {
    const response = await fetch(`/api/performers?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      alert("Não foi possível remover o cantor.");
      return;
    }

    await loadPerformers();
  };

  const handleEdit = (performer: Performer) => {
    setEditingId(performer.id);
    setName(performer.name);
    setType(performer.type);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/admin" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-violet-300/50 bg-gradient-to-br from-violet-200 via-purple-400 to-violet-600 text-xl text-slate-950 shadow-[0_0_20px_rgba(168,85,247,0.35)]">
              ♪
            </div>
            <div>
              <div className="text-[9px] uppercase tracking-[0.26em] text-violet-100">Admin</div>
              <div className="text-lg font-black uppercase tracking-[0.14em]">Cantores</div>
            </div>
          </Link>

          <Link href="/admin" className="rounded-full border border-white/10 bg-slate-900 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:border-violet-300/50 hover:text-white">
            Painel
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6">
          <div className="text-[10px] uppercase tracking-[0.28em] text-violet-200">Gestão</div>
          <h1 className="mt-2 text-3xl font-black text-white">Cadastrar e editar cantores</h1>
        </div>

        <form onSubmit={handleSubmit} className="mb-8 rounded-[28px] border border-white/10 bg-slate-900/80 p-5 shadow-[0_20px_30px_rgba(15,23,42,0.24)]">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="name" className="mb-2 block text-sm text-slate-300">Nome</label>
              <input
                id="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ex.: Maria Silva"
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-3 text-white placeholder:text-slate-500 focus:border-violet-400 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="type" className="mb-2 block text-sm text-slate-300">Tipo</label>
              <select
                id="type"
                value={type}
                onChange={(event) => setType(event.target.value as Performer["type"])}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-3 text-white focus:border-violet-400 focus:outline-none"
              >
                <option value="solo">Solo</option>
                <option value="dupla">Dupla</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex gap-3">
            <button type="submit" className="rounded-2xl bg-violet-500 px-4 py-3 text-sm font-bold uppercase tracking-[0.12em] text-white transition hover:bg-violet-400">
              {editingId ? "Atualizar cantor" : "Salvar cantor"}
            </button>

            {editingId ? (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setName("");
                  setType("solo");
                }}
                className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm font-bold uppercase tracking-[0.12em] text-slate-200 transition hover:border-white/20"
              >
                Cancelar
              </button>
            ) : null}
          </div>
        </form>

        <div className="rounded-[28px] border border-white/10 bg-slate-900/80 p-5">
          <label htmlFor="search" className="mb-2 block text-sm text-slate-300">Buscar cantor</label>
          <input
            id="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Digite o nome ou tipo..."
            className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-3 text-white placeholder:text-slate-500 focus:border-violet-400 focus:outline-none"
          />

          <div className="mt-5 space-y-3">
            {filteredPerformers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/60 p-4 text-slate-400">
                Nenhum cantor encontrado.
              </div>
            ) : (
              filteredPerformers.map((performer) => (
                <div key={performer.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-3">
                  <div>
                    <div className="font-semibold text-white">{performer.name}</div>
                    <div className="text-xs text-slate-400">{performer.type === "solo" ? "Solo" : "Dupla"}</div>
                  </div>

                  <div className="flex gap-2">
                    <button type="button" onClick={() => handleEdit(performer)} className="rounded-xl border border-violet-500/50 bg-violet-500/10 px-2.5 py-1.5 text-xs font-semibold text-violet-200 transition hover:bg-violet-500/20">
                      Editar
                    </button>
                    <button type="button" onClick={() => handleDelete(performer.id)} className="rounded-xl border border-rose-500/50 bg-rose-500/10 px-2.5 py-1.5 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/20">
                      Remover
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
