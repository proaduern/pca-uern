import { renderToBuffer } from "@react-pdf/renderer";
import { carregarPcaConsolidado } from "@/lib/pdf/carregar-pca-consolidado";
import { PcaConsolidadoDocumento } from "@/lib/pdf/pca-consolidado-documento";

export async function GET(_request: Request, { params }: { params: Promise<{ ano: string }> }) {
  const { ano } = await params;
  const resultado = await carregarPcaConsolidado(Number(ano));
  if ("erro" in resultado) {
    return new Response(resultado.erro, { status: resultado.status });
  }

  const buffer = await renderToBuffer(<PcaConsolidadoDocumento ano={resultado.ano} linhas={resultado.linhas} />);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="PCA-Consolidado-${resultado.ano}.pdf"`,
    },
  });
}
