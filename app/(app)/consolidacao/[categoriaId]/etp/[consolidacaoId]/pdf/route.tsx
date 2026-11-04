import { renderToBuffer } from "@react-pdf/renderer";
import { carregarEtpParaPdf } from "@/lib/pdf/carregar-etp";
import { EtpDocumento } from "@/lib/pdf/etp-documento";
import { totalItensEtp } from "@/lib/pdf/etp-dados";
import { registrarAutenticacaoPdf } from "@/lib/pdf/autenticacao";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ consolidacaoId: string }> },
) {
  const { consolidacaoId } = await params;
  const resultado = await carregarEtpParaPdf(consolidacaoId);
  if ("erro" in resultado) {
    return new Response(resultado.erro, { status: resultado.status });
  }

  const autenticacao = await registrarAutenticacaoPdf({
    tipoDocumento: "ETP",
    referenciaId: consolidacaoId,
    titulo: `Estudo Técnico Preliminar (ETP) — ${resultado.etp.categoriaNome}`,
    processoSEI: resultado.etp.processoSEI,
    unidadeOuSetor: resultado.etp.setorTecnicoNome,
    responsavelNome: resultado.etp.responsavelNome,
    responsavelMatricula: resultado.etp.responsavelMatricula,
    valorTotal: totalItensEtp(resultado.etp),
    resumo: {
      Categoria: resultado.etp.categoriaNome,
      Objeto: resultado.etp.objeto.slice(0, 120),
    },
  });

  const buffer = await renderToBuffer(
    <EtpDocumento etp={resultado.etp} autenticacao={autenticacao} />,
  );

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="ETP-${consolidacaoId}.pdf"`,
    },
  });
}
