import { carregarDfdParaPdf } from "@/lib/pdf/carregar-dfd";
import { gerarXlsxItensDfd } from "@/lib/pdf/dfd-xlsx";
import { numeroFormatado } from "@/lib/pdf/dfd-dados";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const resultado = await carregarDfdParaPdf(id);
  if ("erro" in resultado) {
    return new Response(resultado.erro, { status: resultado.status });
  }

  const buffer = await gerarXlsxItensDfd(resultado.dfd);
  const nomeArquivo = `Itens-DFD-${numeroFormatado(resultado.dfd).replace("/", "-")}.xlsx`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nomeArquivo}"`,
    },
  });
}
