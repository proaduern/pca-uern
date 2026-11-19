import { prisma } from "@/lib/prisma";
import { gerarBufferDocxImr } from "@/lib/docx/imr-docx";
import { formatarDataExtenso } from "@/lib/docx/gerador-docx-uern";
import { IMR_PADRAO_DEDICACAO_EXCLUSIVA, IMR_PADRAO_SERVICOS_GERAIS } from "@/lib/imr-padrao";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ categoriaId: string; consolidacaoId: string }> },
) {
  const { consolidacaoId } = await params;

  const consolidacao = await prisma.consolidacaoTecnica.findUnique({
    where: { id: consolidacaoId },
    include: {
      categoria: true,
      instrumentoMedicaoResultado: {
        include: { itens: { orderBy: { ordem: "asc" } } },
      },
    },
  });

  if (!consolidacao) {
    return new Response("Consolidação não encontrada.", { status: 404 });
  }

  const imr = consolidacao.instrumentoMedicaoResultado;
  const tipoModelo = (imr?.tipoImr === "DEDICACAO_EXCLUSIVA" ? "DEDICACAO_EXCLUSIVA" : "SERVICOS_GERAIS") as "DEDICACAO_EXCLUSIVA" | "SERVICOS_GERAIS";

  const itens =
    imr && imr.itens.length > 0
      ? imr.itens.map((it) => ({
          indicadorNumero: it.indicadorNumero,
          indicadorNome: it.indicadorNome,
          servicoEscopo: it.servicoEscopo,
          descricao: it.descricao,
          pontuacaoPrevista: Number(it.pontuacaoPrevista),
          pontuacaoTexto: `${it.pontuacaoPrevista} ponto(s)`,
        }))
      : tipoModelo === "DEDICACAO_EXCLUSIVA"
        ? IMR_PADRAO_DEDICACAO_EXCLUSIVA
        : IMR_PADRAO_SERVICOS_GERAIS;

  const buffer = await gerarBufferDocxImr({
    processoSEI: consolidacao.processoSEI,
    categoriaNome: consolidacao.categoria.nome,
    tipoModelo: tipoModelo as any,
    sequencialTexto: consolidacao.imrNumeroFormatado ?? undefined,
    codigoVerificador: `PCA-IMR-${consolidacaoId.slice(0, 8).toUpperCase()}`,
    responsavelNome: imr?.responsavelNome ?? "Responsável Técnico DLC/PROAD",
    responsavelMatricula: imr?.responsavelMatricula,
    itens,
    dataTexto: formatarDataExtenso(imr?.finalizadoEm ?? new Date()),
  });

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="IMR-${consolidacaoId}.docx"`,
    },
  });
}
