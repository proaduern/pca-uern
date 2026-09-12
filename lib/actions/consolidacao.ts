"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirSetorTecnico } from "@/lib/auth";
import { validarDataConclusao } from "@/lib/consolidacao";

async function obterCategoriaDoSetorOuErro(categoriaId: string, setorTecnicoId: string) {
  const categoria = await prisma.categoria.findUnique({ where: { id: categoriaId } });
  if (!categoria || categoria.setorTecnicoId !== setorTecnicoId) {
    throw new Error("Esta categoria não está atribuída ao seu setor técnico.");
  }
  return categoria;
}

export async function adicionarItemTecnicoAction(categoriaId: string, formData: FormData) {
  const sessao = await exigirSetorTecnico();
  await obterCategoriaDoSetorOuErro(categoriaId, sessao.id);

  const item = String(formData.get("item") ?? "").trim();
  const valorUnit = Number(formData.get("valorUnit") ?? 0);
  const quantidade = Number(formData.get("quantidade") ?? 0);
  const tipoBem = String(formData.get("tipoBem") ?? "") as "CONSUMO" | "PERMANENTE";
  const correlacao = String(formData.get("correlacao") ?? "").trim();

  if (!item || !(valorUnit > 0) || !(quantidade > 0) || !correlacao) {
    throw new Error("Preencha todos os campos.");
  }
  if (!["CONSUMO", "PERMANENTE"].includes(tipoBem)) {
    throw new Error("Selecione o tipo de bem.");
  }

  await prisma.itemTecnico.create({
    data: {
      categoriaId,
      item,
      valorUnit,
      quantidade,
      valorTotal: valorUnit * quantidade,
      tipoBem,
      correlacao,
      criadoPorId: sessao.id,
    },
  });

  revalidatePath(`/consolidacao/${categoriaId}`);
}

export async function substituirItemAction(
  origem: "dfd" | "tecnico",
  itemId: string,
  novoItemCatalogoId: string,
  justificativa: string,
) {
  const sessao = await exigirSetorTecnico();
  const justificativaLimpa = justificativa.trim();
  if (!justificativaLimpa) throw new Error("Informe a justificativa da substituição.");

  if (origem === "dfd") {
    const it = await prisma.itemDfd.findUniqueOrThrow({ where: { id: itemId } });
    await obterCategoriaDoSetorOuErro(it.categoriaId, sessao.id);
    if (it.consolidacaoTecnicaId) throw new Error("Este item já foi consolidado e não pode mais ser substituído.");

    const novoItemCatalogo = await prisma.itemCatalogo.findUniqueOrThrow({ where: { id: novoItemCatalogoId } });
    if (novoItemCatalogo.categoriaId !== it.categoriaId) {
      throw new Error("O item substituto precisa ser da mesma categoria.");
    }

    await prisma.itemDfd.update({
      where: { id: itemId },
      data: {
        ...(it.itemSubstituidoNome
          ? {}
          : {
              itemSubstituidoNome: it.itemCatalogoNome ?? it.itemNomeLivre,
              itemSubstituidoValorUnit: it.valorUnit,
              itemSubstituidoTipoBem: it.tipoBem,
            }),
        itemCatalogoNome: novoItemCatalogo.item,
        itemNomeLivre: null,
        valorUnit: novoItemCatalogo.valor,
        tipoBem: novoItemCatalogo.tipoBem,
        valorTotal: Number(novoItemCatalogo.valor) * Number(it.quantidade ?? 1),
        substituicaoJustificativa: justificativaLimpa,
        substituicaoPorId: sessao.id,
        substituicaoEm: new Date(),
      },
    });
    revalidatePath(`/consolidacao/${it.categoriaId}`);
  } else {
    const it = await prisma.itemTecnico.findUniqueOrThrow({ where: { id: itemId } });
    await obterCategoriaDoSetorOuErro(it.categoriaId, sessao.id);
    if (it.consolidacaoTecnicaId) throw new Error("Este item já foi consolidado e não pode mais ser substituído.");

    const novoItemCatalogo = await prisma.itemCatalogo.findUniqueOrThrow({ where: { id: novoItemCatalogoId } });
    if (novoItemCatalogo.categoriaId !== it.categoriaId) {
      throw new Error("O item substituto precisa ser da mesma categoria.");
    }

    await prisma.itemTecnico.update({
      where: { id: itemId },
      data: {
        ...(it.itemSubstituidoNome
          ? {}
          : {
              itemSubstituidoNome: it.item,
              itemSubstituidoValorUnit: it.valorUnit,
              itemSubstituidoTipoBem: it.tipoBem,
            }),
        item: novoItemCatalogo.item,
        valorUnit: novoItemCatalogo.valor,
        tipoBem: novoItemCatalogo.tipoBem,
        valorTotal: Number(novoItemCatalogo.valor) * Number(it.quantidade),
        substituicaoJustificativa: justificativaLimpa,
        substituicaoEm: new Date(),
      },
    });
    revalidatePath(`/consolidacao/${it.categoriaId}`);
  }
}

