import { obterSessao, exigirAdminNaPagina } from "@/lib/auth";
import { redirect } from "next/navigation";
import { obterKpisLicitacao, type FaixaRating } from "@/lib/services/kpi-licitacao";
import Link from "next/link";
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Clock,
  TrendingUp,
  Award,
  PackageCheck,
  Scale,
  ArrowRight,
  ExternalLink,
  Info,
  Filter,
  Sliders,
} from "lucide-react";

export const dynamic = "force-dynamic";

function formatarFaixaBadge(faixa: FaixaRating) {
  switch (faixa) {
    case "DIAMANTE":
      return {
        label: "Diamante (Alta Eficiência)",
        classes: "bg-cyan-100 text-cyan-800 border-cyan-300",
        dot: "bg-cyan-500",
      };
    case "OURO":
      return {
        label: "Ouro (Eficiente)",
        classes: "bg-emerald-100 text-emerald-800 border-emerald-300",
        dot: "bg-emerald-500",
      };
    case "PRATA":
      return {
        label: "Prata (Atenção)",
        classes: "bg-amber-100 text-amber-800 border-amber-300",
        dot: "bg-amber-500",
      };
    case "BRONZE_CRITICO":
      return {
        label: "Desempenho Crítico",
        classes: "bg-rose-100 text-rose-800 border-rose-300 animate-pulse",
        dot: "bg-rose-500",
      };
  }
}

