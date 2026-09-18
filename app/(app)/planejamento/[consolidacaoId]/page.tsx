import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { obterSessao } from "@/lib/auth";
import IniciarDocumentoBotao from "../../IniciarDocumentoBotao";
import { criarTermoReferenciaAction } from "@/lib/actions/termo-referencia";
import TermoReferenciaForm from "./TermoReferenciaForm";

export default async function PlanejamentoDetalhePage({
  params,
}: {
  params: Promise<{ consolidacaoId: string }>;
}) {
  const { consolidacaoId } = await params;
  const sessao = await obterSessao();
  if (!sessao) redirect("/login");
  if (sessao.tipo !== "PLANEJAMENTO" && sessao.tipo !== "ADMIN") redirect("/");

  const consolidacao = await prisma.consolidacaoTecnica.findUnique({
    where: { id: consolidacaoId },
    include: {
      categoria: true,
      setorTecnico: true,
      estudoTecnicoPreliminar: true,
      pesquisaDePrecos: { include: { itens: { orderBy: { ordem: "asc" } } } },
      termoReferencia: true,
    },
  });
  if (!consolidacao) notFound();

  const etp = consolidacao.estudoTecnicoPreliminar;
  const pesquisa = consolidacao.pesquisaDePrecos;
  const etpFinalizado = etp?.status === "FINALIZADO";
  const pesquisaFinalizada = pesquisa?.status === "FINALIZADO";
  const pronta = etpFinalizado && pesquisaFinalizada;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">
          Termo de Referência — {consolidacao.categoria.nome}
        </h1>
        <p className="text-sm text-slate-500">
          Processo SEI: {consolidacao.processoSEI} · Setor Técnico: {consolidacao.setorTecnico.nome}
        </p>
      </div>

      {!consolidacao.termoReferencia ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Pré-requisitos</h2>
            <div className="space-y-2 text-sm">
              <p>
                Estudo Técnico Preliminar:{" "}
                <span className={etpFinalizado ? "text-emerald-700" : "text-amber-700"}>
                  {etpFinalizado ? "Finalizado" : etp ? "Em rascunho" : "Não iniciado"}
                </span>
              </p>
              <p>
                Pesquisa de Preços:{" "}
                <span className={pesquisaFinalizada ? "text-emerald-700" : "text-amber-700"}>
                  {pesquisaFinalizada ? "Finalizada" : pesquisa ? "Em rascunho" : "Não iniciada"}
                </span>
              </p>
            </div>
            {!pronta && (
              <p className="mt-3 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
                O Termo de Referência só pode ser iniciado depois que o Estudo Técnico Preliminar e
                a Pesquisa de Preços desta consolidação estiverem finalizados.
              </p>
            )}
          </div>

          {pronta && (
            <IniciarDocumentoBotao
              rotulo="Iniciar Termo de Referência"
              acao={criarTermoReferenciaAction}
              consolidacaoTecnicaId={consolidacaoId}
            />
          )}
        </div>
      ) : (
        <TermoReferenciaForm
          pdfHref={`/planejamento/${consolidacaoId}/pdf`}
          etp={{
            objeto: etp!.objeto,
            necessidadeContratacao: etp!.necessidadeContratacao,
            referenciaPca: etp!.referenciaPca,
            descricaoSolucaoCompleta: etp!.descricaoSolucaoCompleta,
          }}
          pesquisa={{
            metodologia: pesquisa!.metodologia,
            itens: pesquisa!.itens.map((it) => ({
              item: it.item,
              quantidade: Number(it.quantidade),
              valorUnitarioPesquisado: Number(it.valorUnitarioPesquisado),
            })),
          }}
          tr={{
            id: consolidacao.termoReferencia.id,
            requisitosContratacao: consolidacao.termoReferencia.requisitosContratacao,
            modeloExecucaoObjeto: consolidacao.termoReferencia.modeloExecucaoObjeto,
            modeloGestaoContrato: consolidacao.termoReferencia.modeloGestaoContrato,
            criteriosMedicaoPagamento: consolidacao.termoReferencia.criteriosMedicaoPagamento,
            formaSelecaoFornecedor: consolidacao.termoReferencia.formaSelecaoFornecedor,
            exigenciasHabilitacao: consolidacao.termoReferencia.exigenciasHabilitacao,
            adequacaoOrcamentaria: consolidacao.termoReferencia.adequacaoOrcamentaria,
            garantiaExecucao: consolidacao.termoReferencia.garantiaExecucao,
            status: consolidacao.termoReferencia.status,
            responsavelNome: consolidacao.termoReferencia.responsavelNome,
            responsavelMatricula: consolidacao.termoReferencia.responsavelMatricula,
          }}
        />
      )}
    </div>
  );
}
