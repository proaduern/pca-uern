import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { brl } from "@/lib/formato";

const STATUS_DOCUMENTO_LABEL: Record<"RASCUNHO" | "FINALIZADO", string> = {
  RASCUNHO: "Rascunho",
  FINALIZADO: "Finalizado",
};

const ETAPA_RESUMO_LABEL: Record<string, string> = {
  AGUARDANDO_DESIGNACAO_DLC: "Aguardando Designação (DLC)",
  ANALISE_PRELIMINAR_AGENTE: "1. Análise Preliminar do Agente",
  DILIGENCIA_SETOR_TECNICO: "Em Diligência no Setor Técnico",
  EM_PESQUISA_PRECOS: "Em Pesquisa de Preços",
  AGUARDANDO_DOTACAO_ORCAMENTARIA: "2. Solicitar Dotação (Contabilidade)",
  DOTACAO_SOLICITADA_CONTABILIDADE: "2. Aguardando Dotação -> Enviar p/ TR",
  ENCAMINHADO_PLANEJAMENTO_TR: "Encaminhado ao Planejamento (TR)",
  TR_CONCLUIDO: "3. TR Concluído (Minuta de Edital)",
};

export default async function AgenteContratacaoHomePage({ agenteContratacaoId }: { agenteContratacaoId: string }) {
  const [consolidacoes, certamesDesignados] = await Promise.all([
    prisma.consolidacaoTecnica.findMany({
      include: {
        categoria: true,
        setorTecnico: true,
        estudoTecnicoPreliminar: true,
        pesquisaDePrecos: true,
        termoReferencia: true,
        minutaEdital: true,
        itensDfd: { select: { valorTotal: true } },
        itensTecnicos: { select: { valorTotal: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.consolidacaoTecnica.findMany({
      where: { agenteContratacaoDesignadoId: agenteContratacaoId },
      include: {
        categoria: true,
        setorTecnico: true,
        estudoTecnicoPreliminar: true,
        pesquisaDePrecos: true,
        termoReferencia: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const total = (c: (typeof consolidacoes)[number]) =>
    c.itensDfd.reduce((s, it) => s + Number(it.valorTotal), 0) +
    c.itensTecnicos.reduce((s, it) => s + Number(it.valorTotal), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Painel do Agente de Contratação</h1>
        <p className="text-sm text-slate-500">
          Análise Preliminar pós-ETP, Diligências ao Setor Técnico, Solicitação de Dotação Orçamentária junto à Contabilidade, Encaminhamento ao Planejamento (TR), Minuta de Edital e Condução do Certame.
        </p>
      </div>

      {certamesDesignados.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-blue-200 bg-white shadow-sm">
          <div className="bg-blue-50/70 px-4 py-3 border-b border-blue-100">
            <h2 className="text-sm font-bold text-slate-900">Processos Designados a Você pelo Diretor da DLC</h2>
            <p className="text-xs text-slate-600">
              Clique em &quot;Conduzir Processo&quot; para realizar a Análise Preliminar, Diligenciar ao Setor Técnico, Registrar Solicitação de Dotação ou Encaminhar ao Planejamento (TR).
            </p>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Categoria</th>
                <th className="px-4 py-2 font-medium">Setor Técnico</th>
                <th className="px-4 py-2 font-medium">Processo SEI</th>
                <th className="px-4 py-2 font-medium">Etapa Atual no Fluxo</th>
                <th className="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {certamesDesignados.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 font-medium text-slate-900">{c.categoria.nome}</td>
                  <td className="px-4 py-2 text-slate-600">{c.setorTecnico.nome}</td>
                  <td className="px-4 py-2 text-slate-600">{c.processoSEI}</td>
                  <td className="px-4 py-2">
                    <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
                      {c.etapaFluxoPosEtp
                        ? (ETAPA_RESUMO_LABEL[c.etapaFluxoPosEtp] ?? c.etapaFluxoPosEtp)
                        : "1. Análise Preliminar do Agente"}
                    </span>
                  </td>
                  <td className="px-4 py-2 space-x-3">
                    <Link
                      href={`/agente-contratacao/${c.id}`}
                      className="rounded-lg bg-[#003366] px-3 py-1 text-xs font-semibold text-white hover:bg-[#002244]"
                    >
                      Conduzir Processo
                    </Link>
                    <Link href={`/licitacoes/${c.id}`} className="text-xs text-slate-600 underline">
                      Painel Licitação
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Categoria</th>
              <th className="px-4 py-2 font-medium">Setor Técnico</th>
              <th className="px-4 py-2 font-medium">Processo SEI</th>
              <th className="px-4 py-2 font-medium">Itens</th>
              <th className="px-4 py-2 font-medium">Valor Estimado</th>
              <th className="px-4 py-2 font-medium">Etapa Pós-ETP</th>
              <th className="px-4 py-2 font-medium">Termo de Referência</th>
              <th className="px-4 py-2 font-medium">Minuta de Edital</th>
              <th className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {consolidacoes.map((c) => {
              const trFinalizado = c.termoReferencia?.status === "FINALIZADO";
              return (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 text-slate-900">
                    <Link href={`/agente-contratacao/${c.id}`} className="block font-medium">
                      {c.categoria.nome}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-slate-600">{c.setorTecnico.nome}</td>
                  <td className="px-4 py-2 text-slate-600">{c.processoSEI}</td>
                  <td className="px-4 py-2 text-slate-600">{c.itensDfd.length + c.itensTecnicos.length}</td>
                  <td className="px-4 py-2 text-slate-600">{brl(total(c))}</td>
                  <td className="px-4 py-2">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                      {c.etapaFluxoPosEtp
                        ? (ETAPA_RESUMO_LABEL[c.etapaFluxoPosEtp] ?? c.etapaFluxoPosEtp)
                        : c.estudoTecnicoPreliminar?.status === "FINALIZADO"
                          ? "Aguardando Designação DLC"
                          : "Em ETP (Setor Técnico)"}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-1 text-xs ${trFinalizado ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
                    >
                      {trFinalizado ? "Finalizado" : c.termoReferencia ? "Rascunho" : "Não iniciado"}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    {c.minutaEdital ? (
                      <span
                        className={`rounded-full px-2 py-1 text-xs ${
                          c.minutaEdital.status === "FINALIZADO"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {STATUS_DOCUMENTO_LABEL[c.minutaEdital.status]}
                      </span>
                    ) : trFinalizado ? (
                      <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-700">
                        Pronta para iniciar
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-500">
                        Aguardando TR
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <Link href={`/agente-contratacao/${c.id}`} className="text-xs font-medium text-[#003366] underline">
                      Abrir Painel
                    </Link>
                  </td>
                </tr>
              );
            })}
            {consolidacoes.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-slate-400">
                  Nenhuma consolidação recebida ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
