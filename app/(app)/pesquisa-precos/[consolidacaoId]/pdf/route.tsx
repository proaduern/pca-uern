import { renderToBuffer } from "@react-pdf/renderer";
import { carregarPesquisaPrecosParaPdf } from "@/lib/pdf/carregar-pesquisa-precos";
import { PesquisaPrecosDocumento } from "@/lib/pdf/pesquisa-precos-documento";
import { totalPesquisaPrecosPdf } from "@/lib/pdf/pesquisa-precos-dados";
import { registrarAutenticacaoPdf } from "@/lib/pdf/autenticacao";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ consolidacaoId: string }> },
) {
  const { consolidacaoId } = await params;
  const resultado = await carregarPesquisaPrecosParaPdf(consolidacaoId);
  if ("erro" in resultado) {
    return new Response(resultado.erro, { status: resultado.status });
  }

  const autenticacao = await registrarAutenticacaoPdf({
    tipoDocumento: "PESQUISA_PRECOS",
    referenciaId: consolidacaoId,
    titulo: `Pesquisa de Preços — ${resultado.pesquisa.categoriaNome}`,
    processoSEI: resultado.pesquisa.processoSEI,
    responsavelNome: resultado.pesquisa.responsavelNome,
    responsavelMatricula: resultado.pesquisa.responsavelMatricula,
    valorTotal: totalPesquisaPrecosPdf(resultado.pesquisa),
    resumo: {
      Categoria: resultado.pesquisa.categoriaNome,
      "Itens Pesquisados": resultado.pesquisa.itens.length,
    },
  });

  const buffer = await renderToBuffer(
    <PesquisaPrecosDocumento pesquisa={resultado.pesquisa} autenticacao={autenticacao} />,
  );

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="PesquisaPrecos-${consolidacaoId}.pdf"`,
    },
  });
}
