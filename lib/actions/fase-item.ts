"use server";

import { prisma } from "@/lib/prisma";
import { exigirUnidade } from "@/lib/auth";
import { construirTimelineItemDfd, type EventoTimeline } from "@/lib/fase-item";

export async function obterTimelineItemDfdAction(itemId: string): Promise<EventoTimeline[]> {
  const sessao = await exigirUnidade();
  const item = await prisma.itemDfd.findUniqueOrThrow({ where: { id: itemId }, include: { dfd: true } });
  if (item.dfd.unidadeId !== sessao.id) throw new Error("Este item não pertence à sua unidade.");
  return construirTimelineItemDfd(itemId);
}
