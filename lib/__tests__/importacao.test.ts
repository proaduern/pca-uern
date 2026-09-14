import { describe, expect, it } from "vitest";
import { lerPlanilha, paraBooleano, paraNumero } from "../importacao";

describe("paraBooleano", () => {
  it("reconhece variações de sim", () => {
    expect(paraBooleano("sim")).toBe(true);
    expect(paraBooleano("SIM")).toBe(true);
    expect(paraBooleano("true")).toBe(true);
    expect(paraBooleano("1")).toBe(true);
    expect(paraBooleano("x")).toBe(true);
  });

  it("trata qualquer outra coisa como falso", () => {
    expect(paraBooleano("nao")).toBe(false);
    expect(paraBooleano("")).toBe(false);
    expect(paraBooleano(undefined)).toBe(false);
  });
});

describe("paraNumero", () => {
  it("interpreta formato brasileiro com separador de milhar", () => {
    expect(paraNumero("1.234,56")).toBe(1234.56);
  });

  it("interpreta número simples com vírgula decimal", () => {
    expect(paraNumero("500,00")).toBe(500);
  });

  it("interpreta número já no formato ponto (ex.: célula numérica do Excel)", () => {
    expect(paraNumero("500.5")).toBe(500.5);
  });

  it("retorna 0 para vazio ou inválido", () => {
    expect(paraNumero("")).toBe(0);
    expect(paraNumero(undefined)).toBe(0);
  });
});

describe("lerPlanilha", () => {
  function paraBuffer(texto: string): ArrayBuffer {
    return new TextEncoder().encode(texto).buffer as ArrayBuffer;
  }

  it("lê CSV separado por vírgula", async () => {
    const csv = "nome,email\nFulano,fulano@uern.br\n";
    const linhas = await lerPlanilha("teste.csv", paraBuffer(csv));
    expect(linhas).toEqual([{ linha: 2, dados: { nome: "Fulano", email: "fulano@uern.br" } }]);
  });

  it("detecta e lê CSV separado por ponto e vírgula (padrão PT-BR)", async () => {
    const csv = "nome;email\nFulano;fulano@uern.br\n";
    const linhas = await lerPlanilha("teste.csv", paraBuffer(csv));
    expect(linhas).toEqual([{ linha: 2, dados: { nome: "Fulano", email: "fulano@uern.br" } }]);
  });

  it("ignora linhas totalmente vazias", async () => {
    const csv = "nome,email\nFulano,fulano@uern.br\n,\n";
    const linhas = await lerPlanilha("teste.csv", paraBuffer(csv));
    expect(linhas).toHaveLength(1);
  });

  it("preserva o número da linha original do arquivo", async () => {
    const csv = "nome,email\nA,a@uern.br\nB,b@uern.br\n";
    const linhas = await lerPlanilha("teste.csv", paraBuffer(csv));
    expect(linhas.map((l) => l.linha)).toEqual([2, 3]);
  });

  it("respeita campo entre aspas contendo o separador (vírgula na descrição do item)", async () => {
    const csv =
      'categoria,item,valor,tipoBem\n' +
      'Mobília,"Cadeira Giratória, com ajuste de assento, encosto e braços",475,PERMANENTE\n';
    const linhas = await lerPlanilha("teste.csv", paraBuffer(csv));
    expect(linhas).toEqual([
      {
        linha: 2,
        dados: {
          categoria: "Mobília",
          item: "Cadeira Giratória, com ajuste de assento, encosto e braços",
          valor: "475",
          tipoBem: "PERMANENTE",
        },
      },
    ]);
  });

  it('interpreta "" dentro de um campo entre aspas como uma aspas literal escapada', async () => {
    const csv = 'nome,obs\nFulano,"Tubo de 3/4"" de diâmetro"\n';
    const linhas = await lerPlanilha("teste.csv", paraBuffer(csv));
    expect(linhas).toEqual([{ linha: 2, dados: { nome: "Fulano", obs: 'Tubo de 3/4" de diâmetro' } }]);
  });
});
