import { arredondarCentavos } from "./cota";

const MODALIDADE_LABEL: Record<string, string> = {
  RENOVACAO: "Renovação Contratual",
  NOVA: "Contratação",
  FLUXO_CONTINUO: "Fluxo Contínuo",
};

export interface ItemDfdParaConsolidado {
  enquadramento: "OP" | "GERAL" | "CONVENIO" | "RECURSOS_EXTRA";
  valorTotal: number;
  tipoDemanda: "RENOVACAO" | "NOVA" | "FLUXO_CONTINUO";
}

export interface ConsolidacaoParaLinha {
  categoriaNome: string;
  classificacaoRubrica: string | null;
  codigoPncp: string | null;
  itensDfd: ItemDfdParaConsolidado[];
  /** Itens adicionados pelo Setor Técnico (sem demandante/enquadramento próprio) — contam como Fonte 500. */
  valorItensTecnicos: number;
}

export interface LinhaConsolidado {
  classificacaoRubrica: string;
  modalidade: string;
  categoriaNome: string;
  convenio: number;
  recursosExtra: number;
  fonte500: number;
  total: number;
  codigoPncp: string | null;
}

/** Modalidade da linha: rótulo único se todos os itens do DFD concordam, "Diversos" se
 * a consolidação mistura tipos de demanda diferentes, "—" se não há item de DFD (só técnico). */
function modalidadeDaLinha(itens: ItemDfdParaConsolidado[]): string {
  const distintos = new Set(itens.map((it) => MODALIDADE_LABEL[it.tipoDemanda]));
  if (distintos.size === 0) return "—";
  if (distintos.size === 1) return [...distintos][0];
  return "Diversos";
}

export function montarLinhaConsolidado(c: ConsolidacaoParaLinha): LinhaConsolidado {
  let convenio = 0;
  let fonte500 = c.valorItensTecnicos;
  let recursosExtra = 0;
  for (const it of c.itensDfd) {
    if (it.enquadramento === "CONVENIO") convenio += it.valorTotal;
    else if (it.enquadramento === "RECURSOS_EXTRA") recursosExtra += it.valorTotal;
    else fonte500 += it.valorTotal;
  }
  return {
    classificacaoRubrica: c.classificacaoRubrica ?? "—",
    modalidade: modalidadeDaLinha(c.itensDfd),
    categoriaNome: c.categoriaNome,
    convenio: arredondarCentavos(convenio),
    recursosExtra: arredondarCentavos(recursosExtra),
    fonte500: arredondarCentavos(fonte500),
    total: arredondarCentavos(convenio + recursosExtra + fonte500),
    codigoPncp: c.codigoPncp,
  };
}

export interface TotaisConsolidado {
  convenio: number;
  recursosExtra: number;
  fonte500: number;
  total: number;
}

export function totaisConsolidado(linhas: LinhaConsolidado[]): TotaisConsolidado {
  return {
    convenio: arredondarCentavos(linhas.reduce((s, l) => s + l.convenio, 0)),
    recursosExtra: arredondarCentavos(linhas.reduce((s, l) => s + l.recursosExtra, 0)),
    fonte500: arredondarCentavos(linhas.reduce((s, l) => s + l.fonte500, 0)),
    total: arredondarCentavos(linhas.reduce((s, l) => s + l.total, 0)),
  };
}

export function todasComCodigoPncp(linhas: LinhaConsolidado[]): boolean {
  return linhas.every((l) => !!l.codigoPncp && !!l.codigoPncp.trim());
}

// ---------------------------------------------------------------------------
// Motor de Compilação do PCA Consolidado (3 Blocos: Materiais Agrupados,
// Serviços Agrupados para fins de PCA e Serviços/Obras Separados por Demanda)
// ---------------------------------------------------------------------------

export type BlocoCompilacaoPca =
  | "MATERIAIS_AGRUPADOS"
  | "SERVICOS_AGRUPADOS"
  | "SERVICOS_E_OBRAS_POR_DEMANDA";

