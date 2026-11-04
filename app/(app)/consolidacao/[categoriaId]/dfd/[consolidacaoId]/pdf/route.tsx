import { renderToBuffer } from "@react-pdf/renderer";
import { carregarDfdConsolidadoParaPdf } from "@/lib/pdf/carregar-dfd-consolidado";
import { DfdConsolidadoDocumento } from "@/lib/pdf/dfd-consolidado-documento";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ consolidacaoId: string }> },
) {
  const { consolidacaoId } = await params;
  const resultado = await carregarDfdConsolidadoParaPdf(consolidacaoId);
  if ("erro" in resultado) {
    return new Response(resultado.erro, { status: resultado.status });
  }

  const buffer = await renderToBuffer(<DfdConsolidadoDocumento dados={resultado.dados} />);
  const seiLimpo = resultado.dados.processoSEI.replace(/[^a-zA-Z0-9_-]/g, "-") || consolidacaoId;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="DFD-CONSOLIDADO-${seiLimpo}.pdf"`,
    },
  });
}
