import ExcelJS from "exceljs";
import { totalDosItens, type ItemParaRelatorio } from "@/lib/relatorio-unidade";

export async function gerarXlsxRelatorioItens(unidadeNome: string, itens: ItemParaRelatorio[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Relatório Geral de Itens");

  sheet.columns = [
    { header: "Categoria", key: "categoria", width: 30 },
    { header: "Item", key: "item", width: 40 },
    { header: "Quantidade", key: "quantidade", width: 12 },
    { header: "Valor unitário", key: "valorUnit", width: 16 },
    { header: "Valor total", key: "valorTotal", width: 16 },
  ];
  sheet.getRow(1).font = { bold: true };

  for (const it of itens) {
    sheet.addRow({
      categoria: it.categoriaNome,
      item: it.nome,
      quantidade: it.quantidade ?? "",
      valorUnit: it.valorUnit ?? "",
      valorTotal: it.valorTotal,
    });
  }

  const linhaTotal = sheet.addRow({ item: "Total", valorTotal: totalDosItens(itens) });
  linhaTotal.font = { bold: true };

  sheet.getColumn("valorUnit").numFmt = "R$ #,##0.00";
  sheet.getColumn("valorTotal").numFmt = "R$ #,##0.00";

  sheet.insertRow(1, [`Relatório Geral de Itens — ${unidadeNome}`]);
  sheet.mergeCells(1, 1, 1, 5);
  sheet.getRow(1).font = { bold: true, size: 12 };
  sheet.getRow(2).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
