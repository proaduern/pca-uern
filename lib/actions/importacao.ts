"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirAdmin, gerarHashSenha } from "@/lib/auth";
import {
  lerPlanilha,
  lerPlanilhaPosicional,
  paraBooleano,
  paraNumero,
  type ResultadoImportacao,
} from "@/lib/importacao";
import {
  categoriaFluxoContinuo,
  classificarTipoBemImportacao,
  classificarTipoCategoriaImportacao,
  extrairPrioridadeImportacao,
  mapearEnquadramentoImportacao,
  mapearNaturezaImportacao,
  normalizarNomeCategoria,
  ordemPrioridadeImportacao,
} from "@/lib/importacao-dfds";
import { DESCRICAO_SUMARIA_MAX, JUSTIFICATIVA_MIN } from "@/lib/dfd-validacao";
import type { Enquadramento, NivelPrioridade, TipoDemanda, TipoItemDfd } from "@prisma/client";

const TAMANHO_MAXIMO_BYTES = 5 * 1024 * 1024; // 5 MB

async function obterLinhas(formData: FormData) {
  const arquivo = formData.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    throw new Error("Selecione um arquivo de planilha (.xlsx, .xls ou .csv).");
  }
  if (arquivo.size > TAMANHO_MAXIMO_BYTES) {
    throw new Error("O arquivo excede o limite de 5 MB.");
  }
  const buffer = await arquivo.arrayBuffer();
  const linhas = await lerPlanilha(arquivo.name, buffer);
  if (linhas.length === 0) throw new Error("A planilha está vazia.");
  return linhas;
}

function mensagemDeErro(e: unknown, duplicidade: string): string {
  const mensagem = e instanceof Error ? e.message : "erro desconhecido.";
  return mensagem.includes("Unique constraint") ? duplicidade : mensagem;
}

export async function importarUnidadesAction(formData: FormData): Promise<ResultadoImportacao> {
  await exigirAdmin();
  const linhas = await obterLinhas(formData);
  const erros: ResultadoImportacao["erros"] = [];
  let sucesso = 0;

  for (const { linha, dados } of linhas) {
    try {
      const nome = (dados.nome ?? "").trim();
      const email = (dados.email ?? "").trim().toLowerCase();
      const senhaInicial = (dados.senhaInicial ?? "").trim();
      if (!nome || !email || !senhaInicial) {
        throw new Error("preencha nome, email e senhaInicial.");
      }
      if (!email.endsWith("@uern.br")) {
        throw new Error("o email precisa ser do domínio @uern.br.");
      }
      const senhaHash = await gerarHashSenha(senhaInicial);
      const cotaTipo = (dados.cotaTipo?.trim().toUpperCase() || "FECHADA") as "FECHADA" | "ABERTA";
      if (!["FECHADA", "ABERTA"].includes(cotaTipo)) {
        throw new Error('cotaTipo precisa ser "FECHADA" ou "ABERTA".');
      }
      await prisma.unidade.create({
        data: {
          nome,
          email,
          senhaHash,
          senhaTemporaria: true,
          elegivelCotaOP: paraBooleano(dados.elegivelCotaOP),
          cotaOP: paraNumero(dados.cotaOP),
          cotaGeral: paraNumero(dados.cotaGeral),
          cotaTipo,
          verCotaGeralPCA: paraBooleano(dados.verCotaGeralPCA),
        },
      });
      sucesso++;
    } catch (e) {
      erros.push({ linha, mensagem: mensagemDeErro(e, "já existe uma unidade com este email.") });
    }
  }

  revalidatePath("/admin/unidades");
  return { sucesso, erros };
}

