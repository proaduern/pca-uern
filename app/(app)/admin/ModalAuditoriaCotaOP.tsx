"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { brl } from "@/lib/formato";
import type {
  ResumoAuditoriaCotaOP,
  StatusAuditoriaOP,
} from "@/lib/auditoria-cota-op";

type FiltroAuditoria = "TODAS" | "ALERTAS" | "DENTRO";

const STATUS_BADGE: Record<StatusAuditoriaOP, { label: string; className: string }> = {
  DENTRO_LIMITE: {
    label: "Dentro do limite",
    className: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  },
  LIMITE_EXATO: {
    label: "Limite exato",
    className: "bg-sky-50 text-sky-700 border border-sky-200",
  },
  EXTRAPOLOU: {
    label: "Extrapolou cota",
    className: "bg-red-50 text-red-700 border border-red-200",
  },
  NAO_ELEGIVEL_COM_OP: {
    label: "Não elegível c/ OP",
    className: "bg-rose-100 text-rose-800 border border-rose-300",
  },
};

const DFD_STATUS_LABEL: Record<string, string> = {
  AGUARDANDO_APROVACAO: "Aguardando aprovação",
  APROVADO: "Aprovado",
  RASCUNHO: "Rascunho",
  REPROVADO: "Reprovado",
};

interface ModalAuditoriaCotaOPProps {
  resumo: ResumoAuditoriaCotaOP;
  /**
   * "card-pca": renderiza o card completo clicável "Fonte 500 — Cota OP" usado em /admin/pca.
   * "inline-consolidacao": renderiza o botão compacto dentro do card da Fonte 500 em /admin/consolidacao.
   */
  variant: "card-pca" | "inline-consolidacao";
}