export interface ItemDfdParaCompilacaoPca {
  id: string;
  dfdId: string;
  dfdDescricaoSumaria: string;
  dfdIdSeiOrigem: string | null;
  dfdProcessoSeiOrigem: string | null;
  dfdTipoDemanda: "RENOVACAO" | "NOVA" | "FLUXO_CONTINUO";
  dfdStatus: string;
  unidadeNome: string;
  categoriaId: string;
  categoriaNome: string;
  categoriaTipo: "MATERIAL" | "SERVICO";
  categoriaClassificacaoRubrica: string | null;
  categoriaConsolidarPorObjeto: boolean;
  categoriaCodigoPcaPadrao: string | null;
  setorTecnicoId: string | null;
  setorTecnicoNome: string;
  enquadramento: "OP" | "GERAL" | "CONVENIO" | "RECURSOS_EXTRA";
  valorTotal: number;
  codigoPncpReferencia: string | null;
  consolidacaoCodigoPca: string | null;
}

export interface LinhaCompiladaPca extends LinhaConsolidado {
  chave: string;
  bloco: BlocoCompilacaoPca;
  categoriaIdPrincipal: string;
  categoriaBaseNome: string;
  objetoOuGrupoNome: string;
  setorTecnicoId: string | null;
  setorTecnicoNome: string;
  unidadeResumo: string;
  qtdDfds: number;
  qtdItens: number;
  dfdIds: string[];
  itensDfdIds: string[];
  ehAgrupadoPorCategoria: boolean;
  processoSeiSugerido: string | null;
}

export const CATEGORIAS_SERVICO_AGRUPADAS_PCA = new Set<string>([
  "Serviços Gráficos",
  "Serviços Serigráficos",
  "Serviços de Fornecimento de Coffee break",
  "Serviços diversos para eventos - Tendas Tamanhos Diversos",
  "Serviços diversos para eventos - Veste Talar",
  "Serviços diversos para eventos -Cerimoniais",
  "Manutenção predial",
]);

