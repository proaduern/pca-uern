import { carregarRelatorioItens } from "@/lib/pdf/carregar-relatorio-itens";
import { gerarXlsxRelatorioItens } from "@/lib/pdf/relatorio-itens-xlsx";

export async function GET() {
  const resultado = await carregarRelatorioItens();
  if ("erro" in resultado) {
    return new Response(resultado.erro, { status: resultado.status });
  }

  const buffer = await gerarXlsxRelatorioItens(resultado.unidadeNome, resultado.itens);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="Relatorio-Geral-Itens.xlsx"`,
    },
  });
}
