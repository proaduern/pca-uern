import { describe, expect, it } from "vitest";
import {
  categoriasDoDfd,
  detalhesConvenio,
  detalhesRecursoExtra,
  numeroFormatado,
  origensDoDfd,
  totalDoDfd,
  tituloDataDfd,
  type DfdParaPdf,
  type ItemParaPdf,
} from "../pdf/dfd-dados";

function item(overrides: Partial<ItemParaPdf> = {}): ItemParaPdf {
  return {
    enquadramento: "GERAL",
    convenioNumero: null,
    convenioAno: null,
    parlamentarNome: null,
    recursoExtraAgencia: null,
    recursoExtraConta: null,
    categoriaNome: "Material de Expediente",
    nome: "Caneta",
    quantidade: 10,
    valorUnit: 2,
    valorTotal: 20,
    ...overrides,
  };
}

function dfd(itens: ItemParaPdf[]): DfdParaPdf {
  return {
    numero: 7,
    ano: 2027,
    unidadeNome: "Unidade Teste",
    unidadeEmail: "unidade@uern.br",
    responsavelNome: "Fulano de Tal",
    responsavelMatricula: "12345",
    responsavelTelefone: "(84) 99999-9999",
    tipificacaoNome: "Estrutural",
    justificativa: "Justificativa de teste.",
    tipoDemanda: "NOVA",
    data: new Date("2027-06-01T00:00:00Z"),
    prioridadeFrase: "Alta prioridade",
    criadoEm: new Date("2027-01-10T00:00:00Z"),
    itens,
  };
}

describe("numeroFormatado", () => {
  it("preenche com zeros à esquerda até 4 dígitos", () => {
    expect(numeroFormatado(dfd([]))).toBe("0007/2027");
  });
});

describe("origensDoDfd", () => {
  it("marca só as origens presentes entre os itens, na ordem do modelo oficial", () => {
    const origens = origensDoDfd(dfd([item({ enquadramento: "OP" }), item({ enquadramento: "CONVENIO" })]));
    expect(origens.map((o) => o.label)).toEqual([
      "Recursos Ordinários – Uern Geral",
      "Recursos arrecadados pela Unidade (Recursos Extra)",
      "Recursos Ordinários – Orçamento Participativo",
      "Recursos de Convênio(*)",
    ]);
    expect(origens.map((o) => o.marcada)).toEqual([false, false, true, true]);
  });

  it("sem itens, nenhuma origem marcada", () => {
    expect(origensDoDfd(dfd([])).every((o) => !o.marcada)).toBe(true);
  });
});

describe("detalhesConvenio", () => {
  it("agrupa itens de convênio por número/ano/parlamentar e soma o valor", () => {
    const detalhes = detalhesConvenio(
      dfd([
        item({ enquadramento: "CONVENIO", convenioNumero: "123", convenioAno: 2026, valorTotal: 100 }),
        item({ enquadramento: "CONVENIO", convenioNumero: "123", convenioAno: 2026, valorTotal: 50 }),
        item({ enquadramento: "CONVENIO", convenioNumero: "999", convenioAno: 2027, valorTotal: 30 }),
        item({ enquadramento: "GERAL" }),
      ]),
    );
    expect(detalhes).toHaveLength(2);
    const primeiro = detalhes.find((d) => d.identificacao === "123/2026")!;
    expect(primeiro.valorDemandado).toBe("R$ 150,00");
  });
});

describe("detalhesRecursoExtra", () => {
  it("agrupa itens de recursos extra por agência/conta e soma o valor", () => {
    const detalhes = detalhesRecursoExtra(
      dfd([
        item({ enquadramento: "RECURSOS_EXTRA", recursoExtraAgencia: "1234-5", recursoExtraConta: "67890-1", valorTotal: 200 }),
        item({ enquadramento: "RECURSOS_EXTRA", recursoExtraAgencia: "1234-5", recursoExtraConta: "67890-1", valorTotal: 300 }),
      ]),
    );
    expect(detalhes).toHaveLength(1);
    expect(detalhes[0].agenciaConta).toBe("Agência: 1234-5 - Conta: 67890-1");
    expect(detalhes[0].valorDemandado).toBe("R$ 500,00");
  });
});

describe("categoriasDoDfd", () => {
  it("lista categorias distintas em ordem alfabética", () => {
    const categorias = categoriasDoDfd(
      dfd([item({ categoriaNome: "Zebra" }), item({ categoriaNome: "Abelha" }), item({ categoriaNome: "Zebra" })]),
    );
    expect(categorias).toEqual(["Abelha", "Zebra"]);
  });
});

describe("totalDoDfd", () => {
  it("soma o valor total de todos os itens", () => {
    expect(totalDoDfd(dfd([item({ valorTotal: 10 }), item({ valorTotal: 25.5 })]))).toBe(35.5);
  });
});

describe("tituloDataDfd", () => {
  it("usa 'renovação' quando tipoDemanda é RENOVACAO", () => {
    expect(tituloDataDfd(dfd([]))).toBe("Data pretendida de entrega");
    expect(tituloDataDfd({ ...dfd([]), tipoDemanda: "RENOVACAO" })).toBe("Data prevista de renovação");
  });
});
