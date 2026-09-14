import { describe, expect, it } from "vitest";
import {
  arredondarCentavos,
  calcularGastos,
  derivarCotaTipo,
  dfdComprometeOrcamento,
  exigeCotaFixa,
  janelaAberta,
  saldoPCA,
  saldoPCAGeralParaAlocar,
  saldoPCAOPParaAlocar,
  saldoUnidadeGeral,
  saldoUnidadeOP,
  totalCotaGeralFechadaAlocada,
  totalCotaOPAlocada,
  type UnidadeParaAlocacao,
} from "../cota";

describe("dfdComprometeOrcamento", () => {
  it("rascunho não compromete orçamento", () => {
    expect(dfdComprometeOrcamento("RASCUNHO")).toBe(false);
  });
  it("reprovado não compromete orçamento", () => {
    expect(dfdComprometeOrcamento("REPROVADO")).toBe(false);
  });
  it("aguardando aprovação já compromete orçamento (reserva antes da aprovação)", () => {
    expect(dfdComprometeOrcamento("AGUARDANDO_APROVACAO")).toBe(true);
  });
  it("aprovado compromete orçamento", () => {
    expect(dfdComprometeOrcamento("APROVADO")).toBe(true);
  });
});

describe("calcularGastos", () => {
  it("separa gastos por enquadramento e soma total sem o convênio", () => {
    const g = calcularGastos([
      { enquadramento: "OP", valorTotal: 100 },
      { enquadramento: "GERAL", valorTotal: 50 },
      { enquadramento: "CONVENIO", valorTotal: 9999 },
    ]);
    expect(g.op).toBe(100);
    expect(g.geral).toBe(50);
    expect(g.convenio).toBe(9999);
    expect(g.total).toBe(150);
  });

  it("lista vazia dá tudo zero", () => {
    const g = calcularGastos([]);
    expect(g).toEqual({ op: 0, geral: 0, convenio: 0, total: 0 });
  });
});

describe("saldoUnidadeOP / saldoUnidadeGeral / saldoPCA", () => {
  it("calcula saldo restante corretamente", () => {
    expect(saldoUnidadeOP(1000, 300)).toBe(700);
    expect(saldoUnidadeGeral(500, 500)).toBe(0);
    expect(saldoPCA(1_000_000, 250_000)).toBe(750_000);
  });
});

describe("janelaAberta", () => {
  const pcaBase = {
    concluido: false,
    aberturaExtraGeral: false,
    dataAbertura: new Date("2026-03-01"),
    dataFechamento: new Date("2026-03-31"),
  };

  it("sem PCA configurado, janela fechada", () => {
    expect(janelaAberta(null, false, new Date("2026-03-15"))).toBe(false);
  });

  it("PCA concluído bloqueia mesmo dentro da janela de datas", () => {
    expect(janelaAberta({ ...pcaBase, concluido: true }, false, new Date("2026-03-15"))).toBe(
      false,
    );
  });

  it("abertura extra geral libera mesmo fora da janela de datas", () => {
    expect(
      janelaAberta({ ...pcaBase, aberturaExtraGeral: true }, false, new Date("2026-06-01")),
    ).toBe(true);
  });

  it("exceção individual libera mesmo fora da janela de datas", () => {
    expect(janelaAberta(pcaBase, true, new Date("2026-06-01"))).toBe(true);
  });

  it("dentro do intervalo de datas, sem exceção, está aberta", () => {
    expect(janelaAberta(pcaBase, false, new Date("2026-03-15"))).toBe(true);
  });

  it("fora do intervalo de datas, sem exceção, está fechada", () => {
    expect(janelaAberta(pcaBase, false, new Date("2026-04-01"))).toBe(false);
  });

  it("limites do intervalo (primeiro e último dia) são inclusivos", () => {
    expect(janelaAberta(pcaBase, false, new Date("2026-03-01"))).toBe(true);
    expect(janelaAberta(pcaBase, false, new Date("2026-03-31"))).toBe(true);
  });
});