function resolverDestinoCompilacaoItem(it: ItemDfdParaCompilacaoPca): {
  chave: string;
  bloco: BlocoCompilacaoPca;
  categoriaBaseNome: string;
  objetoOuGrupoNome: string;
  ehAgrupadoPorCategoria: boolean;
} {
  // 1. Bloco I: Todas as aquisições de Bens e Materiais são agrupadas por Categoria
  if (it.categoriaTipo === "MATERIAL") {
    return {
      chave: `MAT_CAT_${it.categoriaId}`,
      bloco: "MATERIAIS_AGRUPADOS",
      categoriaBaseNome: it.categoriaNome,
      objetoOuGrupoNome: it.categoriaNome,
      ehAgrupadoPorCategoria: true,
    };
  }

  // 2. Bloco II — Adendo 1: Passagens Aéreas + Serviço emissão e entrega de bilhetes aéreos
  if (
    it.categoriaNome === "Passagens Aéreas" ||
    it.categoriaNome === "Serviço emissão e entrega de bilhetes aéreos"
  ) {
    return {
      chave: "SRV_GRUPO_PASSAGENS_AEREAS",
      bloco: "SERVICOS_AGRUPADOS",
      categoriaBaseNome: "Passagens Aéreas",
      objetoOuGrupoNome: "Passagens Aéreas / Serviço emissão e entrega de bilhetes aéreos",
      ehAgrupadoPorCategoria: true,
    };
  }

  // 3. Bloco II — Adendo 2: Hospedagens + Agenciamento de hospedagem
  if (
    it.categoriaNome === "Hospedagens" ||
    it.categoriaNome === "Agenciamento de hospedagem"
  ) {
    return {
      chave: "SRV_GRUPO_HOSPEDAGENS",
      bloco: "SERVICOS_AGRUPADOS",
      categoriaBaseNome: "Hospedagens",
      objetoOuGrupoNome: "Hospedagens / Agenciamento de hospedagem",
      ehAgrupadoPorCategoria: true,
    };
  }

  // 4. Regra especial: Serviços diversos para eventos -Logística
  //    - Locação de estande no GO!RN (PROPEG, SEI 40269316) fica separada por demanda no Bloco III.
  //    - Locação de palco (AAI) + Locação de itens diversos para eventos (PRAE) agrupam em 1 linha no Bloco II.
  if (it.categoriaNome === "Serviços diversos para eventos -Logística") {
    const ehGorn =
      /\bgorn\b|go!rn/i.test(it.dfdDescricaoSumaria) ||
      it.dfdIdSeiOrigem === "40269316";
    if (ehGorn) {
      return {
        chave: `SRV_DFD_${it.dfdId}`,
        bloco: "SERVICOS_E_OBRAS_POR_DEMANDA",
        categoriaBaseNome: it.categoriaNome,
        objetoOuGrupoNome: it.dfdDescricaoSumaria || it.categoriaNome,
        ehAgrupadoPorCategoria: false,
      };
    }
    return {
      chave: "SRV_GRUPO_EVENTOS_LOGISTICA",
      bloco: "SERVICOS_AGRUPADOS",
      categoriaBaseNome: it.categoriaNome,
      objetoOuGrupoNome:
        "Serviços diversos para eventos -Logística (Locação de palco e itens diversos para eventos)",
      ehAgrupadoPorCategoria: false,
    };
  }

  // 5. Regra especial: Serviço de Diagramação e Impressão de Livros
  //    - Diagramação de E-book/Livro da FACEM (SEI 40667573) + Campus Natal Ciências da Religião e Direito (SEI 40668325) agrupam em 1 linha no Bloco II.
  //    - Impressão de Livros (EDUERN SEI 40291337), Diagramação/Revisão/OMP (EDUERN SEI 40291404) e Diagramação de Periódicos (PROPEG SEI 40352795) ficam separados por DFD no Bloco III.
  if (it.categoriaNome === "Serviço de Diagramação e Impressão de Livros") {
    const ehDiagramacaoEbookFacemOuNatal =
      it.unidadeNome === "FACEM" ||
      it.unidadeNome === "Campus Natal" ||
      it.dfdIdSeiOrigem === "40667573" ||
      it.dfdIdSeiOrigem === "40668325";
    if (ehDiagramacaoEbookFacemOuNatal) {
      return {
        chave: "SRV_GRUPO_DIAGRAMACAO_EBOOK",
        bloco: "SERVICOS_AGRUPADOS",
        categoriaBaseNome: it.categoriaNome,
        objetoOuGrupoNome:
          "Serviço de Diagramação e Impressão de Livros — Diagramação de Livro / E-book (FACEM e Campus Natal)",
        ehAgrupadoPorCategoria: false,
      };
    }
    return {
      chave: `SRV_DFD_${it.dfdId}`,
      bloco: "SERVICOS_E_OBRAS_POR_DEMANDA",
      categoriaBaseNome: it.categoriaNome,
      objetoOuGrupoNome: it.dfdDescricaoSumaria || it.categoriaNome,
      ehAgrupadoPorCategoria: false,
    };
  }

  // 6. Bloco II: Serviços padronizados agrupados por Categoria
  if (CATEGORIAS_SERVICO_AGRUPADAS_PCA.has(it.categoriaNome)) {
    return {
      chave: `SRV_CAT_${it.categoriaId}`,
      bloco: "SERVICOS_AGRUPADOS",
      categoriaBaseNome: it.categoriaNome,
      objetoOuGrupoNome: it.categoriaNome,
      ehAgrupadoPorCategoria: true,
    };
  }

  // 7. Bloco III: Demais Serviços por Objeto e Obras — cada DFD é uma demanda / linha própria
  return {
    chave: `SRV_DFD_${it.dfdId}`,
    bloco: "SERVICOS_E_OBRAS_POR_DEMANDA",
    categoriaBaseNome: it.categoriaNome,
    objetoOuGrupoNome: it.dfdDescricaoSumaria || it.categoriaNome,
    ehAgrupadoPorCategoria: false,
  };
}

