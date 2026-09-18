import { renderToBuffer } from "@react-pdf/renderer";
import { carregarTermoReferenciaParaPdf } from "@/lib/pdf/carregar-termo-referencia";
import { TermoReferenciaDocumento } from "@/lib/pdf/termo-referencia-documento";

export async function GET(_request: Request, { params }: { params: Promise<{ consolidacaoId: string }> }) {
  const { consolidacaoId } = await params;
  const resultado = await carregarTermoReferenciaParaPdf(consolidacaoId);
  if ("erro" in resultado) {
    return new Response(resultado.erro, { status: resultado.status });
  }

  const buffer = await renderToBuffer(<TermoReferenciaDocumento tr={resultado.tr} />);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="TermoReferencia-${consolidacaoId}.pdf"`,
    },
  });
}
