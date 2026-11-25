"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { obterSessao, exigirAdmin } from "@/lib/auth";
import { avancarStatusLicitacaoSeNecessario } from "./avancar-status";
import {
  verificarConfiguracaoPncp,
  publicarPcaNoPncpApi,
  publicarEditalNoPncpApi,
} from "@/lib/pncp-client";
import { compilarLinhasPcaAno } from "@/lib/pca-consolidado";
import type { ResultadoAcao } from "./tipos";

// ---------------------------------------------------------------------------
// 1. Subsistema PCA -> Encaminhamento Automático para Subsistema de ETP e Riscos
// ---------------------------------------------------------------------------

/**
 * Publica o PCA no PNCP (por categoria ou por objeto conforme `consolidarPorObjeto`)
 * e encaminha automaticamente os pacotes de itens aprovados para a fila do
 * Subsistema de ETP e Mapa de Riscos do Setor Técnico competente (`setorTecnicoId`).
 */
export async function publicarPcaEEncaminharParaEtpAction(formData: FormData): Promise<ResultadoAcao> {
  await exigirAdmin();
  const ano = Number(formData.get("ano") ?? 0);

  if (!ano) return { erro: "Ano do PCA inválido." };

  const pca = await prisma.pca.findUnique({ where: { ano } });
  if (!pca) return { erro: "PCA não encontrado." };

  // 1. Verifica se ainda há DFDs primários aguardando aprovação da PROAD
  const dfdsPendentesAprovacao = await prisma.dfd.count({
    where: { ano, status: "AGUARDANDO_APROVACAO" },
  });
  if (dfdsPendentesAprovacao > 0) {
    return {
      erro: `Ainda existem ${dfdsPendentesAprovacao} DFD(s) primário(s) aguardando aprovação da PROAD no PCA ${ano}. Aprove ou reprove todos os DFDs antes de concluir o PCA e encaminhar aos Setores Técnicos.`,
    };
  }

  // 2. Busca todos os itens de DFDs APROVADOS deste ano (exceto Fluxo Contínuo / Fora do PCA)
  const todosItensPca = await prisma.itemDfd.findMany({
    where: {
      dfd: { ano, status: "APROVADO" },
      categoria: { fluxoContinuo: false, ignoraPCA: false },
    },
    include: {
      categoria: { include: { setorTecnico: { select: { nome: true } } } },
      dfd: { include: { unidade: { select: { nome: true } } } },
      consolidacaoTecnica: true,
    },
  });

  if (todosItensPca.length === 0) {
    return { erro: "Não há itens de DFDs aprovados neste PCA para concluir e encaminhar." };
  }

  // 3. Compila as linhas do PCA conforme as regras oficiais (3 Blocos) e valida se todas possuem ID do PNCP
  const linhasCompiladas = compilarLinhasPcaAno(
    todosItensPca.map((it) => ({
      id: it.id,
      dfdId: it.dfdId,
      dfdDescricaoSumaria: it.dfd.descricaoSumaria,
      dfdIdSeiOrigem: it.idSeiDfdOrigem ?? it.dfd.idSeiDfdOrigem,
      dfdProcessoSeiOrigem: it.processoSeiOrigem ?? it.dfd.processoSeiOrigem,
      dfdTipoDemanda: it.dfd.tipoDemanda,
      dfdStatus: it.dfd.status,
      unidadeNome: it.dfd.unidade.nome,
      categoriaId: it.categoriaId,
      categoriaNome: it.categoria.nome,
      categoriaTipo: it.categoria.tipo,
      categoriaClassificacaoRubrica: it.categoria.classificacaoRubrica,
      categoriaConsolidarPorObjeto: it.categoria.consolidarPorObjeto,
      categoriaCodigoPcaPadrao: it.categoria.codigoPcaPadrao,
      setorTecnicoId: it.categoria.setorTecnicoId,
      setorTecnicoNome: it.categoria.setorTecnico?.nome ?? "Sem setor vinculado",
      enquadramento: it.enquadramento,
      valorTotal: Number(it.valorTotal),
      codigoPncpReferencia: it.codigoPncpReferencia,
      consolidacaoCodigoPca: it.consolidacaoTecnica?.codigoPca ?? null,
    })),
  );

  const linhasSemPncp = linhasCompiladas.filter((l) => !l.codigoPncp?.trim());
  if (linhasSemPncp.length > 0) {
    const lista = linhasSemPncp.map((l) => l.objetoOuGrupoNome);
    return {
      erro: `O PCA ${ano} só pode ser concluído e seguir para as demais fases (Setores Técnicos, DFD Consolidado, ETP, Mapa de Riscos e IMR) depois que TODOS os IDs do PNCP estiverem devidamente lançados na compilação do PCA. Faltam ${lista.length} linha(s) compilada(s) sem ID do PNCP: ${lista.slice(0, 8).join(", ")}${lista.length > 8 ? ` e mais ${lista.length - 8}...` : "."}`,
    };
  }

  const hoje = new Date();
  const prazoConclusao = new Date(hoje.getTime() + 90 * 24 * 60 * 60 * 1000);
  const setorPadrao = await prisma.setorTecnico.findFirst({ where: { ativo: true } });

  const itensPorId = new Map(todosItensPca.map((it) => [it.id, it]));
  let seq = 1;

  for (const linha of linhasCompiladas) {
    const idsPendentes = linha.itensDfdIds.filter((id) => !itensPorId.get(id)?.consolidacaoTecnicaId);
    if (idsPendentes.length === 0) continue;

    const setorId = linha.setorTecnicoId ?? setorPadrao?.id;
    if (!setorId) continue;

    const codigoSeq = String(seq++).padStart(3, "0");
    const procSei = linha.processoSeiSugerido?.trim() || `04410001.000${codigoSeq}/${ano}-PCA`;

    const novaConsolidacao = await prisma.consolidacaoTecnica.create({
      data: {
        categoriaId: linha.categoriaIdPrincipal,
        setorTecnicoId: setorId,
        pcaAno: ano,
        processoSEI: procSei,
        dataETP: hoje,
        prioridade: "MEDIA",
        tipoContratacao: "ATA",
        dataEsperadaConclusao: prazoConclusao,
        codigoPca: linha.codigoPncp || null,
      },
    });

    await prisma.itemDfd.updateMany({
      where: { id: { in: idsPendentes } },
      data: { consolidacaoTecnicaId: novaConsolidacao.id },
    });
  }

  // Marca o PCA como publicado/concluído e encaminhado ao Subsistema de ETP e Riscos
  await prisma.pca.update({
    where: { ano },
    data: {
      concluido: true,
      concluidoEm: new Date(),
    },
  });

  revalidatePath("/admin/pca");
  revalidatePath("/consolidacao");
  revalidatePath("/");
  return {};
}

