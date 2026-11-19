import {
  Document,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  WidthType,
  BorderStyle,
  AlignmentType,
} from "docx";
import {
  criarCabecalhoDocxUern,
  criarRodapeDocxUern,
  criarTituloSecaoDocx,
  criarParagrafoDocx,
  criarBlocoAssinaturaDocx,
  empacotarDocxParaBuffer,
} from "./gerador-docx-uern";
import type { DadosRiscoItem } from "@/lib/etp-riscos";

export interface DadosRiscosDocx {
  processoSEI: string;
  categoriaNome: string;
  sequencialTexto?: string; // Ex: "Mapa de Riscos nº 01/2026 - DLC/PROAD/UERN"
  codigoVerificador?: string;
  responsavelNome: string;
  responsavelMatricula?: string | null;
  riscos: DadosRiscoItem[];
  dataTexto?: string;
}

const BORDA_CINZA = {
  style: BorderStyle.SINGLE,
  size: 4,
  color: "CCCCCC",
};

const BORDAS_TABELA = {
  top: BORDA_CINZA,
  bottom: BORDA_CINZA,
  left: BORDA_CINZA,
  right: BORDA_CINZA,
  insideHorizontal: BORDA_CINZA,
  insideVertical: BORDA_CINZA,
};

function formatarNivelAceitacao(nivel: string): string {
  switch (nivel) {
    case "ACEITACAO_AMPLA":
      return "Ampla (Baixo)";
    case "ACEITACAO_INTERMEDIARIA":
      return "Intermediária (Médio)";
    case "INACEITAVEL":
      return "Inaceitável (Alto)";
    default:
      return nivel;
  }
}

function criarTabelaFaseRiscos(riscosFase: DadosRiscoItem[], numInicio: number): Table {
  const celulaCabecalho = (texto: string, larguraPct: number) =>
    new TableCell({
      width: { size: larguraPct, type: WidthType.PERCENTAGE },
      shading: { fill: "1E3A8A" }, // Azul escuro UERN
      margins: { top: 100, bottom: 100, left: 100, right: 100 },
      children: [
        new Paragraph({
          children: [
            new (require("docx").TextRun)({
              text: texto,
              bold: true,
              color: "FFFFFF",
              size: 16, // 8pt
              font: "Arial",
            }),
          ],
          alignment: AlignmentType.CENTER,
        }),
      ],
    });

  const celulaCorpo = (texto: string, larguraPct: number, alinhamento: any = AlignmentType.LEFT) =>
    new TableCell({
      width: { size: larguraPct, type: WidthType.PERCENTAGE },
      margins: { top: 80, bottom: 80, left: 80, right: 80 },
      children: [
        new Paragraph({
          children: [
            new (require("docx").TextRun)({
              text: texto || "-",
              size: 16, // 8pt
              font: "Arial",
            }),
          ],
          alignment: alinhamento,
        }),
      ],
    });

  const linhas: TableRow[] = [
    new TableRow({
      tableHeader: true,
      children: [
        celulaCabecalho("Nº", 5),
        celulaCabecalho("Evento de Risco / Descrição", 25),
        celulaCabecalho("Danos Potenciais", 20),
        celulaCabecalho("P / I / Nível", 12),
        celulaCabecalho("Ação Preventiva", 18),
        celulaCabecalho("Ação Contingencial", 20),
      ],
    }),
  ];

  riscosFase.forEach((r, idx) => {
    const numRisco = numInicio + idx;
    const piNivel = `${r.probabilidade[0]}/${r.impacto[0]} - ${formatarNivelAceitacao(r.nivelAceitacao)}`;
    linhas.push(
      new TableRow({
        children: [
          celulaCorpo(numRisco.toString().padStart(2, "0"), 5, AlignmentType.CENTER),
          celulaCorpo(r.descricao, 25),
          celulaCorpo(r.danos, 20),
          celulaCorpo(piNivel, 12, AlignmentType.CENTER),
          celulaCorpo(r.acoesPreventivas, 18),
          celulaCorpo(r.acoesContingenciais, 20),
        ],
      }),
    );
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: BORDAS_TABELA,
    rows: linhas,
  });
}

