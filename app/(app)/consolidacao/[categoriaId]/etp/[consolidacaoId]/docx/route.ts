import { prisma } from "@/lib/prisma";
import { carregarEtpParaPdf } from "@/lib/pdf/carregar-etp";
import { gerarBufferDocxEtp } from "@/lib/docx/etp-docx";
import { formatarDataExtenso } from "@/lib/docx/gerador-docx-uern";
import { obterOuInicializarItensEtp } from "@/lib/itens-etp";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ categoriaId: string; consolidacaoId: string }> },
) {
  const { consolidacaoId } = await params;
  const resultado = await carregarEtpParaPdf(consolidacaoId);
  if ("erro" in resultado) {
    return new Response(resultado.erro, { status: resultado.status });
  }

  const { etp } = resultado;

  const consolidacao = await prisma.consolidacaoTecnica.findUnique({
    where: { id: consolidacaoId },
    select: { etpNumeroFormatado: true },
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
      : etp.itens.map((it, idx) => ({
          numeroItem: idx + 1,
          descricao: it.nome,
          quantidade: it.quantidade ?? 1,
          valorUnitarioEstimado: it.valorUnit != null ? Number(it.valorUnit) : 0,
          valorTotalEstimado: Number(it.valorTotal),
          divisivel: true,
        }));

  const buffer = await gerarBufferDocxEtp({
    processoSEI: etp.processoSEI,
    categoriaNome: etp.categoriaNome,
    sequencialTexto: consolidacao?.etpNumeroFormatado ?? undefined,
    codigoVerificador: `PCA-ETP-${consolidacaoId.slice(0, 8).toUpperCase()}`,
    objeto: etp.objeto,
    necessidadeContratacao: etp.necessidadeContratacao,
    referenciaPca: etp.referenciaPca,
    requisitosContratacao: etp.requisitosContratacao,
    levantamentoMercado: etp.levantamentoMercadoJustificativa,
    descricaoSolucaoCompleta: etp.descricaoSolucaoCompleta,
    estimativaQuantidades: etp.estimativaQuantidadesMemoria,
    estimativaValor: etp.estimativaPreliminarPrecos,
    justificativaParcelamento: etp.justificativaParcelamento,
    resultadosPretendidos: etp.resultadosEsperados,
    providenciasAdequacao: etp.providenciasAdministracao,
    contratacoesCorrelatas: etp.contratacoesCorrelatas,
    posicionamentoConclusivo: etp.declaracaoViabilidade,
    responsavelNome: etp.responsavelNome ?? "Responsável Técnico DLC/PROAD",
    responsavelMatricula: etp.responsavelMatricula,
    itens: itensParaDocx,
    dataTexto: formatarDataExtenso(etp.finalizadoEm ?? new Date()),
  });

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="ETP-${consolidacaoId}.docx"`,
    },
  });
}
