import { renderToBuffer } from "@react-pdf/renderer";
import { carregarMinutaEditalParaPdf } from "@/lib/pdf/carregar-minuta-edital";
import { MinutaEditalDocumento } from "@/lib/pdf/minuta-edital-documento";
import { totalItensMinuta } from "@/lib/pdf/minuta-edital-dados";
import { registrarAutenticacaoPdf } from "@/lib/pdf/autenticacao";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ consolidacaoId: string }> },
) {
  const { consolidacaoId } = await params;
  const resultado = await carregarMinutaEditalParaPdf(consolidacaoId);
  if ("erro" in resultado) {
    return new Response(resultado.erro, { status: resultado.status });
  }

  const autenticacao = await registrarAutenticacaoPdf({
    tipoDocumento: "MINUTA_EDITAL",
    referenciaId: consolidacaoId,
    titulo: `Minuta de Edital — ${resultado.minuta.categoriaNome}`,
    processoSEI: resultado.minuta.processoSEI,
    responsavelNome: resultado.minuta.responsavelNome,
    responsavelMatricula: resultado.minuta.responsavelMatricula,
    valorTotal: totalItensMinuta(resultado.minuta),
    resumo: {
      Categoria: resultado.minuta.categoriaNome,
      "Itens do Edital": resultado.minuta.itens.length,
    },
  });

  const buffer = await renderToBuffer(
    <MinutaEditalDocumento minuta={resultado.minuta} autenticacao={autenticacao} />,
  );

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="MinutaEdital-${consolidacaoId}.pdf"`,
    },
  });
}
