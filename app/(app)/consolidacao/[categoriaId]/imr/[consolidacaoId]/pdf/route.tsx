import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { ImrDocumentoPdf } from "@/lib/pdf/imr-documento";
import { registrarAutenticacaoPdf } from "@/lib/pdf/autenticacao";
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

  const autenticacao = await registrarAutenticacaoPdf({
    tipoDocumento: "TERMO_REFERENCIA",
    referenciaId: consolidacaoId,
    titulo: `Instrumento de Medição de Resultado (IMR) — ${consolidacao.categoria.nome}`,
    processoSEI: consolidacao.processoSEI,
    responsavelNome: imr?.responsavelNome,
    responsavelMatricula: imr?.responsavelMatricula,
    resumo: {
      Categoria: consolidacao.categoria.nome,
      Modelo: tipoModelo,
      "Itens/Ocorrências": itens.length,
    },
  });

  const buffer = await renderToBuffer(
    <ImrDocumentoPdf
      processoSEI={consolidacao.processoSEI}
      categoriaNome={consolidacao.categoria.nome}
      tipoModelo={tipoModelo as any}
      sequencialTexto={consolidacao.imrNumeroFormatado ?? undefined}
      responsavelNome={imr?.responsavelNome}
      responsavelMatricula={imr?.responsavelMatricula}
      itens={itens}
      autenticacao={autenticacao}
    />,
  );

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="IMR-${consolidacaoId}.pdf"`,
    },
  });
}
