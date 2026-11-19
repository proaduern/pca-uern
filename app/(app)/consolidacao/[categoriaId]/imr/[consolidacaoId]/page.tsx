import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { obterSessao } from "@/lib/auth";
import ImrForm from "./ImrForm";
import { IMR_PADRAO_DEDICACAO_EXCLUSIVA, IMR_PADRAO_SERVICOS_GERAIS } from "@/lib/imr-padrao";

export default async function ImrPage({
  params,
}: {
  params: Promise<{ categoriaId: string; consolidacaoId: string }>;
}) {
  const { categoriaId, consolidacaoId } = await params;
  const sessao = await obterSessao();
  if (!sessao || (sessao.tipo !== "SETOR_TECNICO" && sessao.tipo !== "ADMIN" && sessao.tipo !== "PLANEJAMENTO")) {
    notFound();
  }

  const consolidacao = await prisma.consolidacaoTecnica.findUnique({
    where: { id: consolidacaoId },
    include: {
      categoria: true,
      instrumentoMedicaoResultado: {
        include: { itens: { orderBy: { ordem: "asc" } } },
      },
    },
  });

  if (!consolidacao || consolidacao.categoriaId !== categoriaId) {
    notFound();
  }

  const imr = consolidacao.instrumentoMedicaoResultado;
  const tipoModelo = (imr?.tipoImr === "DEDICACAO_EXCLUSIVA" ? "DEDICACAO_EXCLUSIVA" : "SERVICOS_GERAIS") as "DEDICACAO_EXCLUSIVA" | "SERVICOS_GERAIS";

  const itensIniciais =
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">
          Instrumento de Medição de Resultado (IMR) — {consolidacao.categoria.nome}
        </h1>
        <p className="text-sm text-slate-500">
          Processo SEI: {consolidacao.processoSEI} | Padrão UERN & AGU (Lei nº 14.133/2021)
        </p>
      </div>

      <ImrForm
        consolidacaoId={consolidacaoId}
        imrId={imr?.id ?? ""}
        status={imr?.status ?? "RASCUNHO"}
        tipoModeloInicial={tipoModelo as any}
        responsavelNomeInicial={imr?.responsavelNome ?? null}
        responsavelMatriculaInicial={imr?.responsavelMatricula ?? null}
        itensIniciais={itensIniciais}
        pdfHref={`/consolidacao/${categoriaId}/imr/${consolidacaoId}/pdf`}
        docxHref={`/consolidacao/${categoriaId}/imr/${consolidacaoId}/docx`}
      />
    </div>
  );
}
