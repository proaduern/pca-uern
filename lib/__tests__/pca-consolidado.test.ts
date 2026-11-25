import { describe, expect, it } from "vitest";
import {
  compilarLinhasPcaAno,
  montarLinhaConsolidado,
  todasComCodigoPncp,
  totaisConsolidado,
  type ConsolidacaoParaLinha,
  type ItemDfdParaCompilacaoPca,
} from "../pca-consolidado";

function consolidacao(overrides: Partial<ConsolidacaoParaLinha> = {}): ConsolidacaoParaLinha {
  return {
    categoriaNome: "Material de Expediente",
    classificacaoRubrica: "3.3.9.0.30 Material de Consumo",
    codigoPncp: null,
    itensDfd: [],
    valorItensTecnicos: 0,
    ...overrides,
  };
}

describe("montarLinhaConsolidado", () => {
  it("separa os valores por enquadramento (convênio / recursos extra / fonte 500)", () => {
    const linha = montarLinhaConsolidado(
      consolidacao({
        itensDfd: [
          { enquadramento: "GERAL", valorTotal: 100, tipoDemanda: "NOVA" },
          { enquadramento: "OP", valorTotal: 50, tipoDemanda: "NOVA" },
          { enquadramento: "CONVENIO", valorTotal: 200, tipoDemanda: "NOVA" },
          { enquadramento: "RECURSOS_EXTRA", valorTotal: 30, tipoDemanda: "NOVA" },
        ],
      }),
    );
    expect(linha.fonte500).toBe(150);
    expect(linha.convenio).toBe(200);
    expect(linha.recursosExtra).toBe(30);
    expect(linha.total).toBe(380);
  });

  it("itens técnicos (sem enquadramento próprio) contam como Fonte 500", () => {
    const linha = montarLinhaConsolidado(consolidacao({ valorItensTecnicos: 400 }));
    expect(linha.fonte500).toBe(400);
    expect(linha.total).toBe(400);
  });

  it("usa '—' quando não há classificação/rubrica cadastrada", () => {
    const linha = montarLinhaConsolidado(consolidacao({ classificacaoRubrica: null }));
    expect(linha.classificacaoRubrica).toBe("—");
  });

  it("modalidade única quando todos os itens do DFD concordam", () => {
    const linha = montarLinhaConsolidado(
      consolidacao({
        itensDfd: [
          { enquadramento: "GERAL", valorTotal: 100, tipoDemanda: "RENOVACAO" },
          { enquadramento: "GERAL", valorTotal: 50, tipoDemanda: "RENOVACAO" },
        ],
      }),
    );
    expect(linha.modalidade).toBe("Renovação Contratual");
  });

  it("modalidade 'Diversos' quando a consolidação mistura tipos de demanda", () => {
    const linha = montarLinhaConsolidado(
      consolidacao({
        itensDfd: [
          { enquadramento: "GERAL", valorTotal: 100, tipoDemanda: "RENOVACAO" },
          { enquadramento: "GERAL", valorTotal: 50, tipoDemanda: "NOVA" },
        ],
      }),
    );
    expect(linha.modalidade).toBe("Diversos");
  });

  it("modalidade '—' quando não há item de DFD (só técnico)", () => {
    const linha = montarLinhaConsolidado(consolidacao({ valorItensTecnicos: 100 }));
    expect(linha.modalidade).toBe("—");
  });
});

describe("totaisConsolidado", () => {
  it("soma os totais de todas as linhas", () => {
    const linhas = [
      montarLinhaConsolidado(consolidacao({ itensDfd: [{ enquadramento: "GERAL", valorTotal: 100, tipoDemanda: "NOVA" }] })),
      montarLinhaConsolidado(consolidacao({ itensDfd: [{ enquadramento: "CONVENIO", valorTotal: 50, tipoDemanda: "NOVA" }] })),
    ];
    const totais = totaisConsolidado(linhas);
    expect(totais.fonte500).toBe(100);
    expect(totais.convenio).toBe(50);
    expect(totais.total).toBe(150);
  });
});

