"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirExecucao } from "@/lib/auth";
import { proximosStatusExecucao, type CampoStatusExecucao, type StatusExecucaoValor } from "@/lib/execucao";

/**
 * Abre um novo processo de execução com os itens homologados com êxito
 * selecionados (de uma mesma consolidação) — equivalente a
 * abrirProcessoExecucaoLote do sistema original. Pode haver mais de um
 * processo de execução por consolidação.
 */
export async function abrirProcessoExecucaoLoteAction(consolidacaoId: string, formData: FormData) {
  const sessao = await exigirExecucao();
  const acesso = await prisma.acessoExecucao.findUniqueOrThrow({ where: { id: sessao.id } });

  const processoSEIExecucao = String(formData.get("processoSEIExecucao") ?? "").trim();
  if (!processoSEIExecucao) throw new Error("Informe o número do processo SEI de execução.");

  const itensDfdIds = formData.getAll("itemDfdId").map(String);
  const itensTecnicosIds = formData.getAll("itemTecnicoId").map(String);
  if (itensDfdIds.length === 0 && itensTecnicosIds.length === 0) {
    throw new Error("Selecione ao menos um item.");
  }

  // Só aceita itens homologados com êxito, desta consolidação, ainda sem processo de execução.
  const [itensDfd, itensTecnicos] = await Promise.all([
    prisma.itemDfd.findMany({
      where: { id: { in: itensDfdIds }, consolidacaoTecnicaId: consolidacaoId, resultadoHomologacao: "SUCESSO", processoExecucaoId: null },
    }),
    prisma.itemTecnico.findMany({
      where: { id: { in: itensTecnicosIds }, consolidacaoTecnicaId: consolidacaoId, resultadoHomologacao: "SUCESSO", processoExecucaoId: null },
    }),
  ]);
  if (itensDfd.length === 0 && itensTecnicos.length === 0) {
    throw new Error("Nenhum item válido selecionado — a tela pode estar desatualizada, recarregue e tente novamente.");
  }

  await prisma.processoExecucao.create({
    data: {
      consolidacaoId,
      subperfil: acesso.subperfil,
      acessoExecucaoId: acesso.id,
      processoSEIExecucao,
      itensDfd: { connect: itensDfd.map((it) => ({ id: it.id })) },
      itensTecnicos: { connect: itensTecnicos.map((it) => ({ id: it.id })) },
    },
  });

  revalidatePath("/");
}

/**
 * Registra o próximo status de um processo de execução. Ao registrar
 * "recebida em definitivo", a quantidade recebida pode ser parcial: a parte
 * recebida sai do processo como uma nova linha (dividirItem), a parte
 * restante permanece pendente — nunca se perde.
 */
export async function registrarStatusExecucaoAction(processoId: string, formData: FormData) {
  const sessao = await exigirExecucao();
  const proc = await prisma.processoExecucao.findUniqueOrThrow({
    where: { id: processoId },
    include: { statusExecucao: { orderBy: { createdAt: "desc" }, take: 1 }, itensDfd: true, itensTecnicos: true },
  });
  if (proc.acessoExecucaoId !== sessao.id) throw new Error("Este processo não pertence ao seu acesso.");

  const statusAtual = proc.statusExecucao[0]?.status ?? null;
  const novoStatus = String(formData.get("status") ?? "") as StatusExecucaoValor;
  const permitidos = proximosStatusExecucao(statusAtual);
  const info = permitidos.find((o) => o.value === novoStatus);
  if (!info) throw new Error("Status inválido ou fora de sequência — atualize a página e tente novamente.");

  const dados: Partial<Record<CampoStatusExecucao, string>> = {};
  for (const campo of info.campos) {
    const valor = String(formData.get(campo) ?? "").trim();
    if (!valor) throw new Error("Preencha todos os campos obrigatórios deste status.");
    dados[campo] = valor;
  }

  let avisoParcial = "";
  if (novoStatus === "RECEBIDA_DEFINITIVO") {
    const itensMaterial = proc.itensDfd.filter((it) => it.tipo === "MATERIAL");
    const pendentesResumo: string[] = [];
    for (const it of itensMaterial) {
      const qtdInformada = formData.get(`qtd_${it.id}`);
      if (qtdInformada == null) continue;
      const qtdRecebida = Number(qtdInformada) || 0;
      const qtdOriginal = Number(it.quantidade ?? 1);
      if (qtdRecebida <= 0) {
        await prisma.itemDfd.update({ where: { id: it.id }, data: { processoExecucaoId: null } });
        pendentesResumo.push(`${it.itemCatalogoNome ?? it.itemNomeLivre} (0 de ${qtdOriginal})`);
      } else if (qtdRecebida < qtdOriginal) {
        const valorUnit = Number(it.valorUnit ?? 0);
        const valorUnitAdjudicado = it.valorAdjudicado != null ? Number(it.valorAdjudicado) / qtdOriginal : null;
        const quantidadeRestante = qtdOriginal - qtdRecebida;
        await prisma.$transaction([
          prisma.itemDfd.update({
            where: { id: it.id },
            data: { quantidade: quantidadeRestante, valorTotal: valorUnit * quantidadeRestante, processoExecucaoId: null },
          }),
          prisma.itemDfd.create({
            data: {
              dfdId: it.dfdId,
              tipo: it.tipo,
              enquadramento: it.enquadramento,
              categoriaId: it.categoriaId,
              itemCatalogoNome: it.itemCatalogoNome,
              itemNomeLivre: it.itemNomeLivre,
              tipoBem: it.tipoBem,
              quantidade: qtdRecebida,
              valorUnit: it.valorUnit,
              valorTotal: valorUnit * qtdRecebida,
              correlacao: it.correlacao,
              consolidacaoTecnicaId: it.consolidacaoTecnicaId,
              itemOrigemDivisaoId: it.id,
              resultadoHomologacao: "SUCESSO",
              valorAdjudicado: valorUnitAdjudicado != null ? valorUnitAdjudicado * qtdRecebida : null,
              processoExecucaoId: proc.id,
            },
          }),
        ]);
        pendentesResumo.push(`${it.itemCatalogoNome ?? it.itemNomeLivre} (${qtdRecebida} de ${qtdOriginal})`);
      }
    }
    if (pendentesResumo.length > 0) {
      avisoParcial = ` Recebimento parcial registrado para: ${pendentesResumo.join(", ")}. O restante aguarda nova abertura de processo de execução.`;
    }
  }

  await prisma.statusExecucao.create({
    data: {
      processoExecucaoId: processoId,
      status: novoStatus,
      criadoPorId: sessao.id,
      dataEnvio: dados.dataEnvio ? new Date(dados.dataEnvio) : null,
      prazoDias: dados.prazoDias ? Number(dados.prazoDias) : null,
    },
  });

  revalidatePath(`/execucao/${processoId}`);
  revalidatePath("/");
  return avisoParcial || undefined;
}
