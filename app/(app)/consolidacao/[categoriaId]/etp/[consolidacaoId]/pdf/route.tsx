import { renderToBuffer } from "@react-pdf/renderer";
import { carregarEtpParaPdf } from "@/lib/pdf/carregar-etp";
import { EtpDocumento } from "@/lib/pdf/etp-documento";

export async function GET(_request: Request, { params }: { params: Promise<{ consolidacaoId: string }> }) {
  const { consolidacaoId } = await params;
  const resultado = await carregarEtpParaPdf(consolidacaoId);
  if ("erro" in resultado) {
    return new Response(resultado.erro, { status: resultado.status });
  }

  const buffer = await renderToBuffer(<EtpDocumento etp={resultado.etp} />);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="ETP-${consolidacaoId}.pdf"`,
    },
  });
}
