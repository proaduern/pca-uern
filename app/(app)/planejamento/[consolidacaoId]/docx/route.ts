import { prisma } from "@/lib/prisma";
import { carregarTermoReferenciaParaPdf } from "@/lib/pdf/carregar-termo-referencia";
import { gerarBufferDocxTermoReferencia } from "@/lib/docx/termo-referencia-docx";
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
    select: { trNumeroFormatado: true },
  });

  // Tenta carregar os itens consolidados do ETP (fonte oficial do TR)
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
          divisivel: it.divisivel ?? true,
        }));

  const buffer = await gerarBufferDocxTermoReferencia({
    processoSEI: tr.processoSEI,
    categoriaNome: tr.categoriaNome,
    sequencialTexto: consolidacao?.trNumeroFormatado ?? undefined,
    codigoVerificador: `PCA-TR-${consolidacaoId.slice(0, 8).toUpperCase()}`,
    objeto: tr.objeto,
    necessidadeContratacao: tr.necessidadeContratacao,
    descricaoSolucao: tr.descricaoSolucaoCompleta,
    requisitosContratacao: tr.requisitosContratacao,
    modeloExecucaoObjeto: tr.modeloExecucaoObjeto,
    modeloGestaoContrato: tr.modeloGestaoContrato,
    criteriosMedicaoPagamento: tr.criteriosMedicaoPagamento,
    formaSelecaoFornecedor: tr.formaSelecaoFornecedor,
    exigenciasHabilitacao: tr.exigenciasHabilitacao,
    adequacaoOrcamentaria: tr.adequacaoOrcamentaria,
    garantiaExecucao: tr.garantiaExecucao,
    responsavelNome: tr.responsavelNome ?? "Responsável Técnico DLC/PROAD",
    responsavelMatricula: tr.responsavelMatricula,
    itens: itensParaDocx,
    dataTexto: formatarDataExtenso(tr.finalizadoEm ?? new Date()),
  });

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="TermoReferencia-${consolidacaoId}.docx"`,
    },
  });
}
