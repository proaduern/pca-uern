import { carregarPcaConsolidado } from "@/lib/pdf/carregar-pca-consolidado";
import { gerarXlsxPcaConsolidado } from "@/lib/pdf/pca-consolidado-xlsx";

export async function GET(_request: Request, { params }: { params: Promise<{ ano: string }> }) {
  const { ano } = await params;
  const resultado = await carregarPcaConsolidado(Number(ano));
  if ("erro" in resultado) {
    return new Response(resultado.erro, { status: resultado.status });
  }

  const buffer = await gerarXlsxPcaConsolidado(resultado.ano, resultado.linhas);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="PCA-Consolidado-${resultado.ano}.xlsx"`,
    },
  });
}
