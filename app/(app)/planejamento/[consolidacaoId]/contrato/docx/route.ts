import { prisma } from "@/lib/prisma";
import { carregarTermoReferenciaParaPdf } from "@/lib/pdf/carregar-termo-referencia";
import { gerarBufferDocxContrato } from "@/lib/docx/contrato-docx";
import { formatarDataExtenso } from "@/lib/docx/gerador-docx-uern";
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

  const itensParaDocx =
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
          divisivel: true,
        }));

  const buffer = await gerarBufferDocxContrato({
    processoSEI: tr.processoSEI,
    categoriaNome: tr.categoriaNome,
    sequencialTexto: consolidacao?.contratoNumeroFormatado ?? undefined,
    codigoVerificador: `PCA-CTR-${consolidacaoId.slice(0, 8).toUpperCase()}`,
    objeto: tr.objeto,
    responsavelNome: tr.responsavelNome ?? "Responsável Técnico DLC/PROAD",
    responsavelMatricula: tr.responsavelMatricula,
    itens: itensParaDocx,
    dataTexto: formatarDataExtenso(tr.finalizadoEm ?? new Date()),
  });

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="MinutaContrato-${consolidacaoId}.docx"`,
    },
  });
}