export default function ModalAuditoriaCotaOP({
  resumo,
  variant,
}: ModalAuditoriaCotaOPProps) {
  const [aberto, setAberto] = useState(false);
  const [filtro, setFiltro] = useState<FiltroAuditoria>("TODAS");
  const [busca, setBusca] = useState("");
  const [expandidas, setExpandidas] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!aberto) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAberto(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [aberto]);

  const totalAlertas = resumo.qtdExtrapoladas + resumo.qtdNaoElegiveisComOP;
  const totalDentro = resumo.linhas.length - totalAlertas;

  const linhasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return resumo.linhas.filter((l) => {
      if (filtro === "ALERTAS") {
        if (l.status !== "EXTRAPOLOU" && l.status !== "NAO_ELEGIVEL_COM_OP") return false;
      } else if (filtro === "DENTRO") {
        if (l.status === "EXTRAPOLOU" || l.status === "NAO_ELEGIVEL_COM_OP") return false;
      }
      if (termo && !l.unidadeNome.toLowerCase().includes(termo)) return false;
      return true;
    });
  }, [resumo.linhas, filtro, busca]);

  const totaisFiltrados = useMemo(() => {
    return linhasFiltradas.reduce(
      (acc, l) => ({
        cotaOP: acc.cotaOP + l.cotaOP,
        demandadoPcaOP: acc.demandadoPcaOP + l.demandadoPcaOP,
        demandadoForaPcaOP: acc.demandadoForaPcaOP + l.demandadoForaPcaOP,
        totalDemandadoOP: acc.totalDemandadoOP + l.totalDemandadoOP,
        saldoDisponivel: acc.saldoDisponivel + l.saldoDisponivel,
      }),
      {
        cotaOP: 0,
        demandadoPcaOP: 0,
        demandadoForaPcaOP: 0,
        totalDemandadoOP: 0,
        saldoDisponivel: 0,
      },
    );
  }, [linhasFiltradas]);

  function alternarExpansao(unidadeId: string) {
    setExpandidas((prev) => ({ ...prev, [unidadeId]: !prev[unidadeId] }));
  }

  return (
    <>
      {variant === "card-pca" ? (
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="group w-full rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-left transition hover:border-[#003366]/40 hover:bg-blue-50/40 hover:shadow-xs focus:outline-none focus:ring-2 focus:ring-[#003366]/30"
          title="Clique para auditar a Cota OP detalhada por unidade"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-medium text-slate-600">Fonte 500 — Cota OP</p>
            <span className="rounded-full bg-[#003366]/10 px-2 py-0.5 text-[10px] font-semibold text-[#003366] transition group-hover:bg-[#003366] group-hover:text-white">
              Auditar ↗
            </span>
          </div>
          <p className="text-base font-bold text-slate-900">
            {brl(resumo.totalDemandadoPcaOP)}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Teto OP: {brl(resumo.tetoGlobalCotaOP)} ({resumo.percentualPcaSobreTeto.toFixed(1)}% no PCA)
          </p>
          {resumo.totalDemandadoForaPcaOP > 0 ? (
            <p className="text-[11px] text-slate-500">
              Total c/ Diárias: <strong>{brl(resumo.totalDemandadoOP)}</strong> (
              {resumo.percentualTotalSobreTeto.toFixed(1)}%)
            </p>
          ) : (
            <p className="text-[11px] text-slate-400">
              Saldo OP: {brl(resumo.saldoGlobalOP)}
            </p>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {totalAlertas > 0 ? (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                {totalAlertas} {totalAlertas === 1 ? "alerta" : "alertas"} por unidade
              </span>
            ) : (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                Saldo: {brl(resumo.saldoGlobalOP)}
              </span>
            )}
            <span className="text-[10px] text-[#003366] underline-offset-2 group-hover:underline">
              Ver unidades
            </span>
          </div>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg border border-[#003366]/20 bg-blue-50/70 px-2.5 py-1 text-[11px] font-semibold text-[#003366] transition hover:bg-[#003366] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#003366]/30"
          title="Abrir auditoria detalhada da Cota OP por unidade"
        >
          <span>
            Auditar Cota OP ({resumo.qtdUnidadesElegiveis} unid.)
          </span>
          {resumo.totalDemandadoForaPcaOP > 0 && (
            <span className="opacity-80">• c/ Diárias: {brl(resumo.totalDemandadoOP)}</span>
          )}
          <span>↗</span>
        </button>
      )}

      {aberto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 backdrop-blur-[1px] sm:p-5"
          onClick={() => setAberto(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby={`titulo-modal-op-${resumo.ano}`}
        >
          <div
            className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabeçalho */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-slate-50/80 px-5 py-4">
              <div>
                <h2
                  id={`titulo-modal-op-${resumo.ano}`}
                  className="text-base font-bold text-slate-900"
                >
                  Auditoria da Cota OP (Orçamento Participativo) — Ano {resumo.ano}
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Conciliação entre os itens OP compilados no PCA/PNCP e os itens OP fora do PCA
                  (ex.: Diárias), frente à cota de referência de cada unidade. Clique em uma
                  unidade para inspecionar seus DFDs.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAberto(false)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                aria-label="Fechar auditoria da Cota OP"
              >
                Fechar ✕
              </button>
            </div>

            {/* KPIs de Conciliação */}
            <div className="grid grid-cols-2 gap-2.5 border-b border-slate-100 bg-white px-5 py-3.5 sm:grid-cols-3 lg:grid-cols-5">
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-2.5">
                <p className="text-[11px] font-medium text-slate-500">
                  Teto Global OP ({resumo.ano})
                </p>
                <p className="text-sm font-bold text-slate-900">
                  {brl(resumo.tetoGlobalCotaOP)}
                </p>
                <p className="text-[10px] text-slate-400">
                  Alocado ({resumo.qtdUnidadesElegiveis} unid.): {brl(resumo.totalCotasAlocadas)}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-2.5">
                <p className="text-[11px] font-medium text-slate-500">OP no PCA / PNCP</p>
                <p className="text-sm font-bold text-slate-900">
                  {brl(resumo.totalDemandadoPcaOP)}
                </p>
                <p className="text-[10px] text-slate-500">
                  {resumo.percentualPcaSobreTeto.toFixed(1)}% do teto global OP
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-2.5">
                <p className="text-[11px] font-medium text-slate-500">
                  Fora do PCA (Diárias OP)
                </p>
                <p className="text-sm font-bold text-slate-900">
                  {brl(resumo.totalDemandadoForaPcaOP)}
                </p>
                <p className="text-[10px] text-slate-400">
                  Não vai ao PNCP, mas consome cota OP
                </p>
              </div>

              <div className="rounded-xl border border-[#003366]/20 bg-blue-50/50 p-2.5">
                <p className="text-[11px] font-semibold text-[#003366]">
                  Total Demandado OP
                </p>
                <p className="text-sm font-black text-[#003366]">
                  {brl(resumo.totalDemandadoOP)}
                </p>
                <p className="text-[10px] text-slate-600">
                  {resumo.percentualTotalSobreTeto.toFixed(1)}% do teto (PCA + Diárias)
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-2.5">
                <p className="text-[11px] font-medium text-slate-500">
                  Saldo Global Disponível
                </p>
                <p
                  className={`text-sm font-bold ${
                    resumo.saldoGlobalOP < 0 ? "text-red-600" : "text-emerald-700"
                  }`}
                >
                  {resumo.saldoGlobalOP > 0 ? "+" : ""}
                  {brl(resumo.saldoGlobalOP)}
                </p>
                <p className="text-[10px] text-slate-400">
                  Teto OP menos Total Demandado OP
                </p>
              </div>
            </div>

            {/* Filtros e Busca */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/40 px-5 py-2.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setFiltro("TODAS")}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                    filtro === "TODAS"
                      ? "bg-[#003366] text-white"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Todas ({resumo.linhas.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltro("ALERTAS")}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                    filtro === "ALERTAS"
                      ? "bg-red-600 text-white"
                      : totalAlertas > 0
                        ? "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                        : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Extrapoladas / Irregulares ({totalAlertas})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltro("DENTRO")}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                    filtro === "DENTRO"
                      ? "bg-emerald-700 text-white"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Dentro do limite ({totalDentro})
                </button>
              </div>

              <input
                type="search"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar unidade..."
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 placeholder:text-slate-400 focus:border-[#003366] focus:outline-none sm:w-64"
              />
            </div>

            {/* Tabela Detalhada */}
            <div className="flex-1 overflow-auto px-5 py-3">
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 z-10 bg-slate-100 text-left text-slate-600">
                    <tr>
                      <th className="px-3 py-2.5 font-semibold">Unidade</th>
                      <th className="px-2.5 py-2.5 text-center font-semibold">Ano</th>
                      <th className="px-2.5 py-2.5 text-right font-semibold">Cota OP Ref.</th>
                      <th className="px-2.5 py-2.5 text-right font-semibold">OP no PCA</th>
                      <th className="px-2.5 py-2.5 text-right font-semibold">
                        Fora do PCA (Diárias)
                      </th>
                      <th className="px-2.5 py-2.5 text-right font-semibold text-slate-800">
                        Total Demandado OP
                      </th>
                      <th className="px-2.5 py-2.5 text-right font-semibold">
                        Saldo Disponível
                      </th>
                      <th className="px-2.5 py-2.5 text-right font-semibold">% Uso</th>
                      <th className="px-3 py-2.5 font-semibold">Situação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {linhasFiltradas.length === 0 ? (
                      <tr>
                        <td
                          colSpan={9}
                          className="px-4 py-8 text-center text-slate-400"
                        >
                          Nenhuma unidade encontrada para o filtro selecionado.
                        </td>
                      </tr>
                    ) : (
                      linhasFiltradas.map((l) => {
                        const badge = STATUS_BADGE[l.status];
                        const estaExpandida = !!expandidas[l.unidadeId];
                        const temDfds = l.dfds.length > 0;
                        return (
                          <FragmentRow
                            key={l.unidadeId}
                            linha={l}
                            ano={resumo.ano}
                            badge={badge}
                            estaExpandida={estaExpandida}
                            temDfds={temDfds}
                            onToggle={() => alternarExpansao(l.unidadeId)}
                            onNavigate={() => setAberto(false)}
                          />
                        );
                      })
                    )}
                  </tbody>
                  {linhasFiltradas.length > 0 && (
                    <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-bold text-slate-900">
                      <tr>
                        <td className="px-3 py-2.5">
                          Total ({linhasFiltradas.length}{" "}
                          {linhasFiltradas.length === 1 ? "unidade" : "unidades"})
                        </td>
                        <td className="px-2.5 py-2.5 text-center text-slate-500">
                          {resumo.ano}
                        </td>
                        <td className="px-2.5 py-2.5 text-right whitespace-nowrap">
                          {brl(totaisFiltrados.cotaOP)}
                        </td>
                        <td className="px-2.5 py-2.5 text-right whitespace-nowrap">
                          {brl(totaisFiltrados.demandadoPcaOP)}
                        </td>
                        <td className="px-2.5 py-2.5 text-right whitespace-nowrap">
                          {brl(totaisFiltrados.demandadoForaPcaOP)}
                        </td>
                        <td className="px-2.5 py-2.5 text-right text-[#003366] whitespace-nowrap">
                          {brl(totaisFiltrados.totalDemandadoOP)}
                        </td>
                        <td
                          className={`px-2.5 py-2.5 text-right whitespace-nowrap ${
                            totaisFiltrados.saldoDisponivel < 0
                              ? "text-red-600"
                              : "text-emerald-700"
                          }`}
                        >
                          {totaisFiltrados.saldoDisponivel > 0 ? "+" : ""}
                          {brl(totaisFiltrados.saldoDisponivel)}
                        </td>
                        <td className="px-2.5 py-2.5 text-right whitespace-nowrap">
                          {totaisFiltrados.cotaOP > 0
                            ? `${(
                                (totaisFiltrados.totalDemandadoOP / totaisFiltrados.cotaOP) *
                                100
                              ).toFixed(1)}%`
                            : "—"}
                        </td>
                        <td className="px-3 py-2.5" />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* Rodapé */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-3 text-[11px] text-slate-500">
              <span>
                Considera todos os DFDs enviados para aprovação ou aprovados no exercício{" "}
                <strong>{resumo.ano}</strong>.
              </span>
              <Link
                href="/admin/unidades"
                onClick={() => setAberto(false)}
                className="font-semibold text-[#003366] hover:underline"
              >
                Gerenciar cotas das unidades em /admin/unidades ↗
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function FragmentRow({
  linha,
  ano,
  badge,
  estaExpandida,
  temDfds,
  onToggle,
  onNavigate,
}: {
  linha: ResumoAuditoriaCotaOP["linhas"][number];
  ano: number;
  badge: { label: string; className: string };
  estaExpandida: boolean;
  temDfds: boolean;
  onToggle: () => void;
  onNavigate: () => void;
}) {
  return (
    <>
      <tr
        onClick={temDfds ? onToggle : undefined}
        className={`${
          temDfds ? "cursor-pointer" : ""
        } ${
          linha.status === "NAO_ELEGIVEL_COM_OP"
            ? "bg-rose-50/60 hover:bg-rose-50"
            : linha.status === "EXTRAPOLOU"
              ? "bg-red-50/40 hover:bg-red-50/80"
              : "hover:bg-slate-50"
        }`}
      >
        <td className="px-3 py-2.5 font-semibold text-slate-900">
          <div className="flex items-center gap-1.5">
            {temDfds ? (
              <span className="inline-block w-3 text-[10px] text-slate-400">
                {estaExpandida ? "▼" : "▶"}
              </span>
            ) : (
              <span className="inline-block w-3" />
            )}
            <span>{linha.unidadeNome}</span>
            {temDfds && (
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-normal text-slate-500">
                {linha.dfds.length} {linha.dfds.length === 1 ? "DFD" : "DFDs"}
              </span>
            )}
          </div>
        </td>
        <td className="px-2.5 py-2.5 text-center text-slate-500">{ano}</td>
        <td className="px-2.5 py-2.5 text-right text-slate-700 whitespace-nowrap">
          {linha.elegivelCotaOP ? brl(linha.cotaOP) : "—"}
        </td>
        <td className="px-2.5 py-2.5 text-right text-slate-700 whitespace-nowrap">
          {brl(linha.demandadoPcaOP)}
        </td>
        <td className="px-2.5 py-2.5 text-right text-slate-600 whitespace-nowrap">
          {brl(linha.demandadoForaPcaOP)}
        </td>
        <td className="px-2.5 py-2.5 text-right font-semibold text-slate-900 whitespace-nowrap">
          {brl(linha.totalDemandadoOP)}
        </td>
        <td
          className={`px-2.5 py-2.5 text-right font-semibold whitespace-nowrap ${
            linha.saldoDisponivel < 0 ? "text-red-600" : "text-emerald-700"
          }`}
        >
          {linha.saldoDisponivel > 0 ? "+" : ""}
          {brl(linha.saldoDisponivel)}
        </td>
        <td className="px-2.5 py-2.5 text-right text-slate-600 whitespace-nowrap">
          {linha.percentualUtilizado !== null
            ? `${linha.percentualUtilizado.toFixed(1)}%`
            : "—"}
        </td>
        <td className="px-3 py-2.5 whitespace-nowrap">
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}
          >
            {badge.label}
          </span>
        </td>
      </tr>

      {estaExpandida && temDfds && (
        <tr className="bg-slate-50/80">
          <td colSpan={9} className="px-6 py-3">
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-slate-600">
                DFDs com itens enquadrados em OP — {linha.unidadeNome} ({linha.dfds.length})
              </p>
              <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white">
                <table className="w-full text-[11px]">
                  <thead className="bg-slate-50 text-left text-slate-500">
                    <tr>
                      <th className="px-2.5 py-1.5 font-medium">DFD</th>
                      <th className="px-2.5 py-1.5 font-medium">Descrição Sumária</th>
                      <th className="px-2.5 py-1.5 font-medium">Status</th>
                      <th className="px-2.5 py-1.5 text-center font-medium">Itens OP</th>
                      <th className="px-2.5 py-1.5 text-right font-medium">OP no PCA</th>
                      <th className="px-2.5 py-1.5 text-right font-medium">Fora do PCA</th>
                      <th className="px-2.5 py-1.5 text-right font-medium">Total OP</th>
                      <th className="px-2.5 py-1.5 text-right font-medium">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {linha.dfds.map((d) => (
                      <tr key={d.dfdId} className="hover:bg-slate-50/70">
                        <td className="px-2.5 py-1.5 font-mono text-slate-600 whitespace-nowrap">
                          {String(d.numero).padStart(4, "0")}/{ano}
                        </td>
                        <td className="px-2.5 py-1.5 text-slate-800 max-w-xs truncate" title={d.descricaoSumaria}>
                          {d.descricaoSumaria}
                        </td>
                        <td className="px-2.5 py-1.5 text-slate-500 whitespace-nowrap">
                          {DFD_STATUS_LABEL[d.status] ?? d.status}
                        </td>
                        <td className="px-2.5 py-1.5 text-center text-slate-600">
                          {d.qtdItensOp}
                        </td>
                        <td className="px-2.5 py-1.5 text-right text-slate-700 whitespace-nowrap">
                          {brl(d.valorPcaOp)}
                        </td>
                        <td className="px-2.5 py-1.5 text-right text-slate-600 whitespace-nowrap">
                          {brl(d.valorForaPcaOp)}
                        </td>
                        <td className="px-2.5 py-1.5 text-right font-semibold text-slate-900 whitespace-nowrap">
                          {brl(d.valorTotalOp)}
                        </td>
                        <td className="px-2.5 py-1.5 text-right whitespace-nowrap">
                          <Link
                            href={`/dfd/${d.dfdId}`}
                            onClick={onNavigate}
                            className="font-semibold text-[#003366] hover:underline"
                          >
                            Abrir DFD ↗
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