export async function importarCategoriasAction(formData: FormData): Promise<ResultadoImportacao> {
  await exigirAdmin();
  const linhas = await obterLinhas(formData);
  const erros: ResultadoImportacao["erros"] = [];
  let sucesso = 0;

  for (const { linha, dados } of linhas) {
    try {
      const nome = (dados.nome ?? "").trim();
      if (!nome) throw new Error("preencha o nome.");
      const tipo = (dados.tipo?.trim().toUpperCase() || "MATERIAL") as "MATERIAL" | "SERVICO";
      if (!["MATERIAL", "SERVICO"].includes(tipo)) {
        throw new Error('tipo precisa ser "MATERIAL" ou "SERVICO".');
      }
      const modoServico = (dados.modoServico?.trim().toUpperCase() || "OBJETO") as
        | "OBJETO"
        | "VALOR"
        | "ITENS";
      if (!["OBJETO", "VALOR", "ITENS"].includes(modoServico)) {
        throw new Error('modoServico precisa ser "OBJETO", "VALOR" ou "ITENS".');
      }
      const saldoAnualGlobalTexto = (dados.saldoAnualGlobal ?? "").trim();
      await prisma.categoria.create({
        data: {
          nome,
          tipo,
          modoServico,
          semItem: paraBooleano(dados.semItem),
          fluxoContinuo: paraBooleano(dados.fluxoContinuo),
          dependeContrato: paraBooleano(dados.dependeContrato),
          ignoraPCA: paraBooleano(dados.ignoraPCA),
          saldoAnualGlobal: saldoAnualGlobalTexto ? paraNumero(saldoAnualGlobalTexto) : null,
        },
      });
      sucesso++;
    } catch (e) {
      erros.push({ linha, mensagem: mensagemDeErro(e, "já existe uma categoria com este nome.") });
    }
  }

  revalidatePath("/admin/categorias");
  return { sucesso, erros };
}

export async function importarItensCatalogoAction(formData: FormData): Promise<ResultadoImportacao> {
  await exigirAdmin();
  const linhas = await obterLinhas(formData);
  const categorias = await prisma.categoria.findMany({ where: { semItem: false } });
  const mapaCategorias = new Map(categorias.map((c) => [c.nome.trim().toLowerCase(), c.id]));
  const erros: ResultadoImportacao["erros"] = [];
  let sucesso = 0;

  for (const { linha, dados } of linhas) {
    try {
      const nomeCategoria = (dados.categoria ?? "").trim();
      const categoriaId = mapaCategorias.get(nomeCategoria.toLowerCase());
      if (!categoriaId) {
        throw new Error(`categoria "${nomeCategoria}" não encontrada (ou é uma categoria "sem catálogo").`);
      }
      const item = (dados.item ?? "").trim();
      const valor = paraNumero(dados.valor);
      if (!item) throw new Error("preencha o nome do item.");
      if (!(valor > 0)) throw new Error("o valor precisa ser maior que zero.");
      const tipoBem = (dados.tipoBem?.trim().toUpperCase() || "PERMANENTE") as "CONSUMO" | "PERMANENTE";
      if (!["CONSUMO", "PERMANENTE"].includes(tipoBem)) {
        throw new Error('tipoBem precisa ser "CONSUMO" ou "PERMANENTE".');
      }
      await prisma.itemCatalogo.create({ data: { categoriaId, item, valor, tipoBem } });
      sucesso++;
    } catch (e) {
      erros.push({ linha, mensagem: mensagemDeErro(e, "erro ao gravar o item.") });
    }
  }

  revalidatePath("/admin/catalogo");
  return { sucesso, erros };
}

// ---------------------------------------------------------------------------
// Importação em lote de DFDs (PCA consolidado por planilha) — migração de
// dados históricos. Formato de planilha e regras extraídos literalmente do
// sistema original: colunas fixas por posição (A, C, D, H, I, J, K, L, M, N,
// O, P, Q — B, E, F e G existem mas não são lidas), cabeçalho na linha 1,
// dados a partir da linha 2. Cada combinação Unidade+Categoria vira um DFD
// (um item por linha da planilha); Diárias/Passagens/Hospedagens agrupam só
// por unidade, como fluxo contínuo. Os DFDs entram diretamente como
// "aguardando aprovação" — igual a qualquer DFD normal, os valores já
// entram no cálculo de saldo antes da revisão da PROAD (a importação não
// passa pelas checagens de cota/saldo do lançamento interativo).
export interface ResultadoImportacaoDfds {
  dfdsCriados: number;
  itensCriados: number;
  catalogoNovo: number;
  tipificacoesNovas: number;
  prioridadesNovas: number;
  erros: { linha: number; mensagem: string }[];
}