export default async function KpisLicitacaoPage({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string }>;
}) {
  await exigirAdminNaPagina();

  const resolvedParams = await searchParams;
  const anoParam = resolvedParams.ano ? parseInt(resolvedParams.ano, 10) : undefined;
  const kpis = await obterKpisLicitacao(anoParam);

  const badgeGeral = formatarFaixaBadge(kpis.faixaGeral);
  const badgeSucesso = formatarFaixaBadge(kpis.sucessoLicitacoes.ratingSucesso);
  const badgeExec = formatarFaixaBadge(kpis.execucaoBens.faixaExecucao);

  return (
    <div className="space-y-8 p-6 md:p-8 max-w-7xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-bold text-[#003366]">
              Governança PROAD
            </span>
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
              Lei 14.133/2021
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-black text-slate-900 tracking-tight">
            Controle de Eficiência, Prazos e Sucesso de Licitações
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Controle de desempenho setorial, tempo de ciclo interno, neutralidade PGE e acompanhamento de bens.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/admin/kpis-licitacao/parametros"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:text-[#003366] hover:bg-slate-50 transition shadow-sm"
          >
            <Sliders className="w-3.5 h-3.5 text-[#003366]" />
            Configurar Metas &amp; Prazos
          </Link>

          {/* Filtro por Ano */}
        <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
          <Filter className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-bold text-slate-700">PCA:</span>
          <div className="flex gap-1 text-xs">
            <Link
              href="/admin/kpis-licitacao"
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                !anoParam ? "bg-[#003366] text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Todos
            </Link>
            <Link
              href="/admin/kpis-licitacao?ano=2026"
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                anoParam === 2026 ? "bg-[#003366] text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              2026
            </Link>
            <Link
              href="/admin/kpis-licitacao?ano=2025"
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                anoParam === 2025 ? "bg-[#003366] text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              2025
            </Link>
          </div>
        </div>
        </div>
      </div>

      {/* Alerta de Desempenho Setorial (Controle de Desempenho) */}
      {kpis.setorGargaloPrincipal ? (
        <div className="rounded-2xl border-2 border-rose-300 bg-rose-50/70 p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-600 text-white shadow-md">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-rose-700">
                  Controle de Desempenho Ativo • Alerta de Desvio de SLA
                </span>
                <span className="rounded-full bg-rose-200 px-2 py-0.5 text-[10px] font-bold text-rose-900">
                  Ação Recomendada
                </span>
              </div>
              <h3 className="text-base font-bold text-rose-950 mt-0.5">
                Fase com Maior Desvio de SLA: {kpis.setorGargaloPrincipal}
              </h3>
              <p className="mt-1 text-xs text-rose-800 leading-relaxed">
                Este setor apresenta a maior razão de tempo médio em relação à sua meta de SLA, sendo o principal responsável pela dilatação do prazo total de contratação. Recomenda-se redistribuição de demandas ou força-tarefa no setor.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-sm flex items-center gap-3">
          <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
          <p className="text-xs font-semibold text-emerald-900">
            Excelente! Nenhum desvio crítico identificado. Todas as etapas internas da UERN operam dentro da tolerância do cronograma de compras.
          </p>
        </div>
      )}

      {/* Cards Executivos de Desempenho */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Score Geral UERN */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Rating Geral UERN
            </span>
            <Award className="h-5 w-5 text-[#003366]" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{kpis.scoreGeralEficiencia}</span>
            <span className="text-xs font-bold text-slate-400">/ 100</span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badgeGeral.classes}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${badgeGeral.dot}`} />
              {badgeGeral.label}
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-600 flex justify-between">
            <span>Lead Time UERN:</span>
            <strong className="text-slate-800">{kpis.tempoMedioTotalInternoUern} dias corridos</strong>
          </div>
        </div>

        {/* Card 2: Neutralidade PGE */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-700 uppercase tracking-wider">
              Lead Time PGE-RN
            </span>
            <Scale className="h-5 w-5 text-purple-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-purple-950">
              {kpis.tempoMedioPgeReferencial}
            </span>
            <span className="text-xs font-bold text-purple-600">dias médios</span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-purple-200 bg-purple-50 text-purple-800">
              <Info className="w-3 h-3 text-purple-600" />
              Órgão Externo • Neutro no Rating UERN
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-purple-100 text-[11px] text-purple-700">
            Tempo referencial informativo, 100% excluído da avaliação dos setores UERN.
          </div>
        </div>

        {/* Card 3: Taxa de Sucesso dos Certames */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Sucesso em Licitações
            </span>
            <TrendingUp className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">
              {kpis.sucessoLicitacoes.taxaSucessoGeral}%
            </span>
            <span className="text-xs font-bold text-emerald-600">de homologação</span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badgeSucesso.classes}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${badgeSucesso.dot}`} />
              {badgeSucesso.label}
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-600 flex justify-between">
            <span>Desertos: <strong>{kpis.sucessoLicitacoes.totalDesertos}</strong></span>
            <span>Fracassados: <strong>{kpis.sucessoLicitacoes.totalFracassados}</strong></span>
          </div>
        </div>

        {/* Card 4: Execução de Bens */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Execução de Bens
            </span>
            <PackageCheck className="h-5 w-5 text-blue-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">
              {kpis.execucaoBens.scoreEficienciaExecucao}
            </span>
            <span className="text-xs font-bold text-slate-400">/ 100</span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badgeExec.classes}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${badgeExec.dot}`} />
              {badgeExec.label}
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-600 flex justify-between">
            <span>Conferência/Definitivo:</span>
            <strong className="text-slate-800">{kpis.execucaoBens.diasMediosConferenciaDefinitivo}d</strong>
          </div>
        </div>
      </div>

      {/* Visual Pipeline: Controle de Desempenho Setorial */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-100 gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#003366]" />
              Controle de Desempenho Setorial: Ciclo Completo de Contratação
            </h2>
            <p className="text-xs text-slate-500">
              Prazos médios reais comparados às metas de SLA da Lei 14.133/2021 em cada departamento.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-slate-600">Dentro da Meta</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="text-slate-600">Alerta</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-rose-500" />
              <span className="text-slate-600">Desvio de SLA</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-purple-500" />
              <span className="text-slate-600">PGE (Neutro)</span>
            </div>
          </div>
        </div>

        {/* Linha do Tempo Visual */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3 mt-6">
          {kpis.ratingsSetoriais.map((setor, idx) => {
            const isGargalo = setor.isGargaloPrincipal;
            const isPge = setor.isExternoNeutro;
            const isAtrasado = setor.razaoEficiencia > 1.0;

            let cardBorder = "border-emerald-200 bg-emerald-50/40";
            let pillColor = "bg-emerald-100 text-emerald-800";
            if (isPge) {
              cardBorder = "border-purple-200 bg-purple-50/40";
              pillColor = "bg-purple-100 text-purple-800";
            } else if (isGargalo) {
              cardBorder = "border-rose-400 bg-rose-50 ring-2 ring-rose-400";
              pillColor = "bg-rose-600 text-white animate-pulse";
            } else if (isAtrasado) {
              cardBorder = "border-amber-300 bg-amber-50/50";
              pillColor = "bg-amber-100 text-amber-800";
            }

            return (
              <div
                key={setor.setorCodigo}
                className={`rounded-xl border p-4 flex flex-col justify-between transition relative ${cardBorder}`}
              >
                {isGargalo && (
                  <div className="absolute -top-2.5 right-3 bg-rose-600 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full shadow-sm">
                    Desvio
                  </div>
                )}
                {isPge && (
                  <div className="absolute -top-2.5 right-3 bg-purple-600 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full shadow-sm">
                    Neutro
                  </div>
                )}
                <div>
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-1">
                    <span>Fase {idx + 1}</span>
                    <span className="text-[10px] font-semibold text-slate-400">Meta: {setor.metaDias}d</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 leading-snug line-clamp-2">
                    {setor.setorNome}
                  </h4>
                  <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{setor.responsavelPadrao}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/60">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-xl font-black text-slate-900">{setor.diasMediosReais}</span>
                      <span className="text-[11px] font-bold text-slate-500 ml-1">dias</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${pillColor}`}>
                      {setor.razaoEficiencia}x meta
                    </span>
                  </div>

                  {/* Barra de progresso da meta */}
                  <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2 overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full ${
                        isPge
                          ? "bg-purple-500"
                          : isGargalo
                          ? "bg-rose-600"
                          : isAtrasado
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                      }`}
                      style={{ width: `${Math.min(100, (setor.diasMediosReais / (setor.metaDias * 1.5)) * 100)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between mt-2 text-[10px] text-slate-500 font-medium">
                    <span>Score: <strong>{setor.score}</strong></span>
                    <span>{setor.processosAvaliados} proc.</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabela de Detalhamento por Setor */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Escala de Eficiência e Ratings Setoriais</h3>
            <p className="text-xs text-slate-500">Métricas analíticas consolidadas por departamento responsável.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Setor / Fase</th>
                <th className="py-3 px-4">Responsável Técnico</th>
                <th className="py-3 px-4 text-center">Meta SLA</th>
                <th className="py-3 px-4 text-center">Tempo Médio Real</th>
                <th className="py-3 px-4 text-center">Desvio / Razão</th>
                <th className="py-3 px-4 text-center">Score Eficiência</th>
                <th className="py-3 px-4 text-center">Classificação</th>
                <th className="py-3 px-4 text-center">Status do Desempenho</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {kpis.ratingsSetoriais.map((s) => {
                const b = formatarFaixaBadge(s.faixa);
                return (
                  <tr key={s.setorCodigo} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {s.setorNome}
                      {s.isExternoNeutro && (
                        <span className="ml-2 text-[10px] font-semibold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                          Externo / Informativo
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500">{s.responsavelPadrao}</td>
                    <td className="py-3 px-4 text-center font-semibold text-slate-600">{s.metaDias} dias</td>
                    <td className="py-3 px-4 text-center font-bold text-slate-900">{s.diasMediosReais} dias</td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`font-bold ${
                          s.razaoEficiencia > 1.2
                            ? "text-rose-600"
                            : s.razaoEficiencia > 1.0
                            ? "text-amber-600"
                            : "text-emerald-600"
                        }`}
                      >
                        {s.razaoEficiencia}x
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-black text-slate-800">{s.score}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${b.classes}`}>
                        {b.label}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {s.isGargaloPrincipal ? (
                        <span className="inline-flex items-center gap-1 font-bold text-rose-700 bg-rose-100 px-2.5 py-0.5 rounded-full border border-rose-300">
                          <AlertTriangle className="w-3 h-3" /> Maior Desvio
                        </span>
                      ) : s.isExternoNeutro ? (
                        <span className="font-semibold text-purple-700">Neutro (Referencial)</span>
                      ) : s.razaoEficiencia <= 1.0 ? (
                        <span className="font-semibold text-emerald-700">No Prazo</span>
                      ) : (
                        <span className="font-semibold text-amber-700">Atenção</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tabela de Processos SEI Individuais */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Processos de Licitação Avaliados</h3>
            <p className="text-xs text-slate-500">
              Rastreabilidade individual, tempo de ciclo interno UERN, tempo PGE e fases de maior desvio.
            </p>
          </div>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            {kpis.processos.length} Processos
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Processo SEI / Objeto</th>
                <th className="py-3 px-4">Setor Técnico</th>
                <th className="py-3 px-4">Status Atual</th>
                <th className="py-3 px-4 text-center">Tempo UERN</th>
                <th className="py-3 px-4 text-center">Tempo PGE</th>
                <th className="py-3 px-4 text-center">Fase Crítica do Processo</th>
                <th className="py-3 px-4 text-center">Taxa de Sucesso</th>
                <th className="py-3 px-4 text-center">Score</th>
                <th className="py-3 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {kpis.processos.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Nenhum processo de licitação encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                kpis.processos.map((proc) => {
                  const bProc = formatarFaixaBadge(proc.faixaProcesso);
                  return (
                    <tr key={proc.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4">
                        <strong className="block text-slate-900 font-mono text-[11px]">{proc.processoSEI}</strong>
                        <span className="text-slate-500 text-[11px]">{proc.categoriaNome}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{proc.setorTecnicoNome}</td>
                      <td className="py-3 px-4">
                        <span className="inline-block rounded bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-[#003366] border border-blue-200">
                          {proc.statusAtual}
                        </span>
                        {proc.responsavelAtual && (
                          <span className="block text-[10px] text-slate-400 mt-0.5 truncate max-w-[120px]">
                            {proc.responsavelAtual}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-900">
                        {proc.diasTotalInternoUern}d
                      </td>
                      <td className="py-3 px-4 text-center font-semibold text-purple-700">
                        {proc.diasPgeExterno > 0 ? `${proc.diasPgeExterno}d` : "—"}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {proc.gargaloIdentificado ? (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold text-rose-700 bg-rose-100 border border-rose-300">
                            {proc.gargaloIdentificado}
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-medium">Equilibrado</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-bold text-slate-800">
                          {proc.itensResumo.taxaSucessoPercent}%
                        </span>
                        <span className="block text-[9px] text-slate-400">
                          {proc.itensResumo.sucesso} de {proc.itensResumo.total} itens
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${bProc.classes}`}>
                          {proc.scoreProcesso}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/licitacoes/${proc.id}`}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-[#003366] hover:underline"
                        >
                          Ver <ArrowRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
