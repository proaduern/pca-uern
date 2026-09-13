import { describe, expect, it } from "vitest";
import {
  agruparItensParaHomologacao,
  agruparServicosValorPorCategoria,
  planejarHomologacaoParcialAutomatica,
  proximosStatusLicitacao,
  servicosPendentesHomologacao,
  statusLicitacaoLabel,
  type ItemHomologavel,
} from "../licitacao";

describe("proximosStatusLicitacao", () => {
  it("sem status atual, começa em pesquisa de preços", () => {
    expect(proximosStatusLicitacao(null, "NORMAL").map((s) => s.value)).toEqual(["PESQUISA_PRECOS"]);
  });

  it("termo_referencia pode ir para diligência ou minutas", () => {
    expect(proximosStatusLicitacao("TERMO_REFERENCIA", "NORMAL").map((s) => s.value)).toEqual([
      "DILIGENCIA_DEMANDANTE",
      "MINUTAS",
    ]);
  });

  it("diligência ao demandante pode se repetir (intercorrência) ou seguir para minutas", () => {
    const opcoes = proximosStatusLicitacao("DILIGENCIA_DEMANDANTE", "NORMAL");
    expect(opcoes.map((s) => s.value)).toEqual(["DILIGENCIA_DEMANDANTE", "MINUTAS"]);
    expect(opcoes[0].intercorrencia).toBe(true);
  });

  it("assinatura_contrato só libera remetido_execucao para contratação normal", () => {
    expect(proximosStatusLicitacao("ASSINATURA_CONTRATO", "NORMAL").map((s) => s.value)).toEqual([
      "REMETIDO_EXECUCAO",
    ]);
  });

  it("assinatura_contrato só libera remetido_gestor_ata para ata de registro de preços", () => {
    expect(proximosStatusLicitacao("ASSINATURA_CONTRATO", "ATA").map((s) => s.value)).toEqual([
      "REMETIDO_GESTOR_ATA",
    ]);
  });

  it("remetido_gestor_ata e remetido_execucao são terminais para a Licitação", () => {
    expect(proximosStatusLicitacao("REMETIDO_GESTOR_ATA", "ATA")).toEqual([]);
    expect(proximosStatusLicitacao("REMETIDO_EXECUCAO", "NORMAL")).toEqual([]);
  });

  it("statusLicitacaoLabel devolve o rótulo em português", () => {
    expect(statusLicitacaoLabel("SESSAO_MARCADA")).toBe("Sessão Marcada — Início da Fase Externa");
  });
});

function item(overrides: Partial<ItemHomologavel>): ItemHomologavel {
  return {
    id: "it1",
    origem: "DFD",
    nome: "Notebook",
    unidadeNome: "Unidade A",
    enquadramento: "GERAL",
    tipo: "MATERIAL",
    modoServico: "OBJETO",
    categoriaNome: "Informática",
    quantidade: 1,
    valorUnit: 100,
    valorTotal: 100,
    ...overrides,
  };
}

describe("agruparItensParaHomologacao", () => {
  it("agrupa material e serviço-itens pelo nome, ignorando serviço-valor/objeto", () => {
    const pendentes: ItemHomologavel[] = [
      item({ id: "1", nome: "Notebook", enquadramento: "GERAL", quantidade: 2 }),
      item({ id: "2", nome: "Notebook", enquadramento: "OP", quantidade: 3 }),
      item({ id: "3", nome: "Cadeira", tipo: "MATERIAL", quantidade: 1 }),
      item({ id: "4", tipo: "SERVICO", modoServico: "VALOR", nome: "Diárias" }),
      item({ id: "5", tipo: "SERVICO", modoServico: "OBJETO", nome: "Consultoria" }),
      item({ id: "6", tipo: "SERVICO", modoServico: "ITENS", nome: "Licença de Software", quantidade: 5 }),
    ];
    const grupos = agruparItensParaHomologacao(pendentes);
    expect(grupos.map((g) => g.nome).sort()).toEqual(["Cadeira", "Licença de Software", "Notebook"]);

    const notebook = grupos.find((g) => g.nome === "Notebook")!;
    expect(notebook.quantidadeTotal).toBe(5);
    expect(notebook.quantidadeOP).toBe(3);
    // OP sempre primeiro dentro do grupo
    expect(notebook.itens[0].enquadramento).toBe("OP");
  });
});

describe("agruparServicosValorPorCategoria", () => {
  it("agrupa só serviço-valor, somando o valor total por categoria", () => {
    const pendentes: ItemHomologavel[] = [
      item({ id: "1", tipo: "SERVICO", modoServico: "VALOR", categoriaNome: "Diárias", valorTotal: 500 }),
      item({ id: "2", tipo: "SERVICO", modoServico: "VALOR", categoriaNome: "Diárias", valorTotal: 300 }),
      item({ id: "3", tipo: "MATERIAL" }),
    ];
    const grupos = agruparServicosValorPorCategoria(pendentes);
    expect(grupos).toHaveLength(1);
    expect(grupos[0].nome).toBe("Diárias");
    expect(grupos[0].valorTotal).toBe(800);
  });
});

describe("servicosPendentesHomologacao", () => {
  it("lista só serviço-objeto, individualmente (nunca agrupa)", () => {
    const pendentes: ItemHomologavel[] = [
      item({ id: "1", tipo: "SERVICO", modoServico: "OBJETO", nome: "Consultoria A" }),
      item({ id: "2", tipo: "SERVICO", modoServico: "OBJETO", nome: "Consultoria A" }),
      item({ id: "3", tipo: "SERVICO", modoServico: "VALOR" }),
    ];
    expect(servicosPendentesHomologacao(pendentes)).toHaveLength(2);
  });
});

describe("planejarHomologacaoParcialAutomatica", () => {
  it("completa a quantidade priorizando os itens já ordenados (OP primeiro) e divide o último quando necessário", () => {
    const grupo = {
      nome: "Notebook",
      quantidadeTotal: 10,
      quantidadeOP: 3,
      itens: [
        item({ id: "op1", enquadramento: "OP", quantidade: 3 }),
        item({ id: "geral1", enquadramento: "GERAL", quantidade: 4 }),
        item({ id: "geral2", enquadramento: "GERAL", quantidade: 3 }),
      ],
    };
    const alocacoes = planejarHomologacaoParcialAutomatica(grupo, 5);
    expect(alocacoes).toEqual([
      { itemId: "op1", origem: "DFD", quantidadeIncluida: 3 },
      { itemId: "geral1", origem: "DFD", quantidadeIncluida: 2 },
    ]);
  });

  it("quando a quantidade cobre tudo, aloca o grupo inteiro", () => {
    const grupo = {
      nome: "X",
      quantidadeTotal: 5,
      quantidadeOP: 0,
      itens: [item({ id: "a", quantidade: 2 }), item({ id: "b", quantidade: 3 })],
    };
    const alocacoes = planejarHomologacaoParcialAutomatica(grupo, 5);
    expect(alocacoes).toEqual([
      { itemId: "a", origem: "DFD", quantidadeIncluida: 2 },
      { itemId: "b", origem: "DFD", quantidadeIncluida: 3 },
    ]);
  });
});
