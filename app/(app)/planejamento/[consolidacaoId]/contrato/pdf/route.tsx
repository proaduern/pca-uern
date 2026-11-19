import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { carregarTermoReferenciaParaPdf } from "@/lib/pdf/carregar-termo-referencia";
import { ContratoDocumentoPdf } from "@/lib/pdf/contrato-documento";
import { registrarAutenticacaoPdf } from "@/lib/pdf/autenticacao";
import { obterOuInicializarItensEtp } from "@/lib/itens-etp";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ consolidacaoId: string }> },
) {
  const { consolidacaoId } = await params;
  const resultado = await carregarTermoReferenciaParaPdf(consolidacaoId);
  if ("erro" in resultado) {
    return new Response(resultado.erro, { status: resultado.status });
  }

  const { tr } = resultado;

  const consolidacao = await prisma.consolidacaoTecnica.findUnique({
    where: { id: consolidacaoId },
    select: { contratoNumeroFormatado: true },
  });

  const itensEtp = await obterOuInicializarItensEtp(consolidacaoId);

  const itens =
    itensEtp.length > 0
      ? itensEtp.map((it, idx) => ({
          numeroItem: idx + 1,
          descricao: it.item,
          quantidade: it.quantidade,
          valorUnitarioEstimado: it.valorUnitarioEstimado,
          valorTotalEstimado: it.valorTotalEstimado,
          divisivel: it.divisivel,
        }))
      : tr.itens.map((it, idx) => ({
          numeroItem: idx + 1,
          descricao: it.nome,
          quantidade: it.quantidade ?? 1,
          valorUnitarioEstimado: it.valorUnit ?? (it.quantidade ? it.valorTotal / it.quantidade : it.valorTotal),
          valorTotalEstimado: it.valorTotal,
          divisivel: it.divisivel ?? true,
        }));

  const autenticacao = await registrarAutenticacaoPdf({
    tipoDocumento: "MINUTA_EDITAL",
    referenciaId: consolidacaoId,
    titulo: `Minuta de Contrato — ${tr.categoriaNome}`,
    processoSEI: tr.processoSEI,
    responsavelNome: tr.responsavelNome,
    responsavelMatricula: tr.responsavelMatricula,
    resumo: {
      Categoria: tr.categoriaNome,
      Objeto: tr.objeto.slice(0, 100),
    },
  });

  const buffer = await renderToBuffer(
    <ContratoDocumentoPdf
      processoSEI={tr.processoSEI}
      categoriaNome={tr.categoriaNome}
      sequencialTexto={consolidacao?.contratoNumeroFormatado ?? undefined}
      numeroContratoFormatado={consolidacao?.contratoNumeroFormatado ?? undefined}
      objeto={tr.objeto}
      itens={itens}
      autenticacao={autenticacao}
    />,
  );

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="MinutaContrato-${consolidacaoId}.pdf"`,
    },
  });
}
