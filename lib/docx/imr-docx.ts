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
import type { ItemImrPadrao } from "@/lib/imr-padrao";

export interface DadosImrDocx {
  processoSEI: string;
  categoriaNome: string;
  tipoModelo: "DEDICACAO_EXCLUSIVA" | "SERVICOS_GERAIS";
  sequencialTexto?: string; // Ex: "Instrumento de Medição de Resultado nº 01/2026 - DLC/PROAD/UERN"
  codigoVerificador?: string;
  responsavelNome: string;
  responsavelMatricula?: string | null;
  itens: ItemImrPadrao[];
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

function criarTabelaFaixasGlosa(): Table {
  const celulaCabecalho = (texto: string, larguraPct: number) =>
    new TableCell({
      width: { size: larguraPct, type: WidthType.PERCENTAGE },
      shading: { fill: "1E3A8A" },
      margins: { top: 80, bottom: 80, left: 80, right: 80 },
      children: [
        new Paragraph({
          children: [
            new (require("docx").TextRun)({
              text: texto,
              bold: true,
              color: "FFFFFF",
              size: 16,
              font: "Arial",
            }),
          ],
          alignment: AlignmentType.CENTER,
        }),
      ],
    });

  const celula = (texto: string, larguraPct: number, alinhamento: any = AlignmentType.LEFT, negrito = false) =>
    new TableCell({
      width: { size: larguraPct, type: WidthType.PERCENTAGE },
      margins: { top: 60, bottom: 60, left: 60, right: 60 },
      children: [
        new Paragraph({
          children: [
            new (require("docx").TextRun)({
              text: texto,
              bold: negrito,
              size: 15,
              font: "Arial",
            }),
          ],
          alignment: alinhamento,
        }),
      ],
    });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: BORDAS_TABELA,
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          celulaCabecalho("Pontuação Acumulada no Período", 40),
          celulaCabecalho("Conceito / Avaliação", 30),
          celulaCabecalho("Percentual de Desconto / Glosa", 30),
        ],
      }),
      new TableRow({
        children: [
          celula("Até 5,0 pontos", 40, AlignmentType.CENTER),
          celula("Excelente / Ótimo", 30, AlignmentType.CENTER),
          celula("0% (Pagamento Integral - 100%)", 30, AlignmentType.CENTER, true),
        ],
      }),
      new TableRow({
        children: [
          celula("De 5,1 a 10,0 pontos", 40, AlignmentType.CENTER),
          celula("Bom / Regular com ressalva", 30, AlignmentType.CENTER),
          celula("Glosa de 2% do valor da fatura", 30, AlignmentType.CENTER),
        ],
      }),
      new TableRow({
        children: [
          celula("De 10,1 a 20,0 pontos", 40, AlignmentType.CENTER),
          celula("Regular / Insatisfatório", 30, AlignmentType.CENTER),
          celula("Glosa de 5% do valor da fatura", 30, AlignmentType.CENTER),
        ],
      }),
      new TableRow({
        children: [
          celula("Acima de 20,0 pontos", 40, AlignmentType.CENTER),
          celula("Crítico / Inadimplemento Grave", 30, AlignmentType.CENTER),
          celula("Glosa de 10% + Abertura de Processo Sancionatório", 30, AlignmentType.CENTER, true),
        ],
      }),
    ],
  });
}

