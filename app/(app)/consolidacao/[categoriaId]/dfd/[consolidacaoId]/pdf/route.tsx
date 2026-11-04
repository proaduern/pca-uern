import { renderToBuffer } from "@react-pdf/renderer";
import { carregarDfdConsolidadoParaPdf } from "@/lib/pdf/carregar-dfd-consolidado";
import { DfdConsolidadoDocumento } from "@/lib/pdf/dfd-consolidado-documento";
import { registrarAutenticacaoPdf } from "@/lib/pdf/autenticacao";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ consolidacaoId: string }> },
) {
  const { consolidacaoId } = await params;
  const resultado = await carregarDfdConsolidadoParaPdf(consolidacaoId);
  if ("erro" in resultado) {
    return new Response(resultado.erro, { status: resultado.status });
  }

  const autenticacao = await registrarAutenticacaoPdf({
    tipoDocumento: "DFD_CONSOLIDADO",
    referenciaId: consolidacaoId,
    titulo: `DFD Consolidado nº ${resultado.dados.numeroConsolidacao} — ${resultado.dados.categoriaNome}`,
    processoSEI: resultado.dados.processoSEI,
    unidadeOuSetor: resultado.dados.setorTecnicoNome,
    responsavelNome: resultado.dados.responsavelNome,
    responsavelMatricula: resultado.dados.responsavelMatricula,
    valorTotal: resultado.dados.totalEstimadoGeral,
    resumo: {
      Categoria: resultado.dados.categoriaNome,
      "Itens Consolidados": resultado.dados.itensConsolidados.length,
      "Demandas de Origem": resultado.dados.demandasOrigem.length,
    },
  });

  const buffer = await renderToBuffer(
    <DfdConsolidadoDocumento dados={resultado.dados} autenticacao={autenticacao} />,
  );
  const seiLimpo = resultado.dados.processoSEI.replace(/[^a-zA-Z0-9_-]/g, "-") || consolidacaoId;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="DFD-CONSOLIDADO-${seiLimpo}.pdf"`,
    },
  });
}
