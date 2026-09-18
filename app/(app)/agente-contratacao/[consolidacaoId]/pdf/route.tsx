import { renderToBuffer } from "@react-pdf/renderer";
import { carregarMinutaEditalParaPdf } from "@/lib/pdf/carregar-minuta-edital";
import { MinutaEditalDocumento } from "@/lib/pdf/minuta-edital-documento";

export async function GET(_request: Request, { params }: { params: Promise<{ consolidacaoId: string }> }) {
  const { consolidacaoId } = await params;
  const resultado = await carregarMinutaEditalParaPdf(consolidacaoId);
  if ("erro" in resultado) {
    return new Response(resultado.erro, { status: resultado.status });
  }

  const buffer = await renderToBuffer(<MinutaEditalDocumento minuta={resultado.minuta} />);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="MinutaEdital-${consolidacaoId}.pdf"`,
    },
  });
}