// ---------------------------------------------------------------------------
// 2. Minuta de Contrato (Setor de Contratos — Tipo NORMAL)
// ---------------------------------------------------------------------------

export async function salvarMinutaContratoAction(
  consolidacaoTecnicaId: string,
  formData: FormData,
): Promise<ResultadoAcao> {
  const sessao = await obterSessao();
  if (!sessao || !["ADMIN", "LICITACOES", "AGENTE_CONTRATACAO", "EXECUCAO"].includes(sessao.tipo)) {
    return { erro: "Acesso restrito ao Setor de Contratos / Licitações." };
  }

  const acao = String(formData.get("acao") ?? "rascunho"); // "rascunho" | "finalizar"
  const campo = (n: string) => String(formData.get(n) ?? "").trim();

  const dados = {
    clausulaVigenciaProrrogacao: campo("clausulaVigenciaProrrogacao"),
    clausulaDotacaoOrcamentaria: campo("clausulaDotacaoOrcamentaria"),
    clausulaReajusteRepactuacao: campo("clausulaReajusteRepactuacao"),
    clausulaGarantiaContratual: campo("clausulaGarantiaContratual"),
    clausulaObrigacoesContratada: campo("clausulaObrigacoesContratada"),
    clausulaObrigacoesContratante: campo("clausulaObrigacoesContratante"),
    clausulaFiscalizacaoGestao: campo("clausulaFiscalizacaoGestao"),
    clausulaExtincaoForo: campo("clausulaExtincaoForo"),
    responsavelNome: campo("responsavelNome") || sessao.nome,
    responsavelMatricula: campo("responsavelMatricula") || null,
  };

  if (acao === "finalizar") {
    for (const [k, v] of Object.entries(dados)) {
      if (k !== "responsavelMatricula" && !v) {
        return { erro: "Preencha todas as cláusulas da Minuta de Contrato antes de finalizar." };
      }
    }
  }

  const status = acao === "finalizar" ? ("FINALIZADO" as const) : ("RASCUNHO" as const);
  const finalizadoEm = acao === "finalizar" ? new Date() : null;

  await prisma.minutaContrato.upsert({
    where: { consolidacaoTecnicaId },
    create: {
      consolidacaoTecnicaId,
      ...dados,
      status,
      finalizadoEm,
    },
    update: {
      ...dados,
      status,
      finalizadoEm,
    },
  });

  if (acao === "finalizar") {
    await avancarStatusLicitacaoSeNecessario(consolidacaoTecnicaId, "ANALISE_JURIDICA", dados.responsavelNome);
  }

  revalidatePath(`/licitacoes/${consolidacaoTecnicaId}`);
  revalidatePath(`/agente-contratacao/${consolidacaoTecnicaId}`);
  return {};
}

