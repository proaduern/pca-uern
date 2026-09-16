import ExcelJS from "exceljs";
import { totaisConsolidado, type LinhaConsolidado } from "@/lib/pca-consolidado";

export async function gerarXlsxPcaConsolidado(ano: number, linhas: LinhaConsolidado[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Consolidado");

  sheet.columns = [
    { header: "Classificação / Rubrica Geral", key: "rubrica", width: 40 },
    { header: "Modalidade", key: "modalidade", width: 20 },
    { header: "Categoria", key: "categoria", width: 40 },
    { header: "Convênios", key: "convenio", width: 16 },
    { header: "Recursos arrecadados pela Unidade (Recursos Extra)", key: "recursosExtra", width: 20 },
    { header: "Fonte 500 (Geral + OP)", key: "fonte500", width: 18 },
    { header: "TOTAL", key: "total", width: 16 },
    { header: "Código PNCP", key: "codigoPncp", width: 20 },
  ];

  for (const l of linhas) {
    sheet.addRow({
      rubrica: l.classificacaoRubrica,
      modalidade: l.modalidade,
      categoria: l.categoriaNome,
      convenio: l.convenio,
      recursosExtra: l.recursosExtra,
      fonte500: l.fonte500,
      total: l.total,
      codigoPncp: l.codigoPncp ?? "",
    });
  }

  const totais = totaisConsolidado(linhas);
  const linhaTotal = sheet.addRow({
    categoria: "TOTAIS",
    convenio: totais.convenio,
    recursosExtra: totais.recursosExtra,
    fonte500: totais.fonte500,
    total: totais.total,
  });
  linhaTotal.font = { bold: true };

  sheet.addRow({});
  const linhaFonte500 = sheet.addRow({ categoria: "PCA FONTE 500", convenio: totais.fonte500 });
  linhaFonte500.font = { bold: true };
  const linhaTotalGeral = sheet.addRow({
    categoria: "PCA TOTAL (500 + CONVÊNIOS + OUTRAS FONTES)",
    convenio: totais.total,
  });
  linhaTotalGeral.font = { bold: true };

  for (const chave of ["convenio", "recursosExtra", "fonte500", "total"]) {
    sheet.getColumn(chave).numFmt = "R$ #,##0.00";
  }

  sheet.getRow(1).font = { bold: true };
  sheet.insertRow(1, [`PLANO DE CONTRATAÇÕES ANUAIS – PCA ${ano}`]);
  sheet.mergeCells(1, 1, 1, 8);
  sheet.getRow(1).font = { bold: true, size: 12 };
  sheet.getRow(2).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
