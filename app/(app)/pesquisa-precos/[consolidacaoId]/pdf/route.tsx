import { renderToBuffer } from "@react-pdf/renderer";
import { carregarPesquisaPrecosParaPdf } from "@/lib/pdf/carregar-pesquisa-precos";
import { PesquisaPrecosDocumento } from "@/lib/pdf/pesquisa-precos-documento";

export async function GET(_request: Request, { params }: { params: Promise<{ consolidacaoId: string }> }) {
  const { consolidacaoId } = await params;
  const resultado = await carregarPesquisaPrecosParaPdf(consolidacaoId);
  if ("erro" in resultado) {
    return new Response(resultado.erro, { status: resultado.status });
  }

  const buffer = await renderToBuffer(<PesquisaPrecosDocumento pesquisa={resultado.pesquisa} />);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="PesquisaPrecos-${consolidacaoId}.pdf"`,
    },
  });
}