function criarTabelaItensImr(itens: ItemImrPadrao[]): Table {
  const celulaCabecalho = (texto: string, larguraPct: number) =>
    new TableCell({
      width: { size: larguraPct, type: WidthType.PERCENTAGE },
      shading: { fill: "1E3A8A" },
      margins: { top: 80, bottom: 80, left: 80, right: 80 },
      children: [
        new Paragraph({
          children: [
            new (require("docx").TextRun)({
              text: texto,
              bold: true,
              color: "FFFFFF",
              size: 15,
              font: "Arial",
            }),
          ],
          alignment: AlignmentType.CENTER,
        }),
      ],
    });

  const celula = (texto: string, larguraPct: number, alinhamento: any = AlignmentType.LEFT, negrito = false) =>
    new TableCell({
      width: { size: larguraPct, type: WidthType.PERCENTAGE },
      margins: { top: 60, bottom: 60, left: 60, right: 60 },
      children: [
        new Paragraph({
          children: [
            new (require("docx").TextRun)({
              text: texto,
              bold: negrito,
              size: 15,
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
        celulaCabecalho("Nº", 6),
        celulaCabecalho("Indicador", 22),
        celulaCabecalho("Escopo / Área", 16),
        celulaCabecalho("Ocorrência / Não Conformidade Mapeada", 44),
        celulaCabecalho("Pontuação", 12),
      ],
    }),
  ];

  itens.forEach((it, idx) => {
    linhas.push(
      new TableRow({
        children: [
          celula((idx + 1).toString().padStart(2, "0"), 6, AlignmentType.CENTER),
          celula(it.indicadorNome, 22),
          celula(it.servicoEscopo, 16, AlignmentType.CENTER),
          celula(it.descricao, 44),
          celula(it.pontuacaoTexto, 12, AlignmentType.CENTER, true),
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

export async function gerarBufferDocxImr(dados: DadosImrDocx): Promise<Buffer> {
  const tituloHeader = dados.sequencialTexto || "INSTRUMENTO DE MEDIÇÃO DE RESULTADO — IMR (UERN)";
  const subtituloModelo =
    dados.tipoModelo === "DEDICACAO_EXCLUSIVA"
      ? "MODELO A — SERVIÇOS CONTINUADOS COM DEDICAÇÃO EXCLUSIVA DE MÃO DE OBRA (PADRÃO ZELO)"
      : "MODELO B — SERVIÇOS EM GERAL SEM DEDICAÇÃO EXCLUSIVA (QUALIDADE, PRAZO & SLA)";

  const doc = new Document({
    sections: [
      {
        headers: {
          default: criarCabecalhoDocxUern(tituloHeader),
        },
        footers: {
          default: criarRodapeDocxUern(tituloHeader, dados.codigoVerificador),
        },
        children: [
          criarParagrafoDocx(`PROCESSO ADMINISTRATIVO SEI Nº ${dados.processoSEI}`, true),
          criarParagrafoDocx(`CATEGORIA DO PLANO DE CONTRATAÇÕES: ${dados.categoriaNome.toUpperCase()}`, true),
          criarParagrafoDocx(`ENQUADRAMENTO: ${subtituloModelo}`, true),

          criarTituloSecaoDocx("1. DISPOSIÇÕES GERAIS E OBJETIVOS DO IMR"),
          criarParagrafoDocx(
            "O presente Instrumento de Medição de Resultado (IMR) estabelece as diretrizes, indicadores de conformidade e critérios objetivos para a aferição mensal ou por entrega dos serviços contratados pela Universidade do Estado do Rio Grande do Norte (UERN), visando atrelar o pagamento à efetiva entrega com o padrão de qualidade pactuado, nos termos do art. 92, inciso XVII e art. 143 da Lei Federal nº 14.133/2021.",
          ),

          criarTituloSecaoDocx("2. FAIXAS DE AVALIAÇÃO E REGRA DE GLOSA"),
          criarParagrafoDocx(
            "A pontuação de penalidades atribuída a cada descumprimento ou não conformidade constatada durante a fiscalização técnica e setorial será somada mensalmente para fins de cálculo de eventuais retenções/descontos na fatura:",
          ),
          criarTabelaFaixasGlosa(),

          criarTituloSecaoDocx("3. CATÁLOGO DE OCORRÊNCIAS, INDICADORES E PONTUAÇÃO"),
          criarParagrafoDocx(
            "Abaixo estão detalhados os eventos de inexecução ou desconformidade passíveis de apuração e respectiva pontuação:",
          ),
          criarTabelaItensImr(dados.itens),

          criarTituloSecaoDocx("4. PROCEDIMENTO DE NOTIFICAÇÃO E CONTRADITÓRIO"),
          criarParagrafoDocx(
            "Constatada a desconformidade, a fiscalização do contrato notificará formalmente o preposto da contratada, assegurando o prazo regulamentar para regularização e apresentação de justificativas antes da consolidação do relatório de medição mensal.",
          ),

          ...criarBlocoAssinaturaDocx(
            dados.responsavelNome,
            "Responsável pela Elaboração do IMR",
            dados.responsavelMatricula,
            dados.dataTexto,
          ),
        ],
      },
    ],
  });

  return empacotarDocxParaBuffer(doc);
}
