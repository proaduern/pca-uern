import { renderToBuffer } from "@react-pdf/renderer";
import { carregarDfdParaPdf } from "@/lib/pdf/carregar-dfd";
import { DfdDocumento } from "@/lib/pdf/dfd-documento";
import { numeroFormatado, totalDoDfd } from "@/lib/pdf/dfd-dados";
import { registrarAutenticacaoPdf } from "@/lib/pdf/autenticacao";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const resultado = await carregarDfdParaPdf(id);
  if ("erro" in resultado) {
    return new Response(resultado.erro, { status: resultado.status });
  }

  const num = numeroFormatado(resultado.dfd);
  const autenticacao = await registrarAutenticacaoPdf({
    tipoDocumento: "DFD",
    referenciaId: id,
    titulo: `DFD nº ${num} — ${resultado.dfd.unidadeNome}`,
    unidadeOuSetor: resultado.dfd.unidadeNome,
    responsavelNome: resultado.dfd.responsavelNome,
    responsavelMatricula: resultado.dfd.responsavelMatricula,
    valorTotal: totalDoDfd(resultado.dfd),
    resumo: {
      "Número do DFD": num,
      "Quantidade de Itens": resultado.dfd.itens.length,
    },
  });

  const buffer = await renderToBuffer(
    <DfdDocumento dfd={resultado.dfd} autenticacao={autenticacao} />,
  );
  const nomeArquivo = `DFD-${num.replace("/", "-")}.pdf`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nomeArquivo}"`,
    },
  });
}
