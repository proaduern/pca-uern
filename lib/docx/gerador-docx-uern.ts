import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  Header,
  Footer,
  ImageRun,
  AlignmentType,
  WidthType,
  BorderStyle,
  Packer,
  PageNumber,
} from "docx";
import fs from "fs";
import path from "path";
import { brl } from "@/lib/formato";
import type { ItemDesdobradoMpe } from "@/lib/regramento-mpe";

// Caminho do Brasão UERN
function obterBytesBrasaoUern(): Buffer | null {
  try {
    const p = path.join(process.cwd(), "public", "brasao-uern.jpg");
    if (fs.existsSync(p)) {
      return fs.readFileSync(p);
    }
  } catch (err) {
    console.warn("Aviso ao ler brasao-uern.jpg:", err);
  }
  return null;
}

/**
 * Cria o Cabeçalho Institucional Padrão UERN para arquivos .docx
 */
export function criarCabecalhoDocxUern(subtitulo?: string): Header {
  const brasaoBytes = obterBytesBrasaoUern();
  const children: Paragraph[] = [];

  if (brasaoBytes) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        children: [
          new ImageRun({
            data: brasaoBytes,
            transformation: {
              width: 55,
              height: 70,
            },
            type: "jpg",
          }),
        ],
      }),
    );
  }

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [
        new TextRun({
          text: "UNIVERSIDADE DO ESTADO DO RIO GRANDE DO NORTE — UERN",
          bold: true,
          size: 19,
          font: "Arial",
          color: "003366",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [
        new TextRun({
          text: "PRÓ-REITORIA DE ADMINISTRAÇÃO — PROAD",
          bold: true,
          size: 17,
          font: "Arial",
          color: "333333",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: subtitulo ? 40 : 180 },
      children: [
        new TextRun({
          text: "Rua Almino Afonso, 478 — Centro, Mossoró/RN, CEP 59610-210 — Tel: (84) 3315-2146 — http://portal.uern.br/",
          size: 15,
          font: "Arial",
          color: "666666",
        }),
      ],
    }),
  );

  if (subtitulo) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 180 },
        children: [
          new TextRun({
            text: subtitulo,
            bold: true,
            size: 17,
            font: "Arial",
            color: "003366",
          }),
        ],
      }),
    );
  }

  return new Header({ children });
}

/**
 * Cria o Rodapé Padrão com Verificação de Autenticidade e Paginação
 */
export function criarRodapeDocxUern(
  tituloDoc: string,
  codigoVerificador?: string,
): Footer {
  const children: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { before: 80 },
      border: {
        top: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" },
      },
      children: [
        new TextRun({
          text: `${tituloDoc} — UERN / PROAD. `,
          size: 14,
          font: "Arial",
          color: "444444",
          bold: true,
        }),
        ...(codigoVerificador
          ? [
              new TextRun({
                text: `Documento Autenticado Digitalmente (Código Verificador: ${codigoVerificador}). `,
                size: 13,
                font: "Arial",
                color: "003366",
              }),
            ]
          : []),
        new TextRun({
          text: "Pág. ",
          size: 13,
          font: "Arial",
          color: "666666",
        }),
        new TextRun({
          children: [PageNumber.CURRENT],
          size: 13,
          font: "Arial",
          color: "666666",
        }),
        new TextRun({
          text: " de ",
          size: 13,
          font: "Arial",
          color: "666666",
        }),
        new TextRun({
          children: [PageNumber.TOTAL_PAGES],
          size: 13,
          font: "Arial",
          color: "666666",
        }),
      ],
    }),
  ];

  return new Footer({ children });
}

/**
 * Cria parágrafo formatado de título de seção (ex: 1. DO OBJETO)
 */
export function criarTituloSecaoDocx(texto: string): Paragraph {
  return new Paragraph({
    spacing: { before: 240, after: 120 },
    children: [
      new TextRun({
        text: texto,
        bold: true,
        size: 21,
        font: "Arial",
        color: "003366",
      }),
    ],
  });
}

