import { NextResponse } from "next/server";

import { prisma } from "../../../lib/db";

export async function GET() {
  const songs = await prisma.catalogSong.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(songs);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const title = String(body.title ?? "").trim();
    const artist = String(body.artist ?? "").trim();
    const genre = String(body.genre ?? "Pop").trim();
    const youtubeUrl = String(body.youtubeUrl ?? "").trim();
    const bpm = Number(body.bpm ?? 110);
    const difficulty = String(body.difficulty ?? "médio").trim();

    if (!title || !artist || !youtubeUrl) {
      return NextResponse.json({ error: "Título, artista e link do vídeo são obrigatórios." }, { status: 400 });
    }

    const created = await prisma.catalogSong.upsert({
      where: { title_artist: { title, artist } },
      update: {
        genre,
        youtubeUrl,
        bpm,
        difficulty,
      },
      create: {
        title,
        artist,
        genre,
        youtubeUrl,
        bpm,
        difficulty,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar música:", error);
    return NextResponse.json({ error: "Erro ao salvar música." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id")?.trim();

    if (!id) {
      return NextResponse.json({ error: "ID da música é obrigatório." }, { status: 400 });
    }

    await prisma.catalogSong.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao remover música:", error);
    return NextResponse.json({ error: "Erro ao remover música." }, { status: 500 });
  }
}