const NIVEL_ENUM_IMPORT: Record<string, NivelPrioridade> = {
  altíssima: "ALTISSIMA",
  alta: "ALTA",
  média: "MEDIA",
  media: "MEDIA",
  baixa: "BAIXA",
};

interface LinhaComumImport {
  numeroLinha: number;
  valorUnitEfetivo: number;
  valorTotal: number;
  nivelPrioridadeTexto: string;
  tipificacaoProblema: string;
  fonteRecurso: string;
  observacoes: string;
}
interface LinhaGeralImport extends LinhaComumImport {
  item: string;
  quantidade: number;
  modalidade: string;
  especAdicional: string;
  setor: string;
}
interface LinhaFluxoImport extends LinhaComumImport {
  categoria: string;
}

export async function importarDfdsPcaAction(formData: FormData): Promise<ResultadoImportacaoDfds> {
  const sessao = await exigirAdmin();

  const anoPcaTexto = String(formData.get("anoPca") ?? "").trim();
  const anoPca = Number(anoPcaTexto);
  if (!anoPcaTexto || !Number.isInteger(anoPca)) {
    throw new Error("Informe o ano do PCA.");
  }

  const arquivo = formData.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    throw new Error("Selecione o arquivo da planilha (.xlsx, .xls ou .csv).");
  }
  if (arquivo.size > TAMANHO_MAXIMO_BYTES) {
    throw new Error("O arquivo excede o limite de 5 MB.");
  }
  const buffer = await arquivo.arrayBuffer();
  const linhas = await lerPlanilhaPosicional(arquivo.name, buffer);

  const erros: ResultadoImportacaoDfds["erros"] = [];
  let dfdsCriados = 0;
  let itensCriados = 0;
  let catalogoNovo = 0;
  let tipificacoesNovas = 0;
  let prioridadesNovas = 0;

  const unidades = await prisma.unidade.findMany();
  const mapaUnidades = new Map(unidades.map((u) => [u.nome.trim().toLowerCase(), u]));

  const gruposGeral = new Map<
    string,
    { unidadeId: string; unidadeNome: string; categoria: string; linhas: LinhaGeralImport[] }
  >();
  const gruposFluxo = new Map<
    string,
    { unidadeId: string; unidadeNome: string; linhas: LinhaFluxoImport[] }
  >();

  for (const { linha: numeroLinha, valores } of linhas) {
    const categoria = normalizarNomeCategoria(valores[8]); // coluna I
    if (!categoria) continue; // linha sem categoria: ignorada silenciosamente, igual ao sistema original

    const nomeDemandante = (valores[0] ?? "").trim(); // coluna A
    const unidade = mapaUnidades.get(nomeDemandante.toLowerCase());
    if (!unidade) {
      erros.push({
        linha: numeroLinha,
        mensagem: `Unidade demandante "${nomeDemandante}" não encontrada no cadastro.`,
      });
      continue;
    }

    const valorUnitBruto = paraNumero(valores[13]); // coluna N
    const quantidade = paraNumero(valores[10]) || 1; // coluna K
    const valorTotal = paraNumero(valores[14]) || valorUnitBruto * quantidade; // coluna O
    if (valorUnitBruto <= 0 && valorTotal <= 0) {
      erros.push({ linha: numeroLinha, mensagem: "Sem valor unitário nem valor total informado." });
      continue;
    }
    const valorUnitEfetivo = valorUnitBruto > 0 ? valorUnitBruto : valorTotal / quantidade;

    const comum: LinhaComumImport = {
      numeroLinha,
      valorUnitEfetivo,
      valorTotal,
      nivelPrioridadeTexto: valores[11] ?? "", // coluna L
      tipificacaoProblema: (valores[12] ?? "").trim(), // coluna M
      fonteRecurso: valores[3] ?? "", // coluna D
      observacoes: (valores[15] ?? "").trim(), // coluna P
    };

    const categoriaFluxo = categoriaFluxoContinuo(categoria);
    if (categoriaFluxo) {
      const chave = unidade.id;
      if (!gruposFluxo.has(chave)) {
        gruposFluxo.set(chave, { unidadeId: unidade.id, unidadeNome: unidade.nome, linhas: [] });
      }
      gruposFluxo.get(chave)!.linhas.push({ ...comum, categoria: categoriaFluxo });
    } else {
      const item = normalizarNomeCategoria(valores[9]); // coluna J
      const chave = unidade.id + "|" + categoria;
      if (!gruposGeral.has(chave)) {
        gruposGeral.set(chave, { unidadeId: unidade.id, unidadeNome: unidade.nome, categoria, linhas: [] });
      }
      gruposGeral.get(chave)!.linhas.push({
        ...comum,
        item,
        quantidade,
        modalidade: valores[7] ?? "", // coluna H
        especAdicional: (valores[16] ?? "").trim(), // coluna Q
        setor: (valores[2] ?? "").trim(), // coluna C
      });
    }
  }

  const tipificacaoCache = new Map<string, string>();
  async function garantirTipificacaoId(nome: string | null): Promise<string | null> {
    if (!nome) return null;
    const chave = nome.toLowerCase();
    const emCache = tipificacaoCache.get(chave);
    if (emCache) return emCache;
    const existente = await prisma.tipificacao.findFirst({
      where: { nome: { equals: nome, mode: "insensitive" } },
    });
    let id: string;
    if (existente) {
      id = existente.id;
    } else {
      id = (await prisma.tipificacao.create({ data: { nome } })).id;
      tipificacoesNovas++;
    }
    tipificacaoCache.set(chave, id);
    return id;
  }

  const prioridadeCache = new Map<string, string>();
  async function garantirPrioridadeId(frase: string, nivel: string): Promise<string> {
    const chave = frase.toLowerCase();
    const emCache = prioridadeCache.get(chave);
    if (emCache) return emCache;
    const existente = await prisma.prioridade.findFirst({
      where: { frase: { equals: frase, mode: "insensitive" } },
    });
    let id: string;
    if (existente) {
      id = existente.id;
    } else {
      const nivelEnum = NIVEL_ENUM_IMPORT[nivel.toLowerCase()] ?? "MEDIA";
      id = (await prisma.prioridade.create({ data: { frase, nivel: nivelEnum } })).id;
      prioridadesNovas++;
    }
    prioridadeCache.set(chave, id);
    return id;
  }

  async function prioridadeETipificacaoDoGrupo(linhasGrupo: LinhaComumImport[]) {
    let melhor = { nivel: "Média", ordem: 2, frase: "Média" };
    const necessidades = new Map<string, number>();
    for (const l of linhasGrupo) {
      const { nivel, frase } = extrairPrioridadeImportacao(l.nivelPrioridadeTexto);
      const ordem = ordemPrioridadeImportacao(nivel);
      if (ordem > melhor.ordem) melhor = { nivel, ordem, frase };
      if (l.tipificacaoProblema) {
        necessidades.set(l.tipificacaoProblema, (necessidades.get(l.tipificacaoProblema) ?? 0) + 1);
      }
    }
    const dominante = [...necessidades.entries()].sort((a, b) => b[1] - a[1])[0];
    const [prioridadeId, tipificacaoId] = await Promise.all([
      garantirPrioridadeId(melhor.frase, melhor.nivel),
      garantirTipificacaoId(dominante ? dominante[0] : null),
    ]);
    return { prioridadeId, tipificacaoId, necessidadesDistintas: [...necessidades.keys()] };
  }

  const categoriaCache = new Map<string, string>();
  async function garantirCategoriaGeral(nome: string, tipo: "MATERIAL" | "SERVICO"): Promise<string> {
    const chave = nome.toLowerCase();
    const emCache = categoriaCache.get(chave);
    if (emCache) return emCache;
    const existente = await prisma.categoria.findFirst({
      where: { nome: { equals: nome, mode: "insensitive" } },
    });
    const id =
      existente?.id ??
      (
        await prisma.categoria.create({
          data: {
            nome,
            tipo,
            semItem: false,
            modoServico: "OBJETO",
            fluxoContinuo: false,
            dependeContrato: true,
            ignoraPCA: false,
          },
        })
      ).id;
    categoriaCache.set(chave, id);
    return id;
  }

  async function garantirCategoriaFluxo(nome: string): Promise<string> {
    const chave = nome.toLowerCase();
    const emCache = categoriaCache.get(chave);
    if (emCache) return emCache;
    const existente = await prisma.categoria.findFirst({
      where: { nome: { equals: nome, mode: "insensitive" } },
    });
    const id =
      existente?.id ??
      (
        await prisma.categoria.create({
          data: {
            nome,
            tipo: "SERVICO",
            modoServico: "VALOR",
            semItem: false,
            fluxoContinuo: true,
            dependeContrato: false,
            ignoraPCA: false,
          },
        })
      ).id;
    categoriaCache.set(chave, id);
    return id;
  }

  const catalogoExisteCache = new Set<string>();
  async function garantirItemCatalogoExiste(
    categoriaId: string,
    nomeItem: string,
    valorUnit: number,
    tipoBem: "CONSUMO" | "PERMANENTE",
  ) {
    const chave = categoriaId + "|" + nomeItem.toLowerCase();
    if (catalogoExisteCache.has(chave)) return;
    const existente = await prisma.itemCatalogo.findFirst({
      where: { categoriaId, item: { equals: nomeItem, mode: "insensitive" } },
    });
    if (!existente) {
      await prisma.itemCatalogo.create({ data: { categoriaId, item: nomeItem, valor: valorUnit, tipoBem } });
      catalogoNovo++;
    }
    catalogoExisteCache.add(chave);
  }

  const dataDesejadaPadrao = new Date(Date.UTC(anoPca, 7, 30)); // 30 de agosto do ano do PCA

  for (const grupo of gruposGeral.values()) {
    try {
      const tipoCategoria = classificarTipoCategoriaImportacao(grupo.categoria);
      const categoriaId = await garantirCategoriaGeral(grupo.categoria, tipoCategoria);
      const { prioridadeId, tipificacaoId, necessidadesDistintas } = await prioridadeETipificacaoDoGrupo(
        grupo.linhas,
      );

      const contagemModalidade = new Map<string, number>();
      for (const l of grupo.linhas) {
        const nat = mapearNaturezaImportacao(l.modalidade);
        contagemModalidade.set(nat, (contagemModalidade.get(nat) ?? 0) + 1);
      }
      const naturezaFinal = [...contagemModalidade.entries()].sort((a, b) => b[1] - a[1])[0][0] as TipoDemanda;

      let justificativa =
        `Demanda consolidada da unidade ${grupo.unidadeNome} para a categoria "${grupo.categoria}", ` +
        `no âmbito do levantamento de necessidades do PCA ${anoPca}. ` +
        `Necessidades identificadas: ${necessidadesDistintas.join("; ")}.`;
      if (justificativa.length < JUSTIFICATIVA_MIN) {
        justificativa +=
          " Demanda importada a partir do levantamento consolidado de necessidades das unidades para o Plano de Contratações Anual.";
      }

      const setores = [...new Set(grupo.linhas.map((l) => l.setor).filter(Boolean))];
      const descricaoSumaria = (
        grupo.categoria + (setores.length ? " — " + setores.join(", ") : "")
      ).slice(0, DESCRICAO_SUMARIA_MAX);

      const itensData: {
        tipo: TipoItemDfd;
        enquadramento: Enquadramento;
        categoriaId: string;
        itemCatalogoNome: string | null;
        itemNomeLivre: string | null;
        tipoBem: "CONSUMO" | "PERMANENTE" | null;
        quantidade: number | null;
        valorUnit: number | null;
        valorTotal: number;
        correlacao: string;
      }[] = [];

      for (const l of grupo.linhas) {
        const correlacao =
          l.especAdicional ||
          l.observacoes ||
          `Conforme detalhamento técnico do levantamento de demandas do PCA ${anoPca}.`;
        const enquadramento = mapearEnquadramentoImportacao(l.fonteRecurso);
        const tipoBem = classificarTipoBemImportacao(grupo.categoria);

        if (tipoCategoria === "MATERIAL") {
          const nomeItem = l.item || grupo.categoria;
          await garantirItemCatalogoExiste(categoriaId, nomeItem, l.valorUnitEfetivo, tipoBem);
          itensData.push({
            tipo: "MATERIAL",
            enquadramento,
            categoriaId,
            itemCatalogoNome: nomeItem,
            itemNomeLivre: null,
            tipoBem,
            quantidade: l.quantidade,
            valorUnit: l.valorUnitEfetivo,
            valorTotal: l.valorTotal,
            correlacao,
          });
        } else {
          itensData.push({
            tipo: "SERVICO",
            enquadramento,
            categoriaId,
            itemCatalogoNome: null,
            itemNomeLivre: l.item || grupo.categoria,
            tipoBem: null,
            quantidade: null,
            valorUnit: null,
            valorTotal: l.valorTotal,
            correlacao,
          });
        }
      }

      await prisma.dfd.create({
        data: {
          unidadeId: grupo.unidadeId,
          ano: anoPca,
          descricaoSumaria,
          tipificacaoId,
          prioridadeId,
          justificativa,
          tipoDemanda: naturezaFinal,
          dataEntrega: naturezaFinal === "NOVA" ? dataDesejadaPadrao : null,
          dataRenovacao: naturezaFinal === "RENOVACAO" ? dataDesejadaPadrao : null,
          status: "AGUARDANDO_APROVACAO",
          enviadoParaAprovacaoEm: new Date(),
          criadoPorId: sessao.id,
          itens: { create: itensData },
        },
      });
      dfdsCriados++;
      itensCriados += itensData.length;
    } catch (e) {
      erros.push({
        linha: grupo.linhas[0]?.numeroLinha ?? 0,
        mensagem: `Falha ao criar o DFD de "${grupo.unidadeNome}" / "${grupo.categoria}": ${
          e instanceof Error ? e.message : "erro desconhecido."
        }`,
      });
    }
  }

  for (const grupo of gruposFluxo.values()) {
    try {
      const { prioridadeId, tipificacaoId, necessidadesDistintas } = await prioridadeETipificacaoDoGrupo(
        grupo.linhas,
      );
      let justificativa =
        `Demanda consolidada de Diárias, Passagens e Hospedagens da unidade ${grupo.unidadeNome} ` +
        `para o PCA ${anoPca}. Necessidades identificadas: ${necessidadesDistintas.join("; ")}.`;
      if (justificativa.length < JUSTIFICATIVA_MIN) {
        justificativa +=
          " Demanda de fluxo contínuo importada a partir do levantamento consolidado do Plano de Contratações Anual.";
      }
      const descricaoSumaria = `Diárias, Passagens e Hospedagens — ${grupo.unidadeNome}`.slice(
        0,
        DESCRICAO_SUMARIA_MAX,
      );

      const itensData = [];
      for (const l of grupo.linhas) {
        const categoriaId = await garantirCategoriaFluxo(l.categoria);
        itensData.push({
          tipo: "SERVICO" as TipoItemDfd,
          enquadramento: mapearEnquadramentoImportacao(l.fonteRecurso),
          categoriaId,
          itemCatalogoNome: null,
          itemNomeLivre: l.categoria,
          tipoBem: null,
          quantidade: null,
          valorUnit: null,
          valorTotal: l.valorTotal,
          correlacao:
            l.observacoes || `Conforme detalhamento técnico do levantamento de demandas do PCA ${anoPca}.`,
        });
      }

      await prisma.dfd.create({
        data: {
          unidadeId: grupo.unidadeId,
          ano: anoPca,
          descricaoSumaria,
          tipificacaoId,
          prioridadeId,
          justificativa,
          tipoDemanda: "FLUXO_CONTINUO",
          dataEntrega: dataDesejadaPadrao,
          dataRenovacao: null,
          status: "AGUARDANDO_APROVACAO",
          enviadoParaAprovacaoEm: new Date(),
          criadoPorId: sessao.id,
          itens: { create: itensData },
        },
      });
      dfdsCriados++;
      itensCriados += itensData.length;
    } catch (e) {
      erros.push({
        linha: grupo.linhas[0]?.numeroLinha ?? 0,
        mensagem: `Falha ao criar o DFD de fluxo contínuo de "${grupo.unidadeNome}": ${
          e instanceof Error ? e.message : "erro desconhecido."
        }`,
      });
    }
  }

  revalidatePath("/admin/demandas");
  revalidatePath("/");
  return { dfdsCriados, itensCriados, catalogoNovo, tipificacoesNovas, prioridadesNovas, erros };
}
