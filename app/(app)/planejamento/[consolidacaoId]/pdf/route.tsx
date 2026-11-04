import { renderToBuffer } from "@react-pdf/renderer";
import { carregarTermoReferenciaParaPdf } from "@/lib/pdf/carregar-termo-referencia";
import { TermoReferenciaDocumento } from "@/lib/pdf/termo-referencia-documento";
import { totalItensTr } from "@/lib/pdf/termo-referencia-dados";
import { registrarAutenticacaoPdf } from "@/lib/pdf/autenticacao";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ consolidacaoId: string }> },
) {
  const { consolidacaoId } = await params;
  const resultado = await carregarTermoReferenciaParaPdf(consolidacaoId);
  if ("erro" in resultado) {
    return new Response(resultado.erro, { status: resultado.status });
  }

  const autenticacao = await registrarAutenticacaoPdf({
    tipoDocumento: "TERMO_REFERENCIA",
    referenciaId: consolidacaoId,
    titulo: `Termo de Referência (TR) — ${resultado.tr.categoriaNome}`,
    processoSEI: resultado.tr.processoSEI,
    responsavelNome: resultado.tr.responsavelNome,
    responsavelMatricula: resultado.tr.responsavelMatricula,
    valorTotal: totalItensTr(resultado.tr),
    resumo: {
      Categoria: resultado.tr.categoriaNome,
      "Itens do TR": resultado.tr.itens.length,
    },
  });

  const buffer = await renderToBuffer(
    <TermoReferenciaDocumento tr={resultado.tr} autenticacao={autenticacao} />,
  );

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="TermoReferencia-${consolidacaoId}.pdf"`,
    },
  });
}
