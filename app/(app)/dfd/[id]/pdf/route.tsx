import { renderToBuffer } from "@react-pdf/renderer";
import { carregarDfdParaPdf } from "@/lib/pdf/carregar-dfd";
import { DfdDocumento } from "@/lib/pdf/dfd-documento";
import { numeroFormatado } from "@/lib/pdf/dfd-dados";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const resultado = await carregarDfdParaPdf(id);
  if ("erro" in resultado) {
    return new Response(resultado.erro, { status: resultado.status });
  }

  const buffer = await renderToBuffer(<DfdDocumento dfd={resultado.dfd} />);
  const nomeArquivo = `DFD-${numeroFormatado(resultado.dfd).replace("/", "-")}.pdf`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nomeArquivo}"`,
    },
  });
}