export function compilarLinhasPcaAno(itens: ItemDfdParaCompilacaoPca[]): LinhaCompiladaPca[] {
  const mapa = new Map<
    string,
    {
      chave: string;
      bloco: BlocoCompilacaoPca;
      categoriaIdPrincipal: string;
      categoriaBaseNome: string;
      objetoOuGrupoNome: string;
      classificacaoRubrica: string | null;
      setorTecnicoId: string | null;
      setorTecnicoNome: string;
      unidades: Set<string>;
      dfdIds: Set<string>;
      itensDfdIds: string[];
      itensParaConsolidado: ItemDfdParaConsolidado[];
      codigosNosItens: string[];
      codigoPadraoCategoria: string | null;
      ehAgrupadoPorCategoria: boolean;
      processoSeiSugerido: string | null;
    }
  >();

  for (const it of itens) {
    const dest = resolverDestinoCompilacaoItem(it);
    let g = mapa.get(dest.chave);
    if (!g) {
      g = {
        chave: dest.chave,
        bloco: dest.bloco,
        categoriaIdPrincipal: it.categoriaId,
        categoriaBaseNome: dest.categoriaBaseNome,
        objetoOuGrupoNome: dest.objetoOuGrupoNome,
        classificacaoRubrica: it.categoriaClassificacaoRubrica,
        setorTecnicoId: it.setorTecnicoId,
        setorTecnicoNome: it.setorTecnicoNome,
        unidades: new Set<string>(),
        dfdIds: new Set<string>(),
        itensDfdIds: [],
        itensParaConsolidado: [],
        codigosNosItens: [],
        codigoPadraoCategoria: it.categoriaCodigoPcaPadrao,
        ehAgrupadoPorCategoria: dest.ehAgrupadoPorCategoria,
        processoSeiSugerido: it.dfdProcessoSeiOrigem,
      };
      mapa.set(dest.chave, g);
    }

    g.unidades.add(it.unidadeNome);
    g.dfdIds.add(it.dfdId);
    g.itensDfdIds.push(it.id);
    g.itensParaConsolidado.push({
      enquadramento: it.enquadramento,
      valorTotal: it.valorTotal,
      tipoDemanda: it.dfdTipoDemanda,
    });

    const codItem = it.consolidacaoCodigoPca?.trim() || it.codigoPncpReferencia?.trim() || "";
    if (codItem && !g.codigosNosItens.includes(codItem)) {
      g.codigosNosItens.push(codItem);
    }
    if (!g.codigoPadraoCategoria && it.categoriaCodigoPcaPadrao?.trim()) {
      g.codigoPadraoCategoria = it.categoriaCodigoPcaPadrao.trim();
    }
    if (!g.processoSeiSugerido && it.dfdProcessoSeiOrigem) {
      g.processoSeiSugerido = it.dfdProcessoSeiOrigem;
    }
  }

  const ordemBloco: Record<BlocoCompilacaoPca, number> = {
    MATERIAIS_AGRUPADOS: 1,
    SERVICOS_AGRUPADOS: 2,
    SERVICOS_E_OBRAS_POR_DEMANDA: 3,
  };

  const linhas: LinhaCompiladaPca[] = [];
  for (const g of mapa.values()) {
    const codigoPncp =
      g.codigosNosItens[0] ||
      (g.ehAgrupadoPorCategoria ? g.codigoPadraoCategoria : null) ||
      null;

    const base = montarLinhaConsolidado({
      categoriaNome: g.objetoOuGrupoNome,
      classificacaoRubrica: g.classificacaoRubrica,
      codigoPncp,
      itensDfd: g.itensParaConsolidado,
      valorItensTecnicos: 0,
    });

    const unidadesArr = [...g.unidades];
    const unidadeResumo =
      unidadesArr.length <= 2
        ? unidadesArr.join(", ")
        : `${unidadesArr.slice(0, 2).join(", ")} (+${unidadesArr.length - 2})`;

    linhas.push({
      ...base,
      chave: g.chave,
      bloco: g.bloco,
      categoriaIdPrincipal: g.categoriaIdPrincipal,
      categoriaBaseNome: g.categoriaBaseNome,
      objetoOuGrupoNome: g.objetoOuGrupoNome,
      setorTecnicoId: g.setorTecnicoId,
      setorTecnicoNome: g.setorTecnicoNome,
      unidadeResumo,
      qtdDfds: g.dfdIds.size,
      qtdItens: g.itensDfdIds.length,
      dfdIds: [...g.dfdIds],
      itensDfdIds: g.itensDfdIds,
      ehAgrupadoPorCategoria: g.ehAgrupadoPorCategoria,
      processoSeiSugerido: g.processoSeiSugerido,
    });
  }

  linhas.sort(
    (a, b) =>
      ordemBloco[a.bloco] - ordemBloco[b.bloco] ||
      a.categoriaBaseNome.localeCompare(b.categoriaBaseNome, "pt-BR") ||
      a.objetoOuGrupoNome.localeCompare(b.objetoOuGrupoNome, "pt-BR"),
  );

  return linhas;
}