export async function consolidarCategoriaAction(categoriaId: string, formData: FormData) {
  const sessao = await exigirSetorTecnico();
  await obterCategoriaDoSetorOuErro(categoriaId, sessao.id);

  const itensDfdIds = formData.getAll("itemDfdId").map(String);
  const itensTecnicosIds = formData.getAll("itemTecnicoId").map(String);
  if (itensDfdIds.length === 0 && itensTecnicosIds.length === 0) {
    throw new Error("Selecione ao menos um item para consolidar.");
  }

  const processoSEI = String(formData.get("processoSEI") ?? "").trim();
  const idDocumentoETP = String(formData.get("idDocumentoETP") ?? "").trim();
  const dataETP = String(formData.get("dataETP") ?? "");
  const prioridade = String(formData.get("prioridade") ?? "") as "ALTA" | "MEDIA" | "BAIXA";
  const tipoContratacao = String(formData.get("tipoContratacao") ?? "") as "NORMAL" | "ATA";
  const dataEsperadaConclusao = String(formData.get("dataEsperadaConclusao") ?? "");

  if (!processoSEI || !idDocumentoETP || !dataETP || !dataEsperadaConclusao) {
    throw new Error("Preencha processo SEI, ID do documento ETP, data do ETP e data esperada de conclusão.");
  }
  if (!["ALTA", "MEDIA", "BAIXA"].includes(prioridade)) throw new Error("Selecione a prioridade.");
  if (!["NORMAL", "ATA"].includes(tipoContratacao)) throw new Error("Selecione o tipo de contratação.");

  const erroData = validarDataConclusao(dataETP, dataEsperadaConclusao);
  if (erroData) throw new Error(erroData);

  const pcaAtivo = await prisma.pca.findFirst({ where: { ativo: true } });
  if (!pcaAtivo) throw new Error("Nenhum PCA ativo no momento.");

  // Revalida no servidor que os itens marcados realmente pertencem a esta
  // categoria, estão aprovados (no caso de DFD) e ainda não foram
  // consolidados — não confia em nada vindo só do formulário.
  const [itensDfd, itensTecnicos] = await Promise.all([
    itensDfdIds.length
      ? prisma.itemDfd.findMany({
          where: {
            id: { in: itensDfdIds },
            categoriaId,
            consolidacaoTecnicaId: null,
            dfd: { status: "APROVADO" },
          },
        })
      : Promise.resolve([]),
    itensTecnicosIds.length
      ? prisma.itemTecnico.findMany({
          where: { id: { in: itensTecnicosIds }, categoriaId, consolidacaoTecnicaId: null },
        })
      : Promise.resolve([]),
  ]);

  if (itensDfd.length !== itensDfdIds.length || itensTecnicos.length !== itensTecnicosIds.length) {
    throw new Error("Algum item selecionado não está mais disponível para consolidação. Atualize a página.");
  }

  await prisma.$transaction(async (tx) => {
    const consolidacao = await tx.consolidacaoTecnica.create({
      data: {
        categoriaId,
        setorTecnicoId: sessao.id,
        pcaAno: pcaAtivo.ano,
        processoSEI,
        idDocumentoETP,
        dataETP: new Date(dataETP),
        prioridade,
        tipoContratacao,
        dataEsperadaConclusao: new Date(dataEsperadaConclusao),
      },
    });

    if (itensDfd.length) {
      await tx.itemDfd.updateMany({
        where: { id: { in: itensDfd.map((i) => i.id) } },
        data: { consolidacaoTecnicaId: consolidacao.id },
      });
    }
    if (itensTecnicos.length) {
      await tx.itemTecnico.updateMany({
        where: { id: { in: itensTecnicos.map((i) => i.id) } },
        data: { consolidacaoTecnicaId: consolidacao.id },
      });
    }
  });

  revalidatePath(`/consolidacao/${categoriaId}`);
}
