import { describe, expect, it } from "vitest";
import {
  validarDataDentroDoAno,
  validarDescricaoSumaria,
  validarItemDfd,
  validarJustificativa,
} from "../dfd-validacao";

describe("validarDescricaoSumaria", () => {
  it("rejeita vazio", () => {
    expect(validarDescricaoSumaria("")).not.toBeNull();
  });
  it("rejeita acima de 100 caracteres", () => {
    expect(validarDescricaoSumaria("a".repeat(101))).not.toBeNull();
  });
  it("aceita exatamente 100 caracteres", () => {
    expect(validarDescricaoSumaria("a".repeat(100))).toBeNull();
  });
});

describe("validarJustificativa", () => {
  it("rejeita menos de 100 caracteres", () => {
    expect(validarJustificativa("a".repeat(99))).not.toBeNull();
  });
  it("aceita exatamente 100 caracteres", () => {
    expect(validarJustificativa("a".repeat(100))).toBeNull();
  });
});

describe("validarItemDfd", () => {
  const base = {
    tipo: "MATERIAL" as const,
    enquadramento: "GERAL" as const,
    categoriaId: "cat1",
    itemCatalogoNome: "Cadeira",
    valorTotal: 100,
    correlacao: "Necessário para substituir cadeira quebrada.",
  };

  it("aceita item válido", () => {
    expect(validarItemDfd(base, false)).toBeNull();
  });

  it("rejeita OP para unidade não elegível", () => {
    const r = validarItemDfd({ ...base, enquadramento: "OP" }, false);
    expect(r).toMatch(/elegível/);
  });

  it("aceita OP para unidade elegível", () => {
    expect(validarItemDfd({ ...base, enquadramento: "OP" }, true)).toBeNull();
  });

  it("convênio sem número/ano é rejeitado", () => {
    const r = validarItemDfd({ ...base, enquadramento: "CONVENIO" }, false);
    expect(r).toMatch(/convênio/i);
  });

  it("convênio com emenda sem nome do parlamentar é rejeitado", () => {
    const r = validarItemDfd(
      {
        ...base,
        enquadramento: "CONVENIO",
        convenioNumero: "123",
        convenioAno: 2026,
        emendaParlamentar: true,
      },
      false,
    );
    expect(r).toMatch(/parlamentar/);
  });

  it("convênio completo é aceito", () => {
    const r = validarItemDfd(
      {
        ...base,
        enquadramento: "CONVENIO",
        convenioNumero: "123",
        convenioAno: 2026,
        emendaParlamentar: true,
        parlamentarNome: "Fulano",
      },
      false,
    );
    expect(r).toBeNull();
  });

  it("sem categoria é rejeitado", () => {
    const r = validarItemDfd({ ...base, categoriaId: null }, false);
    expect(r).toMatch(/categoria/i);
  });

  it("sem item de catálogo nem nome livre é rejeitado", () => {
    const r = validarItemDfd({ ...base, itemCatalogoNome: null }, false);
    expect(r).toMatch(/item/i);
  });

  it("valor total zero é rejeitado", () => {
    const r = validarItemDfd({ ...base, valorTotal: 0 }, false);
    expect(r).toMatch(/valor/i);
  });

  it("sem correlação é rejeitado", () => {
    const r = validarItemDfd({ ...base, correlacao: "  " }, false);
    expect(r).toMatch(/correlação/i);
  });

  it("recursos extra sem agência/conta é rejeitado", () => {
    const r = validarItemDfd({ ...base, enquadramento: "RECURSOS_EXTRA" }, false);
    expect(r).toMatch(/agência/i);
  });

  it("recursos extra com agência/conta é aceito", () => {
    const r = validarItemDfd(
      {
        ...base,
        enquadramento: "RECURSOS_EXTRA",
        recursoExtraAgencia: "1234-5",
        recursoExtraConta: "67890-1",
      },
      false,
    );
    expect(r).toBeNull();
  });
});

describe("validarDataDentroDoAno", () => {
  it("aceita data dentro do ano do PCA", () => {
    expect(validarDataDentroDoAno("2026-06-15", 2026)).toBeNull();
  });

  it("rejeita data de ano anterior ao PCA", () => {
    expect(validarDataDentroDoAno("2025-12-31", 2026)).toMatch(/ano do PCA/);
  });

  it("rejeita data de ano posterior ao PCA", () => {
    expect(validarDataDentroDoAno("2027-01-01", 2026)).toMatch(/ano do PCA/);
  });

  it("rejeita data vazia/inválida", () => {
    expect(validarDataDentroDoAno("", 2026)).toMatch(/ano do PCA/);
  });
});
