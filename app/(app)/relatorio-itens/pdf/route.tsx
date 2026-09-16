import { renderToBuffer } from "@react-pdf/renderer";
import { carregarRelatorioItens } from "@/lib/pdf/carregar-relatorio-itens";
import { RelatorioItensDocumento } from "@/lib/pdf/relatorio-itens-documento";

export async function GET() {
  const resultado = await carregarRelatorioItens();
  if ("erro" in resultado) {
    return new Response(resultado.erro, { status: resultado.status });
  }

  const buffer = await renderToBuffer(
    <RelatorioItensDocumento unidadeNome={resultado.unidadeNome} itens={resultado.itens} />,
  );

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Relatorio-Geral-Itens.pdf"`,
    },
  });
}
