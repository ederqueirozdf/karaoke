import { NextResponse } from "next/server";

import { prisma } from "../../../lib/db";

export async function GET() {
  const performances = await prisma.performance.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      performer: true,
      catalog: true,
    },
  });

  return NextResponse.json(performances);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const performerId = String(body.performerId ?? "").trim();
    const catalogId = String(body.catalogId ?? "").trim();
    const title = String(body.title ?? "").trim();
    const genre = String(body.genre ?? "").trim();
    const youtubeUrl = String(body.youtubeUrl ?? "").trim();
    const note = Number(body.note ?? 0);

    if (!performerId || !catalogId || !title || !youtubeUrl) {
      return NextResponse.json({ error: "Dados da avaliação incompletos." }, { status: 400 });
    }

    const created = await prisma.performance.create({
      data: {
        performerId,
        catalogId,
        title,
        genre,
        youtubeUrl,
        note,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Erro ao salvar avaliação:", error);
    return NextResponse.json({ error: "Erro ao salvar avaliação." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id")?.trim();
    const all = searchParams.get("all") === "true";

    if (all) {
      await prisma.performance.deleteMany();
      return NextResponse.json({ success: true });
    }

    if (!id) {
      return NextResponse.json({ error: "ID da avaliação é obrigatório." }, { status: 400 });
    }

    await prisma.performance.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao remover avaliação:", error);
    return NextResponse.json({ error: "Erro ao remover avaliação." }, { status: 500 });
  }
}
