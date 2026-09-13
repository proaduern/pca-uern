import { describe, expect, it } from "vitest";
import {
  categoriaFluxoContinuo,
  classificarTipoBemImportacao,
  classificarTipoCategoriaImportacao,
  extrairPrioridadeImportacao,
  mapearEnquadramentoImportacao,
  mapearNaturezaImportacao,
  normalizarNomeCategoria,
  ordemPrioridadeImportacao,
} from "../importacao-dfds";

describe("normalizarNomeCategoria", () => {
  it("troca travessões variados por hífen comum e colapsa espaços", () => {
    expect(normalizarNomeCategoria("Material  de  Escritório")).toBe("Material de Escritório");
    expect(normalizarNomeCategoria("Água–Esgoto")).toBe("Água-Esgoto");
  });
});

describe("classificarTipoCategoriaImportacao", () => {
  it("reconhece categorias de serviço pelas palavras-chave", () => {
    expect(classificarTipoCategoriaImportacao("Serviços de Limpeza")).toBe("SERVICO");
    expect(classificarTipoCategoriaImportacao("Manutenção Predial")).toBe("SERVICO");
  });
  it("cai em material quando não reconhece nenhuma palavra-chave", () => {
    expect(classificarTipoCategoriaImportacao("Material de Escritório")).toBe("MATERIAL");
  });
});

describe("classificarTipoBemImportacao", () => {
  it("reconhece categorias de consumo", () => {
    expect(classificarTipoBemImportacao("Material de Expediente")).toBe("CONSUMO");
  });
  it("cai em permanente por padrão", () => {
    expect(classificarTipoBemImportacao("Mobiliário")).toBe("PERMANENTE");
  });
});

describe("extrairPrioridadeImportacao", () => {
  it("usa Média como padrão quando vazio", () => {
    expect(extrairPrioridadeImportacao(null)).toEqual({ nivel: "Média", frase: "Média" });
  });
  it("separa nível e frase pela primeira vírgula", () => {
    expect(extrairPrioridadeImportacao("Alta, urgente para o semestre")).toEqual({
      nivel: "Alta",
      frase: "urgente para o semestre",
    });
  });
  it("usa o próprio nível como frase quando não há texto após a vírgula", () => {
    expect(extrairPrioridadeImportacao("baixa")).toEqual({ nivel: "Baixa", frase: "Baixa" });
  });
});

describe("ordemPrioridadeImportacao", () => {
  it("ordena altíssima > alta > média > baixa", () => {
    expect(ordemPrioridadeImportacao("Altíssima")).toBe(4);
    expect(ordemPrioridadeImportacao("Alta")).toBe(3);
    expect(ordemPrioridadeImportacao("Média")).toBe(2);
    expect(ordemPrioridadeImportacao("Baixa")).toBe(1);
  });
  it("usa 2 (média) para nível desconhecido", () => {
    expect(ordemPrioridadeImportacao("desconhecido")).toBe(2);
  });
});

describe("mapearEnquadramentoImportacao", () => {
  it("reconhece OP por prefixo", () => {
    expect(mapearEnquadramentoImportacao("OP - Universitária")).toBe("OP");
  });
  it("reconhece convênio com ou sem acento", () => {
    expect(mapearEnquadramentoImportacao("Convênio")).toBe("CONVENIO");
    expect(mapearEnquadramentoImportacao("Convenio 123")).toBe("CONVENIO");
  });
  it("cai em GERAL para qualquer outro valor", () => {
    expect(mapearEnquadramentoImportacao("qualquer coisa")).toBe("GERAL");
    expect(mapearEnquadramentoImportacao(undefined)).toBe("GERAL");
  });
});

describe("mapearNaturezaImportacao", () => {
  it("reconhece renovação", () => {
    expect(mapearNaturezaImportacao("Renovação Contratual")).toBe("RENOVACAO");
  });
  it("cai em NOVA por padrão", () => {
    expect(mapearNaturezaImportacao("Contratação")).toBe("NOVA");
  });
});

describe("categoriaFluxoContinuo", () => {
  it("mapeia os três nomes de fluxo contínuo, com alias para 'passagens'", () => {
    expect(categoriaFluxoContinuo("Diárias")).toBe("Diárias");
    expect(categoriaFluxoContinuo("passagens")).toBe("Passagens Aéreas");
    expect(categoriaFluxoContinuo("Passagens Aéreas")).toBe("Passagens Aéreas");
    expect(categoriaFluxoContinuo("Hospedagens")).toBe("Hospedagens");
  });
  it("retorna null para categorias comuns", () => {
    expect(categoriaFluxoContinuo("Material de Escritório")).toBeNull();
  });
});
