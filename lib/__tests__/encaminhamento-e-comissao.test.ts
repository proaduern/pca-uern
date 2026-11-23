import { describe, it, expect } from "vitest";
import { normalizarListaPerfisPca } from "../resolver-sessao-perfil";

describe("Encaminhamento Intermediário e Perfis Múltiplos", () => {
  it("normalizarListaPerfisPca deve preservar perfis compostos de setor técnico específico", () => {
    const perfis = ["UNIDADE", "SETOR_TECNICO:cmwtdymgb00013z3sj15czr26:Comissão de TV e Rádio"];
    const normalizados = normalizarListaPerfisPca(perfis);
    expect(normalizados).toContain("UNIDADE");
    expect(normalizados).toContain("SETOR_TECNICO:cmwtdymgb00013z3sj15czr26:Comissão de TV e Rádio");
  });

  it("normalizarListaPerfisPca converte aliases legado para o padrão canônico", () => {
    const raw = ["DEMANDANTE", "ETP", "TR", "DIRETOR_DLC"];
    const norm = normalizarListaPerfisPca(raw);
    expect(norm).toEqual(["UNIDADE", "SETOR_TECNICO", "PLANEJAMENTO", "DIRETOR_LICITACOES"]);
  });

  it("normalizarListaPerfisPca descarta módulos de Execução e Entrega migrados", () => {
    const raw = ["UNIDADE", "EXECUCAO", "ENTREGA"];
    const norm = normalizarListaPerfisPca(raw);
    expect(norm).toEqual(["UNIDADE"]);
  });
});
