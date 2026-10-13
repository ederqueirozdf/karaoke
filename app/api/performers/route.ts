import { NextResponse } from "next/server";

import { prisma } from "../../../lib/db";

export async function GET() {
  const performers = await prisma.performer.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(performers);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const type = body.type === "dupla" ? "dupla" : "solo";

    if (!name) {
      return NextResponse.json({ error: "Nome do cantor é obrigatório." }, { status: 400 });
    }

    const created = await prisma.performer.upsert({
      where: { name_type: { name, type } },
      update: {},
      create: { name, type },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar cantor:", error);
    return NextResponse.json({ error: "Erro ao salvar cantor." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const id = String(body.id ?? "").trim();
    const name = String(body.name ?? "").trim();
    const type = body.type === "dupla" ? "dupla" : "solo";

    if (!id || !name) {
      return NextResponse.json({ error: "Dados do cantor incompletos." }, { status: 400 });
    }

    const existing = await prisma.performer.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Cantor não encontrado." }, { status: 404 });
    }

    const duplicate = await prisma.performer.findFirst({
      where: {
        AND: [{ name }, { type }, { NOT: { id } }],
      },
    });

    if (duplicate) {
      return NextResponse.json({ error: "Já existe um cantor com esse nome e tipo." }, { status: 409 });
    }

    const updated = await prisma.performer.update({
      where: { id },
      data: { name, type },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Erro ao atualizar cantor:", error);
    return NextResponse.json({ error: "Erro ao atualizar cantor." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id")?.trim();

    if (!id) {
      return NextResponse.json({ error: "ID do cantor é obrigatório." }, { status: 400 });
    }

    await prisma.performer.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao remover cantor:", error);
    return NextResponse.json({ error: "Erro ao remover cantor." }, { status: 500 });
  }
}