// ---------------------------------------------------------------------------
// 3. Minuta de Ata de Registro de Preços - ARP (Setor de Gestão de Atas — Tipo ATA)
// ---------------------------------------------------------------------------

export async function salvarMinutaAtaAction(
  consolidacaoTecnicaId: string,
  formData: FormData,
): Promise<ResultadoAcao> {
  const sessao = await obterSessao();
  if (!sessao || !["ADMIN", "LICITACOES", "GESTOR_ATA", "AGENTE_CONTRATACAO"].includes(sessao.tipo)) {
    return { erro: "Acesso restrito ao Setor de Gestão de Atas / Licitações." };
  }

  const acao = String(formData.get("acao") ?? "rascunho"); // "rascunho" | "finalizar"
  const campo = (n: string) => String(formData.get(n) ?? "").trim();

  const dados = {
    clausulaValidadeAta: campo("clausulaValidadeAta"),
    clausulaOrgaoGerenciadorParticipantes: campo("clausulaOrgaoGerenciadorParticipantes"),
    clausulaAdesaoCarona: campo("clausulaAdesaoCarona"),
    clausulaRevisaoCancelamentoPrecos: campo("clausulaRevisaoCancelamentoPrecos"),
    clausulaCadastroReserva: campo("clausulaCadastroReserva"),
    clausulaCondicoesFornecimento: campo("clausulaCondicoesFornecimento"),
    clausulaPenalidadesAta: campo("clausulaPenalidadesAta"),
    clausulaDisposicoesFinais: campo("clausulaDisposicoesFinais"),
    responsavelNome: campo("responsavelNome") || sessao.nome,
    responsavelMatricula: campo("responsavelMatricula") || null,
  };

  if (acao === "finalizar") {
    for (const [k, v] of Object.entries(dados)) {
      if (k !== "responsavelMatricula" && !v) {
        return { erro: "Preencha todas as cláusulas da Minuta de Ata (ARP) antes de finalizar." };
      }
    }
  }

  const status = acao === "finalizar" ? ("FINALIZADO" as const) : ("RASCUNHO" as const);
  const finalizadoEm = acao === "finalizar" ? new Date() : null;

  await prisma.minutaAta.upsert({
    where: { consolidacaoTecnicaId },
    create: {
      consolidacaoTecnicaId,
      ...dados,
      status,
      finalizadoEm,
    },
    update: {
      ...dados,
      status,
      finalizadoEm,
    },
  });

  if (acao === "finalizar") {
    await avancarStatusLicitacaoSeNecessario(consolidacaoTecnicaId, "ANALISE_JURIDICA", dados.responsavelNome);
  }

  revalidatePath(`/licitacoes/${consolidacaoTecnicaId}`);
  revalidatePath(`/agente-contratacao/${consolidacaoTecnicaId}`);
  return {};
}

// ---------------------------------------------------------------------------
// 4. Fase Jurídica (AJUR/PGE) e Loop de Diligências Seletivas dentro do Sistema
// ---------------------------------------------------------------------------

/**
 * Registra parecer jurídico da AJUR/PGE (emitido fora do sistema, no SEI) e,
 * caso haja diligências, reabre seletivamente dentro do sistema os artefatos
 * marcados (ETP, Mapa de Riscos, Pesquisa de Preços, TR, Minuta de Edital,
 * Minuta de Contrato ou Minuta de Ata) para que o setor competente faça o ajuste.
 */