export async function gerarBufferDocxRiscos(dados: DadosRiscosDocx): Promise<Buffer> {
  const tituloHeader = dados.sequencialTexto || "MAPA DE GERENCIAMENTO DE RISCOS (LEI Nº 14.133/2021 — UERN)";

  const riscosPlanejamento = dados.riscos.filter((r) => r.fase === "PLANEJAMENTO");
  const riscosSelecao = dados.riscos.filter((r) => r.fase === "SELECAO_FORNECEDOR");
  const riscosGestao = dados.riscos.filter((r) => r.fase === "GESTAO_CONTRATO");

  const elementos: any[] = [
    criarParagrafoDocx(`PROCESSO ADMINISTRATIVO SEI Nº ${dados.processoSEI}`, true),
    criarParagrafoDocx(`CATEGORIA DO PLANO DE CONTRATAÇÕES: ${dados.categoriaNome.toUpperCase()}`, true),
    criarParagrafoDocx(
      "A presente Matriz de Análise e Gerenciamento de Riscos foi estruturada em estrita conformidade com a Lei Federal nº 14.133/2021 e normativos internos da Universidade do Estado do Rio Grande do Norte (UERN), mapeando os eventos de risco, probabilidade, impacto, nível de tolerabilidade e respectivas ações preventivas e contingenciais ao longo do ciclo de vida da contratação.",
    ),

    criarTituloSecaoDocx("1. RISCOS NA FASE DE PLANEJAMENTO DA CONTRATAÇÃO"),
  ];

  if (riscosPlanejamento.length > 0) {
    elementos.push(criarTabelaFaseRiscos(riscosPlanejamento, 1));
  } else {
    elementos.push(criarParagrafoDocx("Nenhum risco cadastrado para esta fase."));
  }

  elementos.push(criarTituloSecaoDocx("2. RISCOS NA FASE DE SELEÇÃO DO FORNECEDOR (LICITAÇÃO / CONTRATAÇÃO DIRETA)"));
  if (riscosSelecao.length > 0) {
    elementos.push(criarTabelaFaseRiscos(riscosSelecao, riscosPlanejamento.length + 1));
  } else {
    elementos.push(criarParagrafoDocx("Nenhum risco cadastrado para esta fase."));
  }

  elementos.push(criarTituloSecaoDocx("3. RISCOS NA FASE DE GESTÃO E FISCALIZAÇÃO DO CONTRATO"));
  if (riscosGestao.length > 0) {
    elementos.push(criarTabelaFaseRiscos(riscosGestao, riscosPlanejamento.length + riscosSelecao.length + 1));
  } else {
    elementos.push(criarParagrafoDocx("Nenhum risco cadastrado para esta fase."));
  }

  elementos.push(
    criarTituloSecaoDocx("4. ESCALA DE CLASSIFICAÇÃO DE RISCO"),
    criarParagrafoDocx(
      "Probabilidade: B (Baixa), M (Média), A (Alta). Impacto: B (Baixo), M (Médio), A (Alto).\n" +
        "Níveis de Tolerância: Ampla (Baixo Risco - ações monitoradas), Intermediária (Médio Risco - ações preventivas mandatórias), Inaceitável (Alto Risco - intervenção imediata e acompanhamento contínuo).",
    ),
    ...criarBlocoAssinaturaDocx(
      dados.responsavelNome,
      "Responsável pela Análise de Riscos",
      dados.responsavelMatricula,
      dados.dataTexto || undefined,
    ),
  );

  const doc = new Document({
    sections: [
      {
        headers: {
          default: criarCabecalhoDocxUern(tituloHeader),
        },
        footers: {
          default: criarRodapeDocxUern(tituloHeader, dados.codigoVerificador),
        },
        children: elementos,
      },
    ],
  });

  return empacotarDocxParaBuffer(doc);
}
