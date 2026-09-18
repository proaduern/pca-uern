import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { obterSessao } from "@/lib/auth";
import RiscosForm from "./RiscosForm";
import IniciarDocumentoBotao from "../../IniciarDocumentoBotao";
import { criarAnaliseRiscosAction } from "@/lib/actions/etp-riscos";

export default async function RiscosPage({
  params,
}: {
  params: Promise<{ categoriaId: string; consolidacaoId: string }>;
}) {
  const { categoriaId, consolidacaoId } = await params;
  const sessao = await obterSessao();
  if (!sessao || sessao.tipo !== "SETOR_TECNICO") return null;

  const consolidacao = await prisma.consolidacaoTecnica.findUnique({
    where: { id: consolidacaoId },
    include: {
      categoria: true,
      analiseRiscos: { include: { itens: { orderBy: { ordem: "asc" } } } },
    },
  });
  if (!consolidacao || consolidacao.categoriaId !== categoriaId || consolidacao.setorTecnicoId !== sessao.id) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">
          Análise de Riscos — {consolidacao.categoria.nome}
        </h1>
        <p className="text-sm text-slate-500">Processo SEI: {consolidacao.processoSEI}</p>
      </div>

      {!consolidacao.analiseRiscos ? (
        <IniciarDocumentoBotao
          rotulo="Iniciar Análise de Riscos (pré-carregada com os 16 riscos-padrão)"
          acao={criarAnaliseRiscosAction}
          consolidacaoTecnicaId={consolidacaoId}
        />
      ) : (
        <RiscosForm
          pdfHref={`/consolidacao/${categoriaId}/riscos/${consolidacaoId}/pdf`}
          analiseRiscosId={consolidacao.analiseRiscos.id}
          status={consolidacao.analiseRiscos.status}
          responsavelNome={consolidacao.analiseRiscos.responsavelNome}
          responsavelMatricula={consolidacao.analiseRiscos.responsavelMatricula}
          itensIniciais={consolidacao.analiseRiscos.itens.map((it) => ({
            fase: it.fase,
            descricao: it.descricao,
            danos: it.danos,
            probabilidade: it.probabilidade,
            impacto: it.impacto,
            nivelAceitacao: it.nivelAceitacao,
            acoesPreventivas: it.acoesPreventivas,
            acoesContingenciais: it.acoesContingenciais,
            responsavel: it.responsavel,
          }))}
        />
      )}
    </div>
  );
}
