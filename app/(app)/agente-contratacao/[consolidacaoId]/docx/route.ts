import { prisma } from "@/lib/prisma";
import { carregarMinutaEditalParaPdf } from "@/lib/pdf/carregar-minuta-edital";
import { gerarBufferDocxEdital } from "@/lib/docx/edital-docx";
import { formatarDataExtenso } from "@/lib/docx/gerador-docx-uern";
import { obterOuInicializarItensEtp } from "@/lib/itens-etp";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ consolidacaoId: string }> },
) {
  const { consolidacaoId } = await params;
  const resultado = await carregarMinutaEditalParaPdf(consolidacaoId);
  if ("erro" in resultado) {
    return new Response(resultado.erro, { status: resultado.status });
  }

  const { minuta } = resultado;

  const consolidacao = await prisma.consolidacaoTecnica.findUnique({
    where: { id: consolidacaoId },
    select: { editalNumeroFormatado: true },
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
      : minuta.itens.map((it, idx) => ({
          numeroItem: idx + 1,
          descricao: it.nome,
          quantidade: it.quantidade ?? 1,
          valorUnitarioEstimado: it.valorUnit ?? (it.quantidade ? it.valorTotal / it.quantidade : it.valorTotal),
          valorTotalEstimado: it.valorTotal,
          divisivel: true,
        }));

  const buffer = await gerarBufferDocxEdital({
    processoSEI: minuta.processoSEI,
    categoriaNome: minuta.categoriaNome,
    sequencialTexto: consolidacao?.editalNumeroFormatado ?? undefined,
    codigoVerificador: `PCA-EDITAL-${consolidacaoId.slice(0, 8).toUpperCase()}`,
    objeto: minuta.objeto,
    formaSelecaoFornecedor: minuta.formaSelecaoFornecedor,
    criteriosMedicaoPagamento: minuta.criteriosMedicaoPagamento,
    exigenciasHabilitacao: minuta.exigenciasHabilitacao,
    garantiaExecucao: minuta.garantiaExecucao,
    condicoesParticipacao: minuta.condicoesParticipacao,
    credenciamento: minuta.credenciamento,
    apresentacaoProposta: minuta.apresentacaoProposta,
    julgamentoPropostas: minuta.julgamentoPropostas,
    documentosHabilitacao: minuta.documentosHabilitacao,
    recursosAdministrativos: minuta.recursosAdministrativos,
    sancoesAdministrativas: minuta.sancoesAdministrativas,
    disposicoesGerais: minuta.disposicoesGerais,
    responsavelNome: minuta.responsavelNome ?? "Agente de Contratação DLC/PROAD",
    responsavelMatricula: minuta.responsavelMatricula,
    itens: itensParaDocx,
    dataTexto: formatarDataExtenso(minuta.finalizadoEm ?? new Date()),
  });

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="Edital-${consolidacaoId}.docx"`,
    },
  });
}
