import { renderToBuffer } from "@react-pdf/renderer";
import { carregarRiscosParaPdf } from "@/lib/pdf/carregar-riscos";
import { RiscosDocumento } from "@/lib/pdf/riscos-documento";
import { registrarAutenticacaoPdf } from "@/lib/pdf/autenticacao";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ consolidacaoId: string }> },
) {
  const { consolidacaoId } = await params;
  const resultado = await carregarRiscosParaPdf(consolidacaoId);
  if ("erro" in resultado) {
    return new Response(resultado.erro, { status: resultado.status });
  }

  const autenticacao = await registrarAutenticacaoPdf({
    tipoDocumento: "MAPA_RISCOS",
    referenciaId: consolidacaoId,
    titulo: `Mapa de Riscos da Contratação — ${resultado.riscos.categoriaNome}`,
    processoSEI: resultado.riscos.processoSEI,
    responsavelNome: resultado.riscos.responsavelNome,
    responsavelMatricula: resultado.riscos.responsavelMatricula,
    resumo: {
      Categoria: resultado.riscos.categoriaNome,
      "Quantidade de Riscos": resultado.riscos.itens.length,
    },
  });

  const buffer = await renderToBuffer(
    <RiscosDocumento riscos={resultado.riscos} autenticacao={autenticacao} />,
  );

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Riscos-${consolidacaoId}.pdf"`,
    },
  });
}
