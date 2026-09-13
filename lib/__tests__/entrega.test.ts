import { describe, expect, it } from "vitest";
import {
  confirmacaoEfetiva,
  proximosStatusEntrega,
  statusEntregaLabel,
  subperfilBensPorTipo,
} from "../entrega";

describe("subperfilBensPorTipo", () => {
  it("consumo vai para Almoxarifado", () => {
    expect(subperfilBensPorTipo("CONSUMO")).toBe("ALMOXARIFADO");
  });

  it("permanente (ou ausente) vai para Patrimônio", () => {
    expect(subperfilBensPorTipo("PERMANENTE")).toBe("PATRIMONIO");
    expect(subperfilBensPorTipo(null)).toBe("PATRIMONIO");
  });
});

describe("proximosStatusEntrega", () => {
  it("sem status atual, começa em estoque", () => {
    expect(proximosStatusEntrega(null).map((s) => s.value)).toEqual(["EM_ESTOQUE"]);
  });

  it("entregue é terminal", () => {
    expect(proximosStatusEntrega("ENTREGUE")).toEqual([]);
  });
});

describe("statusEntregaLabel", () => {
  it("null vira travessão", () => {
    expect(statusEntregaLabel(null)).toBe("—");
  });
});

describe("confirmacaoEfetiva", () => {
  it("pendente com prazo já vencido vira auto_confirmado", () => {
    expect(confirmacaoEfetiva("PENDENTE", new Date("2020-01-01"))).toBe("AUTO_CONFIRMADO");
  });

  it("pendente com prazo ainda não vencido continua pendente", () => {
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);
    expect(confirmacaoEfetiva("PENDENTE", amanha)).toBe("PENDENTE");
  });

  it("qualquer outro status é devolvido como está, independente do prazo", () => {
    expect(confirmacaoEfetiva("CONFIRMADO", new Date("2020-01-01"))).toBe("CONFIRMADO");
  });
});