/**
 * Cria parágrafo de texto padrão justificado com recuo
 */
export function criarParagrafoDocx(texto: string, bold = false): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 120, line: 276 },
    children: [
      new TextRun({
        text: texto,
        size: 20,
        font: "Arial",
        bold,
        color: "222222",
      }),
    ],
  });
}

/**
 * Cria bloco de assinatura formal
 */
export function criarBlocoAssinaturaDocx(
  nome: string,
  cargo: string,
  matricula?: string | null,
  dataTexto?: string,
): Paragraph[] {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 400, after: 40 },
      children: [
        new TextRun({
          text: "_________________________________________________________",
          color: "666666",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [
        new TextRun({
          text: nome,
          bold: true,
          size: 19,
          font: "Arial",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [
        new TextRun({
          text: cargo + (matricula ? ` — Matrícula: ${matricula}` : ""),
          size: 17,
          font: "Arial",
          color: "444444",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: dataTexto || `Mossoró/RN, ${new Date().toLocaleDateString("pt-BR")}`,
          size: 15,
          font: "Arial",
          color: "666666",
        }),
      ],
    }),
  ];
}

/**
 * Tabela de Itens com classificação automática LC Estadual nº 675/2020-RN
 */
export function criarTabelaItensDocx(itens: ItemDesdobradoMpe[]): Table {
  const bordaPadrao = {
    top: { style: BorderStyle.SINGLE, size: 2, color: "AAAAAA" },
    bottom: { style: BorderStyle.SINGLE, size: 2, color: "AAAAAA" },
    left: { style: BorderStyle.SINGLE, size: 2, color: "AAAAAA" },
    right: { style: BorderStyle.SINGLE, size: 2, color: "AAAAAA" },
  };

  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      new TableCell({
        width: { size: 8, type: WidthType.PERCENTAGE },
        borders: bordaPadrao,
        shading: { fill: "003366" },
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Item", bold: true, color: "FFFFFF", size: 16, font: "Arial" })] })],
      }),
      new TableCell({
        width: { size: 36, type: WidthType.PERCENTAGE },
        borders: bordaPadrao,
        shading: { fill: "003366" },
        children: [new Paragraph({ children: [new TextRun({ text: "Descrição do Objeto", bold: true, color: "FFFFFF", size: 16, font: "Arial" })] })],
      }),
      new TableCell({
        width: { size: 8, type: WidthType.PERCENTAGE },
        borders: bordaPadrao,
        shading: { fill: "003366" },
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Unid.", bold: true, color: "FFFFFF", size: 16, font: "Arial" })] })],
      }),
      new TableCell({
        width: { size: 8, type: WidthType.PERCENTAGE },
        borders: bordaPadrao,
        shading: { fill: "003366" },
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Qtd.", bold: true, color: "FFFFFF", size: 16, font: "Arial" })] })],
      }),
      new TableCell({
        width: { size: 14, type: WidthType.PERCENTAGE },
        borders: bordaPadrao,
        shading: { fill: "003366" },
        children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "Valor Unit. (R$)", bold: true, color: "FFFFFF", size: 16, font: "Arial" })] })],
      }),
      new TableCell({
        width: { size: 14, type: WidthType.PERCENTAGE },
        borders: bordaPadrao,
        shading: { fill: "003366" },
        children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "Valor Total (R$)", bold: true, color: "FFFFFF", size: 16, font: "Arial" })] })],
      }),
      new TableCell({
        width: { size: 12, type: WidthType.PERCENTAGE },
        borders: bordaPadrao,
        shading: { fill: "003366" },
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Enquadramento (LC 675/20)", bold: true, color: "FFFFFF", size: 16, font: "Arial" })] })],
      }),
    ],
  });

  const rows: TableRow[] = [headerRow];
  let totalGeral = 0;

  for (const it of itens) {
    totalGeral += it.valorTotalEstimado;
    const zebra = rows.length % 2 === 0 ? "F8F9FA" : "FFFFFF";

    rows.push(
      new TableRow({
        children: [
          new TableCell({
            width: { size: 8, type: WidthType.PERCENTAGE },
            borders: bordaPadrao,
            shading: { fill: zebra },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: it.ordemExibicao, bold: true, size: 16, font: "Arial" })] })],
          }),
          new TableCell({
            width: { size: 36, type: WidthType.PERCENTAGE },
            borders: bordaPadrao,
            shading: { fill: zebra },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: it.descricaoExibicao, size: 16, font: "Arial", bold: it.isCotaReservada }),
                  ...(it.unidadesDemandantes ? [new TextRun({ text: `\nDemandantes: ${it.unidadesDemandantes}`, size: 13, font: "Arial", color: "555555" })] : []),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 8, type: WidthType.PERCENTAGE },
            borders: bordaPadrao,
            shading: { fill: zebra },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: it.unidadeMedida, size: 16, font: "Arial" })] })],
          }),
          new TableCell({
            width: { size: 8, type: WidthType.PERCENTAGE },
            borders: bordaPadrao,
            shading: { fill: zebra },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(it.quantidade), size: 16, font: "Arial" })] })],
          }),
          new TableCell({
            width: { size: 14, type: WidthType.PERCENTAGE },
            borders: bordaPadrao,
            shading: { fill: zebra },
            children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: brl(it.valorUnitarioEstimado), size: 16, font: "Arial" })] })],
          }),
          new TableCell({
            width: { size: 14, type: WidthType.PERCENTAGE },
            borders: bordaPadrao,
            shading: { fill: zebra },
            children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: brl(it.valorTotalEstimado), size: 16, font: "Arial", bold: true })] })],
          }),
          new TableCell({
            width: { size: 12, type: WidthType.PERCENTAGE },
            borders: bordaPadrao,
            shading: { fill: zebra },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: it.cotaRotulo,
                    size: 13,
                    font: "Arial",
                    bold: true,
                    color: it.cotaRotulo.includes("Exclusivo") ? "006600" : it.cotaRotulo.includes("Reservada") ? "996600" : "003366",
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    );
  }

  // Linha de Total Geral
  rows.push(
    new TableRow({
      children: [
        new TableCell({
          columnSpan: 5,
          borders: bordaPadrao,
          shading: { fill: "EEEEEE" },
          children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "VALOR TOTAL ESTIMADO DA CONTRATAÇÃO:", bold: true, size: 16, font: "Arial" })] })],
        }),
        new TableCell({
          borders: bordaPadrao,
          shading: { fill: "EEEEEE" },
          children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: brl(totalGeral), bold: true, size: 17, font: "Arial", color: "003366" })] })],
        }),
        new TableCell({
          borders: bordaPadrao,
          shading: { fill: "EEEEEE" },
          children: [new Paragraph({ children: [] })],
        }),
      ],
    }),
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows,
  });
}

/**
 * Formata a data por extenso padrão UERN (Mossoró/RN)
 */
export function formatarDataExtenso(data: Date = new Date()): string {
  const d = data instanceof Date ? data : new Date(data);
  const dia = d.getDate().toString().padStart(2, "0");
  const meses = [
    "janeiro",
    "fevereiro",
    "março",
    "abril",
    "maio",
    "junho",
    "julho",
    "agosto",
    "setembro",
    "outubro",
    "novembro",
    "dezembro",
  ];
  const mes = meses[d.getMonth()] || "janeiro";
  const ano = d.getFullYear();
  return `Mossoró/RN, ${dia} de ${mes} de ${ano}`;
}

/**
 * Converte o Documento Docx em Buffer binário para download HTTP
 */
export async function empacotarDocxParaBuffer(doc: Document): Promise<Buffer> {
  return Packer.toBuffer(doc);
}