describe("alocação de cota às unidades (item 6/7 da auditoria)", () => {
  const unidades: UnidadeParaAlocacao[] = [
    { id: "u1", elegivelCotaOP: true, cotaOP: 1000, cotaGeral: 500, cotaTipo: "FECHADA" },
    { id: "u2", elegivelCotaOP: true, cotaOP: 2000, cotaGeral: 0, cotaTipo: "ABERTA" },
    { id: "u3", elegivelCotaOP: false, cotaOP: 0, cotaGeral: 300, cotaTipo: "FECHADA" },
    { id: "u4", elegivelCotaOP: false, cotaOP: 0, cotaGeral: 0, cotaTipo: "ABERTA" },
  ];

  it("totalCotaOPAlocada soma só unidades elegíveis a OP", () => {
    expect(totalCotaOPAlocada(unidades)).toBe(3000);
  });

  it("totalCotaOPAlocada exclui a unidade em edição", () => {
    expect(totalCotaOPAlocada(unidades, "u1")).toBe(2000);
  });

  it("totalCotaGeralFechadaAlocada soma só cotaTipo FECHADA, elegível ou não a OP", () => {
    expect(totalCotaGeralFechadaAlocada(unidades)).toBe(800);
  });

  it("saldoPCAOPParaAlocar desconta o já alocado do subsaldo OP do PCA", () => {
    expect(saldoPCAOPParaAlocar(5000, unidades)).toBe(2000);
    expect(saldoPCAOPParaAlocar(5000, unidades, "u2")).toBe(4000);
  });

  it("saldoPCAGeralParaAlocar usa (cotaGeral - cotaOP) do PCA menos o fechado já alocado", () => {
    // subsaldo geral do PCA = 100000 - 5000 = 95000; já alocado (fechada) = 800
    expect(saldoPCAGeralParaAlocar({ cotaGeral: 100000, cotaOP: 5000 }, unidades)).toBe(94200);
  });

  it("derivarCotaTipo: unidade elegível a OP nunca escolhe manualmente — deriva de cotaGeral", () => {
    expect(derivarCotaTipo(true, 500, "ABERTA")).toBe("FECHADA");
    expect(derivarCotaTipo(true, 0, "FECHADA")).toBe("ABERTA");
  });

  it("derivarCotaTipo: unidade não elegível a OP mantém a escolha manual", () => {
    expect(derivarCotaTipo(false, 500, "ABERTA")).toBe("ABERTA");
    expect(derivarCotaTipo(false, 500, "FECHADA")).toBe("FECHADA");
  });

  it("exigeCotaFixa: elegível a OP sempre disputa o subsaldo do PCA", () => {
    expect(exigeCotaFixa(true, "ABERTA")).toBe(true);
    expect(exigeCotaFixa(true, "FECHADA")).toBe(true);
  });

  it("exigeCotaFixa: não elegível a OP só disputa quando a cota geral é fechada", () => {
    expect(exigeCotaFixa(false, "FECHADA")).toBe(true);
    expect(exigeCotaFixa(false, "ABERTA")).toBe(false);
  });
});

describe("arredondarCentavos (regressão: erro de ponto flutuante bloqueava fechar o saldo exato)", () => {
  it("corrige o resíduo binário de 1000 - 153.18", () => {
    expect(1000 - 153.18).not.toBe(846.82); // reproduz o erro cru do JS
    expect(arredondarCentavos(1000 - 153.18)).toBe(846.82);
  });

  it("saldoPCAOPParaAlocar permite a última unidade fechar exatamente o subsaldo", () => {
    // Cota OP do PCA = 1000; uma unidade já com 153.18 alocado; a última
    // unidade recebendo os 846.82 restantes não pode ser bloqueada.
    const unidades: UnidadeParaAlocacao[] = [
      { id: "u1", elegivelCotaOP: true, cotaOP: 153.18, cotaGeral: 0, cotaTipo: "ABERTA" },
    ];
    const disponivelParaUltima = saldoPCAOPParaAlocar(1000, unidades);
    expect(disponivelParaUltima).toBe(846.82);
    expect(846.82 > disponivelParaUltima).toBe(false);
  });

  it("saldoUnidadeOP permite lançar uma demanda de valor igual ao saldo, sem sobrar 1 centavo", () => {
    // Unidade com cota OP de 1000 e nada gasto ainda: lançar uma demanda de
    // exatos 1000 não pode exigir reduzir pra 999,99 pra passar.
    const saldo = saldoUnidadeOP(1000, 0);
    expect(saldo).toBe(1000);
    expect(1000 > saldo).toBe(false);
  });

  it("calcularGastos soma valores fracionados sem deixar resíduo binário", () => {
    const g = calcularGastos([
      { enquadramento: "OP", valorTotal: 199.99 },
      { enquadramento: "OP", valorTotal: 200.01 },
      { enquadramento: "OP", valorTotal: 150.5 },
      { enquadramento: "OP", valorTotal: 449.5 },
    ]);
    expect(g.op).toBe(1000);
  });
});
