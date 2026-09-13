"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirAdmin, exigirUnidade } from "@/lib/auth";

/**
 * Solicitação de inclusão de novo item no catálogo padronizado, feita pela
 * unidade quando não encontra o material desejado no wizard de DFD —
 * equivalente a "enviarSolicitacao" do sistema original.
 */
export async function enviarSolicitacaoCatalogoAction(formData: FormData) {
  const sessao = await exigirUnidade();

  const nomeResumido = String(formData.get("nomeResumido") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim();
  const marcaModelo = String(formData.get("marcaModelo") ?? "").trim() || null;
  const link = String(formData.get("link") ?? "").trim() || null;
  const aplicacao = String(formData.get("aplicacao") ?? "").trim();
  const valorEstimado = Number(formData.get("valorEstimado") ?? 0);
  const tipoBemSugerido = (String(formData.get("tipoBemSugerido") ?? "") || "PERMANENTE") as
    | "CONSUMO"
    | "PERMANENTE";

  if (!nomeResumido || !descricao || !aplicacao) {
    throw new Error("Preencha nome resumido, descrição detalhada e aplicação prática.");
  }
  if (!(valorEstimado > 0)) {
    throw new Error("Informe um valor estimado maior que zero.");
  }

  await prisma.solicitacaoCatalogo.create({
    data: {
      unidadeId: sessao.id,
      nomeResumido,
      descricao,
      marcaModelo,
      link,
      aplicacao,
      valorEstimado,
      tipoBemSugerido,
    },
  });

  revalidatePath("/");
}

/**
 * PROAD aceita a solicitação: inclui o item no catálogo (categoria/valor/tipo
 * de bem podem ser ajustados na análise) — equivalente a "aceitarSolicitacao".
 */
export async function aceitarSolicitacaoCatalogoAction(solicitacaoId: string, formData: FormData) {
  await exigirAdmin();
  const solicitacao = await prisma.solicitacaoCatalogo.findUniqueOrThrow({
    where: { id: solicitacaoId },
  });
  if (solicitacao.status !== "PENDENTE") {
    throw new Error("Esta solicitação já foi analisada.");
  }

  const categoriaNome = String(formData.get("categoria") ?? "").trim();
  const itemNome = String(formData.get("item") ?? "").trim();
  const valor = Number(formData.get("valor") ?? 0);
  const tipoBem = (String(formData.get("tipoBem") ?? "") || "PERMANENTE") as "CONSUMO" | "PERMANENTE";

  if (!categoriaNome || !itemNome) throw new Error("Preencha categoria e item.");
  if (!(valor > 0)) throw new Error("Informe um valor maior que zero.");

  const categoria = await prisma.categoria.upsert({
    where: { nome: categoriaNome },
    update: {},
    create: { nome: categoriaNome, tipo: "MATERIAL" },
  });

  await prisma.$transaction([
    prisma.itemCatalogo.create({
      data: { categoriaId: categoria.id, item: itemNome, valor, tipoBem, origemSolicitacao: true },
    }),
    prisma.solicitacaoCatalogo.update({
      where: { id: solicitacaoId },
      data: {
        status: "ACEITO",
        categoriaFinalId: categoria.id,
        itemFinal: itemNome,
        valorFinal: valor,
        tipoBemFinal: tipoBem,
        analisadoEm: new Date(),
      },
    }),
  ]);

  revalidatePath("/admin/solicitacoes");
  revalidatePath("/admin/catalogo");
}

/** PROAD rejeita a solicitação, com motivo opcional visível para a unidade. */
export async function rejeitarSolicitacaoCatalogoAction(solicitacaoId: string, formData: FormData) {
  await exigirAdmin();
  const solicitacao = await prisma.solicitacaoCatalogo.findUniqueOrThrow({
    where: { id: solicitacaoId },
  });
  if (solicitacao.status !== "PENDENTE") {
    throw new Error("Esta solicitação já foi analisada.");
  }

  const motivo = String(formData.get("motivo") ?? "").trim() || null;

  await prisma.solicitacaoCatalogo.update({
    where: { id: solicitacaoId },
    data: { status: "REJEITADO", motivoRejeicao: motivo, analisadoEm: new Date() },
  });

  revalidatePath("/admin/solicitacoes");
}