describe("todasComCodigoPncp", () => {
  it("true quando todas as linhas têm código PNCP", () => {
    const linhas = [
      montarLinhaConsolidado(consolidacao({ codigoPncp: "ABC123" })),
      montarLinhaConsolidado(consolidacao({ codigoPncp: "DEF456" })),
    ];
    expect(todasComCodigoPncp(linhas)).toBe(true);
  });

  it("false quando alguma linha está sem código PNCP", () => {
    const linhas = [
      montarLinhaConsolidado(consolidacao({ codigoPncp: "ABC123" })),
      montarLinhaConsolidado(consolidacao({ codigoPncp: null })),
    ];
    expect(todasComCodigoPncp(linhas)).toBe(false);
  });

  it("true (vacuamente) para lista vazia", () => {
    expect(todasComCodigoPncp([])).toBe(true);
  });
});

function itemCompilacao(
  overrides: Partial<ItemDfdParaCompilacaoPca> = {},
): ItemDfdParaCompilacaoPca {
  return {
    id: "it_1",
    dfdId: "dfd_1",
    dfdDescricaoSumaria: "Demanda padrão",
    dfdIdSeiOrigem: null,
    dfdProcessoSeiOrigem: "04410001.000001/2027-01",
    dfdTipoDemanda: "NOVA",
    dfdStatus: "APROVADO",
    unidadeNome: "PROAD",
    categoriaId: "cat_1",
    categoriaNome: "Mobília",
    categoriaTipo: "MATERIAL",
    categoriaClassificacaoRubrica: "4.4.9.0.52",
    categoriaConsolidarPorObjeto: false,
    categoriaCodigoPcaPadrao: null,
    setorTecnicoId: "setor_1",
    setorTecnicoNome: "Patrimônio",
    enquadramento: "GERAL",
    valorTotal: 1000,
    codigoPncpReferencia: null,
    consolidacaoCodigoPca: null,
    ...overrides,
  };
}

