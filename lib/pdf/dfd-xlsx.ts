import ExcelJS from "exceljs";
import { numeroFormatado, totalDoDfd, type DfdParaPdf } from "./dfd-dados";

export async function gerarXlsxItensDfd(dfd: DfdParaPdf): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Itens do DFD");

  sheet.columns = [
    { header: "Categoria", key: "categoria", width: 30 },
    { header: "Item", key: "item", width: 40 },
    { header: "Quantidade", key: "quantidade", width: 12 },
    { header: "Valor unitário", key: "valorUnit", width: 16 },
    { header: "Valor total", key: "valorTotal", width: 16 },
  ];
  sheet.getRow(1).font = { bold: true };

  for (const it of dfd.itens) {
    sheet.addRow({
      categoria: it.categoriaNome,
      item: it.nome,
      quantidade: it.quantidade ?? "",
      valorUnit: it.valorUnit ?? "",
      valorTotal: it.valorTotal,
    });
  }

  const linhaTotal = sheet.addRow({ item: "Total", valorTotal: totalDoDfd(dfd) });
  linhaTotal.font = { bold: true };

  sheet.getColumn("valorUnit").numFmt = "R$ #,##0.00";
  sheet.getColumn("valorTotal").numFmt = "R$ #,##0.00";

  sheet.insertRow(1, [`Itens do DFD nº ${numeroFormatado(dfd)} — ${dfd.unidadeNome}`]);
  sheet.mergeCells(1, 1, 1, 5);
  sheet.getRow(1).font = { bold: true, size: 12 };
  sheet.getRow(2).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
