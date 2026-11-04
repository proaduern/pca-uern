import { renderToBuffer } from "@react-pdf/renderer";
import { carregarPcaConsolidado } from "@/lib/pdf/carregar-pca-consolidado";
import { PcaConsolidadoDocumento } from "@/lib/pdf/pca-consolidado-documento";
import { totaisConsolidado } from "@/lib/pca-consolidado";
import { registrarAutenticacaoPdf } from "@/lib/pdf/autenticacao";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ ano: string }> },
) {
  const { ano } = await params;
  const resultado = await carregarPcaConsolidado(Number(ano));
  if ("erro" in resultado) {
    return new Response(resultado.erro, { status: resultado.status });
  }

  const totais = totaisConsolidado(resultado.linhas);
  const autenticacao = await registrarAutenticacaoPdf({
    tipoDocumento: "PCA_CONSOLIDADO",
    referenciaId: `PCA-${resultado.ano}`,
    titulo: `Plano de Contratações Anuais Consolidado — PCA ${resultado.ano}`,
    unidadeOuSetor: "PROAD / UERN",
    valorTotal: totais.total,
    resumo: {
      "Ano do PCA": resultado.ano,
      "Categorias Consolidadas": resultado.linhas.length,
    },
  });

  const buffer = await renderToBuffer(
    <PcaConsolidadoDocumento
      ano={resultado.ano}
      linhas={resultado.linhas}
      autenticacao={autenticacao}
    />,
  );

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="PCA-Consolidado-${resultado.ano}.pdf"`,
    },
  });
}