export async function registrarDiligenciaJuridicaAction(
  consolidacaoTecnicaId: string,
  formData: FormData,
): Promise<ResultadoAcao> {
  const sessao = await obterSessao();
  if (!sessao || !["ADMIN", "LICITACOES", "AGENTE_CONTRATACAO"].includes(sessao.tipo)) {
    return { erro: "Acesso restrito a Licitações / Agente de Contratação." };
  }

  const numeroParecerSei = String(formData.get("numeroParecerSei") ?? "").trim();
  const dataParecer = String(formData.get("dataParecer") ?? "").trim();
  const descricaoDiligencia = String(formData.get("descricaoDiligencia") ?? "").trim();
  const artefatosAfetados = formData.getAll("artefatosAfetados").map((v) => String(v));

  if (!numeroParecerSei || !dataParecer || !descricaoDiligencia) {
    return { erro: "Informe o nº do Parecer SEI da AJUR/PGE, a data e o resumo das diligências." };
  }
  if (artefatosAfetados.length === 0) {
    return { erro: "Selecione ao menos um artefato/subsistema que precisará ser reaberto para ajuste." };
  }

  await prisma.diligenciaJuridica.create({
    data: {
      consolidacaoTecnicaId,
      numeroParecerSei,
      dataParecer: new Date(dataParecer),
      descricaoDiligencia,
      artefatosAfetados,
      status: "ABERTA",
    },
  });

  // Reabre seletivamente cada artefato marcado (muda status para RASCUNHO)
  if (artefatosAfetados.includes("ETP")) {
    await prisma.estudoTecnicoPreliminar.updateMany({
      where: { consolidacaoTecnicaId },
      data: { status: "RASCUNHO", finalizadoEm: null },
    });
  }
  if (artefatosAfetados.includes("MAPA_RISCOS")) {
    await prisma.analiseRiscos.updateMany({
      where: { consolidacaoTecnicaId },
      data: { status: "RASCUNHO", finalizadoEm: null },
    });
  }
  if (artefatosAfetados.includes("PESQUISA_PRECOS")) {
    await prisma.pesquisaDePrecos.updateMany({
      where: { consolidacaoTecnicaId },
      data: { status: "RASCUNHO", finalizadoEm: null },
    });
  }
  if (artefatosAfetados.includes("TERMO_REFERENCIA")) {
    await prisma.termoReferencia.updateMany({
      where: { consolidacaoTecnicaId },
      data: { status: "RASCUNHO", finalizadoEm: null },
    });
  }
  if (artefatosAfetados.includes("MINUTA_EDITAL")) {
    await prisma.minutaEdital.updateMany({
      where: { consolidacaoTecnicaId },
      data: { status: "RASCUNHO", finalizadoEm: null },
    });
  }
  if (artefatosAfetados.includes("MINUTA_CONTRATO")) {
    await prisma.minutaContrato.updateMany({
      where: { consolidacaoTecnicaId },
      data: { status: "RASCUNHO", finalizadoEm: null },
    });
  }
  if (artefatosAfetados.includes("MINUTA_ATA")) {
    await prisma.minutaAta.updateMany({
      where: { consolidacaoTecnicaId },
      data: { status: "RASCUNHO", finalizadoEm: null },
    });
  }

  // Registra na timeline o status DILIGENCIAS_PGE
  await prisma.statusLicitacao.create({
    data: {
      consolidacaoId: consolidacaoTecnicaId,
      status: "DILIGENCIAS_PGE",
      responsavel: `Parecer ${numeroParecerSei} (${artefatosAfetados.join(", ")})`,
    },
  });

  revalidatePath(`/licitacoes/${consolidacaoTecnicaId}`);
  revalidatePath("/");
  return {};
}

export async function concluirDiligenciaJuridicaAction(
  diligenciaId: string,
  consolidacaoTecnicaId: string,
): Promise<ResultadoAcao> {
  const sessao = await obterSessao();
  if (!sessao || !["ADMIN", "LICITACOES", "AGENTE_CONTRATACAO"].includes(sessao.tipo)) {
    return { erro: "Acesso restrito." };
  }

  await prisma.diligenciaJuridica.update({
    where: { id: diligenciaId },
    data: { status: "CONCLUIDA", atendidaEm: new Date() },
  });

  revalidatePath(`/licitacoes/${consolidacaoTecnicaId}`);
  return {};
}

