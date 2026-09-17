import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { obterSessao } from "@/lib/auth";
import IniciarDocumentoBotao from "../../IniciarDocumentoBotao";
import { criarMinutaEditalAction } from "@/lib/actions/minuta-edital";
import MinutaEditalForm from "./MinutaEditalForm";

export default async function AgenteContratacaoDetalhePage({
  params,
}: {
  params: Promise<{ consolidacaoId: string }>;
}) {
  const { consolidacaoId } = await params;
  const sessao = await obterSessao();
  if (!sessao) redirect("/login");
  if (sessao.tipo !== "AGENTE_CONTRATACAO" && sessao.tipo !== "ADMIN") redirect("/");

  const consolidacao = await prisma.consolidacaoTecnica.findUnique({
    where: { id: consolidacaoId },
    include: {
      categoria: true,
      setorTecnico: true,
      estudoTecnicoPreliminar: true,
      termoReferencia: true,
      minutaEdital: true,
    },
  });
  if (!consolidacao) notFound();

  const etp = consolidacao.estudoTecnicoPreliminar;
  const tr = consolidacao.termoReferencia;
  const trFinalizado = tr?.status === "FINALIZADO";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">
          Minuta de Edital — {consolidacao.categoria.nome}
        </h1>
        <p className="text-sm text-slate-500">
          Processo SEI: {consolidacao.processoSEI} · Setor Técnico: {consolidacao.setorTecnico.nome}
        </p>
      </div>

      {!consolidacao.minutaEdital ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Pré-requisito</h2>
            <p className="text-sm">
              Termo de Referência:{" "}
              <span className={trFinalizado ? "text-emerald-700" : "text-amber-700"}>
                {trFinalizado ? "Finalizado" : tr ? "Em rascunho" : "Não iniciado"}
              </span>
            </p>
            {!trFinalizado && (
              <p className="mt-3 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
                A Minuta de Edital só pode ser iniciada depois que o Termo de Referência desta
                consolidação estiver finalizado.
              </p>
            )}
          </div>

          {trFinalizado && (
            <IniciarDocumentoBotao
              rotulo="Iniciar Minuta de Edital"
              acao={criarMinutaEditalAction}
              consolidacaoTecnicaId={consolidacaoId}
            />
          )}
        </div>
      ) : (
        <MinutaEditalForm
          pdfHref={`/agente-contratacao/${consolidacaoId}/pdf`}
          etp={{ objeto: etp!.objeto }}
          tr={{
            formaSelecaoFornecedor: tr!.formaSelecaoFornecedor,
            exigenciasHabilitacao: tr!.exigenciasHabilitacao,
            criteriosMedicaoPagamento: tr!.criteriosMedicaoPagamento,
            garantiaExecucao: tr!.garantiaExecucao,
          }}
          minuta={{
            id: consolidacao.minutaEdital.id,
            condicoesParticipacao: consolidacao.minutaEdital.condicoesParticipacao,
            credenciamento: consolidacao.minutaEdital.credenciamento,
            apresentacaoProposta: consolidacao.minutaEdital.apresentacaoProposta,
            julgamentoPropostas: consolidacao.minutaEdital.julgamentoPropostas,
            documentosHabilitacao: consolidacao.minutaEdital.documentosHabilitacao,
            recursosAdministrativos: consolidacao.minutaEdital.recursosAdministrativos,
            sancoesAdministrativas: consolidacao.minutaEdital.sancoesAdministrativas,
            disposicoesGerais: consolidacao.minutaEdital.disposicoesGerais,
            status: consolidacao.minutaEdital.status,
            responsavelNome: consolidacao.minutaEdital.responsavelNome,
            responsavelMatricula: consolidacao.minutaEdital.responsavelMatricula,
          }}
        />
      )}
    </div>
  );
}