describe("compilarLinhasPcaAno", () => {
  it("agrupa compras de materiais por categoria e consolida Passagens+Bilhetes e Hospedagens+Agenciamento", () => {
    const linhas = compilarLinhasPcaAno([
      itemCompilacao({ id: "m1", dfdId: "d1", categoriaId: "cat_mob", categoriaNome: "Mobília", categoriaTipo: "MATERIAL", valorTotal: 1000 }),
      itemCompilacao({ id: "m2", dfdId: "d2", categoriaId: "cat_mob", categoriaNome: "Mobília", categoriaTipo: "MATERIAL", valorTotal: 2500 }),
      itemCompilacao({ id: "p1", dfdId: "d3", categoriaId: "cat_pa", categoriaNome: "Passagens Aéreas", categoriaTipo: "SERVICO", valorTotal: 50000, codigoPncpReferencia: "925543-99/2027" }),
      itemCompilacao({ id: "p2", dfdId: "d4", categoriaId: "cat_bil", categoriaNome: "Serviço emissão e entrega de bilhetes aéreos", categoriaTipo: "SERVICO", valorTotal: 880000 }),
      itemCompilacao({ id: "h1", dfdId: "d5", categoriaId: "cat_hosp", categoriaNome: "Hospedagens", categoriaTipo: "SERVICO", valorTotal: 20000, codigoPncpReferencia: "925543-100/2027" }),
      itemCompilacao({ id: "h2", dfdId: "d6", categoriaId: "cat_ag", categoriaNome: "Agenciamento de hospedagem", categoriaTipo: "SERVICO", valorTotal: 330000 }),
    ]);

    expect(linhas).toHaveLength(3);
    const mob = linhas.find((l) => l.chave === "MAT_CAT_cat_mob");
    expect(mob?.total).toBe(3500);
    expect(mob?.qtdDfds).toBe(2);

    const pass = linhas.find((l) => l.chave === "SRV_GRUPO_PASSAGENS_AEREAS");
    expect(pass?.total).toBe(930000);
    expect(pass?.codigoPncp).toBe("925543-99/2027");

    const hosp = linhas.find((l) => l.chave === "SRV_GRUPO_HOSPEDAGENS");
    expect(hosp?.total).toBe(350000);
    expect(hosp?.codigoPncp).toBe("925543-100/2027");
  });

  it("separa Estande GORN de Locação de Palco+Itens de Eventos e agrupa E-books FACEM+Natal separando Impressão/OMP/Periódicos", () => {
    const linhas = compilarLinhasPcaAno([
      itemCompilacao({
        id: "ev1",
        dfdId: "dfd_gorn",
        dfdDescricaoSumaria: "Locação de espaço/estande para participação da UERN no GORN - PROPEG",
        dfdIdSeiOrigem: "40269316",
        unidadeNome: "PROPEG",
        categoriaId: "cat_log",
        categoriaNome: "Serviços diversos para eventos -Logística",
        categoriaTipo: "SERVICO",
        valorTotal: 85000,
      }),
      itemCompilacao({
        id: "ev2",
        dfdId: "dfd_aai",
        dfdDescricaoSumaria: "Serviços de Locação de Palco para eventos (SEI 39514787) — AAI",
        unidadeNome: "AAI",
        categoriaId: "cat_log",
        categoriaNome: "Serviços diversos para eventos -Logística",
        categoriaTipo: "SERVICO",
        valorTotal: 17550,
      }),
      itemCompilacao({
        id: "ev3",
        dfdId: "dfd_prae",
        dfdDescricaoSumaria: "Serviços de Locação de itens diversos para eventos - PRAE",
        unidadeNome: "PRAE",
        categoriaId: "cat_log",
        categoriaNome: "Serviços diversos para eventos -Logística",
        categoriaTipo: "SERVICO",
        valorTotal: 230851.82,
      }),
      itemCompilacao({
        id: "liv1",
        dfdId: "dfd_facem",
        dfdDescricaoSumaria: "Serviço de Diagramação e Impressão de Livros (SEI 40667573) — FACEM",
        unidadeNome: "FACEM",
        categoriaId: "cat_liv",
        categoriaNome: "Serviço de Diagramação e Impressão de Livros",
        categoriaTipo: "SERVICO",
        valorTotal: 10000,
      }),
      itemCompilacao({
        id: "liv2",
        dfdId: "dfd_natal",
        dfdDescricaoSumaria: "Serviço de Diagramação e Impressão de Livros (SEI 40668325) — CAMPUS NATAL",
        unidadeNome: "Campus Natal",
        categoriaId: "cat_liv",
        categoriaNome: "Serviço de Diagramação e Impressão de Livros",
        categoriaTipo: "SERVICO",
        valorTotal: 19000,
      }),
      itemCompilacao({
        id: "liv3",
        dfdId: "dfd_imp",
        dfdDescricaoSumaria: "Serviço de Impressão de Livros (SEI 40291337) — EDUERN",
        unidadeNome: "EDUERN",
        categoriaId: "cat_liv",
        categoriaNome: "Serviço de Diagramação e Impressão de Livros",
        categoriaTipo: "SERVICO",
        valorTotal: 77400,
      }),
      itemCompilacao({
        id: "liv4",
        dfdId: "dfd_imp",
        dfdDescricaoSumaria: "Serviço de Impressão de Livros (SEI 40291337) — EDUERN",
        unidadeNome: "EDUERN",
        categoriaId: "cat_liv",
        categoriaNome: "Serviço de Diagramação e Impressão de Livros",
        categoriaTipo: "SERVICO",
        valorTotal: 31800,
      }),
    ]);

    const logAgrup = linhas.find((l) => l.chave === "SRV_GRUPO_EVENTOS_LOGISTICA");
    expect(logAgrup?.total).toBe(248401.82);
    expect(logAgrup?.qtdDfds).toBe(2);

    const gorn = linhas.find((l) => l.chave === "SRV_DFD_dfd_gorn");
    expect(gorn?.total).toBe(85000);
    expect(gorn?.bloco).toBe("SERVICOS_E_OBRAS_POR_DEMANDA");

    const ebookAgrup = linhas.find((l) => l.chave === "SRV_GRUPO_DIAGRAMACAO_EBOOK");
    expect(ebookAgrup?.total).toBe(29000);
    expect(ebookAgrup?.qtdDfds).toBe(2);

    const impEduern = linhas.find((l) => l.chave === "SRV_DFD_dfd_imp");
    expect(impEduern?.total).toBe(109200);
    expect(impEduern?.qtdItens).toBe(2);
    expect(impEduern?.bloco).toBe("SERVICOS_E_OBRAS_POR_DEMANDA");
  });
});