// ---------------------------------------------------------------------------
// 5. Edital Definitivo + Aprovação da Autoridade (no SEI) + Publicação no PNCP
// ---------------------------------------------------------------------------

export async function registrarEditalDefinitivoEPublicacaoAction(
  consolidacaoTecnicaId: string,
  formData: FormData,
): Promise<ResultadoAcao> {
  const sessao = await obterSessao();
  if (!sessao || !["ADMIN", "LICITACOES", "AGENTE_CONTRATACAO"].includes(sessao.tipo)) {
    return { erro: "Acesso restrito a Licitações / Agente de Contratação." };
  }

  const editalDefinitivoObservacoes = String(formData.get("editalDefinitivoObservacoes") ?? "").trim() || null;
  const aprovacaoAutoridadeSei = String(formData.get("aprovacaoAutoridadeSei") ?? "").trim();
  const aprovacaoAutoridadeData = String(formData.get("aprovacaoAutoridadeData") ?? "").trim();
  const publicacaoPncpCodigo = String(formData.get("publicacaoPncpCodigo") ?? "").trim();
  const publicacaoPncpData = String(formData.get("publicacaoPncpData") ?? "").trim();
  const dataSessao = String(formData.get("dataSessao") ?? "").trim();
  const agenteNome = String(formData.get("agenteNome") ?? sessao.nome).trim();
  const agenteMatricula = String(formData.get("agenteMatricula") ?? "").trim() || null;

  if (!aprovacaoAutoridadeSei || !publicacaoPncpCodigo || !dataSessao) {
    return {
      erro: "Informe o documento SEI de aprovação pela autoridade competente, o código de publicação no PNCP e a data da sessão.",
    };
  }

  await prisma.consolidacaoTecnica.update({
    where: { id: consolidacaoTecnicaId },
    data: {
      editalDefinitivoGeradoEm: new Date(),
      editalDefinitivoObservacoes,
      aprovacaoAutoridadeSei,
      aprovacaoAutoridadeData: aprovacaoAutoridadeData ? new Date(aprovacaoAutoridadeData) : new Date(),
      publicacaoPncpCodigo,
      publicacaoPncpData: publicacaoPncpData ? new Date(publicacaoPncpData) : new Date(),
    },
  });

  await prisma.statusLicitacao.create({
    data: {
      consolidacaoId: consolidacaoTecnicaId,
      status: "SESSAO_MARCADA",
      dataSessao: new Date(dataSessao),
      agenteNome,
      agenteMatricula,
      responsavel: `PNCP: ${publicacaoPncpCodigo} | Aprovação SEI: ${aprovacaoAutoridadeSei}`,
    },
  });

  revalidatePath(`/licitacoes/${consolidacaoTecnicaId}`);
  revalidatePath("/");
  return {};
}

// ---------------------------------------------------------------------------
// 6. Integração Direta via API REST Oficial do PNCP (PCA e Editais)
// ---------------------------------------------------------------------------

/**
 * Publica o PCA diretamente na API do PNCP (quando as credenciais da STI/UERN
 * estiverem configuradas no `.env`) e em seguida encaminha os itens para o ETP/Riscos.
 * Enquanto não estiver configurada, retorna mensagem orientando o uso do registro manual.
 */
