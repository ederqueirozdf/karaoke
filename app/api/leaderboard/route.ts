import { NextResponse } from "next/server";

import { prisma } from "../../../lib/db";

export async function GET() {
  const performances = await prisma.performance.findMany({
    include: {
      performer: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const ranking = new Map<string, { performer: { id: string; name: string; type: string }; total: number; count: number; average: number }>();

  performances.forEach((performance) => {
    const current = ranking.get(performance.performerId) ?? {
      performer: {
        id: performance.performer.id,
        name: performance.performer.name,
        type: performance.performer.type,
      },
      total: 0,
      count: 0,
      average: 0,
    };

    current.total += performance.note;
    current.count += 1;
    ranking.set(performance.performerId, current);
  });

  const result = Array.from(ranking.values())
    .map((item) => ({
      ...item,
      average: Number((item.total / item.count).toFixed(2)),
    }))
    .sort((a, b) => b.total - a.total || b.average - a.average);

  return NextResponse.json(result);
}
