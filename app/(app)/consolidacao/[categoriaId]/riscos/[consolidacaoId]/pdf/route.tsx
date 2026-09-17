import { renderToBuffer } from "@react-pdf/renderer";
import { carregarRiscosParaPdf } from "@/lib/pdf/carregar-riscos";
import { RiscosDocumento } from "@/lib/pdf/riscos-documento";

export async function GET(_request: Request, { params }: { params: Promise<{ consolidacaoId: string }> }) {
  const { consolidacaoId } = await params;
  const resultado = await carregarRiscosParaPdf(consolidacaoId);
  if ("erro" in resultado) {
    return new Response(resultado.erro, { status: resultado.status });
  }

  const buffer = await renderToBuffer(<RiscosDocumento riscos={resultado.riscos} />);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Riscos-${consolidacaoId}.pdf"`,
    },
  });
}