export async function publicarPcaViaApiPncpAction(ano: number): Promise<ResultadoAcao> {
  await exigirAdmin();
  const config = verificarConfiguracaoPncp();
  if (!config.configurado) {
    return {
      erro: config.mensagem,
    };
  }

  const itensAprovados = await prisma.itemDfd.findMany({
    where: { dfd: { ano, status: "APROVADO" } },
    include: { categoria: true, dfd: { include: { unidade: true } } },
  });

  if (itensAprovados.length === 0) {
    return { erro: "Não há itens de DFDs aprovados neste PCA para enviar ao PNCP." };
  }

  try {
    const resApi = await publicarPcaNoPncpApi(
      ano,
      itensAprovados.map((it, idx) => ({
        numeroItem: idx + 1,
        categoriaItemPca: it.categoria.tipo === "SERVICO" ? 2 : 1,
        descricao: it.itemCatalogoNome || it.itemNomeLivre || it.categoria.nome,
        unidadeFornecimento: "UN",
        quantidade: Number(it.quantidade ?? 1),
        valorUnitario: Number(it.valorUnit ?? it.valorTotal),
        valorTotal: Number(it.valorTotal),
        valorOrcamentoExercicio: Number(it.valorTotal),
        dataDesejada: new Date(ano, 5, 30).toISOString().slice(0, 10),
        unidadeRequisitante: it.dfd.unidade.nome,
      })),
    );

    const fd = new FormData();
    fd.set("ano", String(ano));
    fd.set("codigoPcaPadrao", resApi.sequencialPcaPncp || `PCA-${ano}-PNCP-API`);
    return publicarPcaEEncaminharParaEtpAction(fd);
  } catch (err) {
    return { erro: err instanceof Error ? err.message : "Erro ao comunicar com a API do PNCP." };
  }
}

/**
 * Publica o Edital Definitivo diretamente na API do PNCP (quando as credenciais da STI/UERN
 * estiverem configuradas no `.env`). Enquanto não estiver configurada, retorna mensagem
 * orientando o uso do lançamento manual.
 */
export async function publicarEditalViaApiPncpAction(
  consolidacaoTecnicaId: string,
  aprovacaoAutoridadeSei?: string,
  dataSessao?: string,
): Promise<ResultadoAcao> {
  const sessao = await obterSessao();
  if (!sessao || !["ADMIN", "LICITACOES", "AGENTE_CONTRATACAO"].includes(sessao.tipo)) {
    return { erro: "Acesso restrito a Licitações / Agente de Contratação." };
  }

  const config = verificarConfiguracaoPncp();
  if (!config.configurado) {
    return {
      erro: config.mensagem,
    };
  }

  const consolidacao = await prisma.consolidacaoTecnica.findUnique({
    where: { id: consolidacaoTecnicaId },
    include: {
      categoria: true,
      itensDfd: true,
      termoReferencia: true,
    },
  });

  if (!consolidacao) {
    return { erro: "Processo consolidado não encontrado." };
  }

  const agora = new Date();
  const abertura = dataSessao ? new Date(dataSessao) : new Date(agora.getTime() + 10 * 24 * 60 * 60 * 1000);

  try {
    const resApi = await publicarEditalNoPncpApi({
      anoCompra: consolidacao.pcaAno ?? agora.getFullYear(),
      processoSei: consolidacao.processoSEI,
      modalidadeId: 6, // Pregão Eletrônico
      modoDisputaId: 1, // Aberto
      objetoCompra: `Contratação referente à categoria ${consolidacao.categoria.nome} (${consolidacao.processoSEI})`,
      srp: consolidacao.tipoContratacao === "ATA",
      dataAberturaProposta: agora.toISOString(),
      dataEncerramentoProposta: abertura.toISOString(),
      itensCompra: consolidacao.itensDfd.map((it, idx) => {
        const qtd = Number(it.quantidade ?? 1);
        const unitario = Number(it.valorUnit ?? it.valorTotal);
        return {
          numeroItem: idx + 1,
          materialOuServico: consolidacao.categoria.tipo === "SERVICO" ? "S" : "M",
          descricao: it.itemCatalogoNome || it.itemNomeLivre || consolidacao.categoria.nome,
          quantidade: qtd,
          unidadeMedida: "UN",
          valorUnitarioEstimado: unitario,
          valorTotal: Number((unitario * qtd).toFixed(2)),
        };
      }),
    });

    const codigoGerado = resApi.codigoControlePncp || `PNCP-API-${Date.now()}`;

    const fd = new FormData();
    fd.set("aprovacaoAutoridadeSei", aprovacaoAutoridadeSei || "Aprovado no SEI");
    fd.set("publicacaoPncpCodigo", codigoGerado);
    fd.set("dataSessao", abertura.toISOString().slice(0, 10));
    fd.set("agenteNome", sessao.nome);
    fd.set("editalDefinitivoObservacoes", `Publicado via integração automática API PNCP (${codigoGerado})`);

    return registrarEditalDefinitivoEPublicacaoAction(consolidacaoTecnicaId, fd);
  } catch (err) {
    return { erro: err instanceof Error ? err.message : "Erro ao comunicar com a API do PNCP." };
  }
}

