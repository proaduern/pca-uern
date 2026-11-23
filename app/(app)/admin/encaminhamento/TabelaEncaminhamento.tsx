"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  encaminharDfdAction,
  encaminharLoteDfdsAction,
  encaminharTodasPadraoAction,
  reverterEncaminhamentoDfdAction,
} from "@/lib/actions/admin";
import { brl } from "@/lib/formato";
import {
  Send,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  ArrowRightLeft,
  RotateCcw,
  Building2,
  Calendar,
  Layers,
} from "lucide-react";

export interface SetorTecnicoOption {
  id: string;
  nome: string;
}

export interface DfdEncaminhamentoItem {
  id: string;
  ano: number;
  numero: number;
  descricaoSumaria: string;
  unidadeNome: string;
  categoriaNome: string;
  categoriaId: string;
  setorTecnicoPadraoId: string | null;
  setorTecnicoPadraoNome: string;
  setorTecnicoDestinoId: string | null;
  setorTecnicoDestinoNome?: string | null;
  statusEncaminhamento: "PENDENTE_DISTRIBUICAO" | "ENCAMINHADO_SETOR_TECNICO";
  encaminhadoSetorEm: Date | string | null;
  totalItens: number;
  totalValor: number;
  processoSeiOrigem?: string | null;
  idSeiDfdOrigem?: string | null;
  consolidado: boolean;
}

export default function TabelaEncaminhamento({
  dfdsPendentes,
  dfdsEncaminhados,
  setoresTecnicos,
}: {
  dfdsPendentes: DfdEncaminhamentoItem[];
  dfdsEncaminhados: DfdEncaminhamentoItem[];
  setoresTecnicos: SetorTecnicoOption[];
}) {
  const [abaAtiva, setAbaAtiva] = useState<"pendentes" | "encaminhados">("pendentes");
  const [busca, setBusca] = useState("");
  const [filtroSetor, setFiltroSetor] = useState<string>("todos");
  const [isPending, startTransition] = useTransition();
  const [msgSucesso, setMsgSucesso] = useState<string | null>(null);
  const [msgErro, setMsgErro] = useState<string | null>(null);

  // Mapeamento de setor escolhido por DFD no dropdown: dfdId -> setorTecnicoId
  const [destinosEscolhidos, setDestinosEscolhidos] = useState<Record<string, string>>(() => {
    const mapa: Record<string, string> = {};
    for (const d of dfdsPendentes) {
      mapa[d.id] = d.setorTecnicoDestinoId || d.setorTecnicoPadraoId || (setoresTecnicos[0]?.id ?? "");
    }
    for (const d of dfdsEncaminhados) {
      mapa[d.id] = d.setorTecnicoDestinoId || d.setorTecnicoPadraoId || (setoresTecnicos[0]?.id ?? "");
    }
    return mapa;
  });

  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());

  const listaAtual = abaAtiva === "pendentes" ? dfdsPendentes : dfdsEncaminhados;

  const filtrados = listaAtual.filter((d) => {
    if (filtroSetor !== "todos") {
      const setorId = abaAtiva === "pendentes" ? d.setorTecnicoPadraoId : d.setorTecnicoDestinoId;
      if (setorId !== filtroSetor) return false;
    }
    if (!busca.trim()) return true;
    const q = busca.toLowerCase();
    return (
      d.descricaoSumaria.toLowerCase().includes(q) ||
      d.unidadeNome.toLowerCase().includes(q) ||
      d.categoriaNome.toLowerCase().includes(q) ||
      d.setorTecnicoPadraoNome.toLowerCase().includes(q) ||
      (d.setorTecnicoDestinoNome || "").toLowerCase().includes(q) ||
      (d.processoSeiOrigem || "").toLowerCase().includes(q) ||
      (d.idSeiDfdOrigem || "").toLowerCase().includes(q) ||
      `${d.numero}/${d.ano}`.includes(q)
    );
  });

  function alternarSelecao(id: string, marcado: boolean) {
    setSelecionados((atual) => {
      const novo = new Set(atual);
      if (marcado) novo.add(id);
      else novo.delete(id);
      return novo;
    });
  }

  function alternarTodos(marcado: boolean) {
    setSelecionados(marcado ? new Set(filtrados.map((d) => d.id)) : new Set());
  }

  function alterarDestino(dfdId: string, novoSetorId: string) {
    setDestinosEscolhidos((prev) => ({
      ...prev,
      [dfdId]: novoSetorId,
    }));
  }

  function encaminharIndividual(dfdId: string) {
    const setorId = destinosEscolhidos[dfdId];
    if (!setorId) {
      setMsgErro("Selecione um Setor Técnico de destino.");
      return;
    }
    setMsgErro(null);
    setMsgSucesso(null);
    startTransition(async () => {
      const res = await encaminharDfdAction(dfdId, setorId);
      if (res.erro) {
        setMsgErro(res.erro);
      } else {
        setMsgSucesso("Demanda encaminhada com sucesso para o Setor Técnico!");
        setSelecionados((prev) => {
          const n = new Set(prev);
          n.delete(dfdId);
          return n;
        });
      }
    });
  }

  function encaminharSelecionados() {
    if (selecionados.size === 0) {
      setMsgErro("Selecione ao menos um DFD para encaminhar.");
      return;
    }
    const payload = Array.from(selecionados).map((id) => ({
      dfdId: id,
      setorTecnicoDestinoId: destinosEscolhidos[id],
    }));

    setMsgErro(null);
    setMsgSucesso(null);
    startTransition(async () => {
      const res = await encaminharLoteDfdsAction(payload);
      if (res.erro) {
        setMsgErro(res.erro);
      } else {
        setMsgSucesso(`${payload.length} demanda(s) encaminhada(s) com sucesso aos respectivos Setores Técnicos!`);
        setSelecionados(new Set());
      }
    });
  }

  function encaminharTodasPadrao() {
    if (!confirm(`Confirmar o encaminhamento de TODAS as ${dfdsPendentes.length} demandas aprovadas diretamente para seus Setores Técnicos Padrão?`)) {
      return;
    }
    setMsgErro(null);
    setMsgSucesso(null);
    startTransition(async () => {
      const res = await encaminharTodasPadraoAction();
      if (res.erro) {
        setMsgErro(res.erro);
      } else {
        setMsgSucesso(`Todas as ${res.totalEncaminhados ?? dfdsPendentes.length} demandas foram encaminhadas aos respectivos Setores Técnicos padrão!`);
        setSelecionados(new Set());
      }
    });
  }

  function reverterEncaminhamento(dfdId: string) {
    if (!confirm("Deseja reverter esta demanda para 'Pendente de Distribuição'? O Setor Técnico deixará de vê-la até novo encaminhamento.")) {
      return;
    }
    setMsgErro(null);
    setMsgSucesso(null);
    startTransition(async () => {
      const res = await reverterEncaminhamentoDfdAction(dfdId);
      if (res.erro) {
        setMsgErro(res.erro);
      } else {
        setMsgSucesso("Demanda retornada para a fila de distribuição da PROAD!");
      }
    });
  }

  const valorTotalPendentes = dfdsPendentes.reduce((acc, it) => acc + it.totalValor, 0);

  return (
    <div className="space-y-5">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Aguardando Distribuição</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-200/80 text-amber-800 text-xs font-black">
              {dfdsPendentes.length}
            </span>
          </div>
          <div className="mt-2 text-2xl font-black text-amber-900">{dfdsPendentes.length} DFDs</div>
          <p className="mt-1 text-xs text-amber-700 font-medium">Total: {brl(valorTotalPendentes)}</p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Distribuídos / Em Setor</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-200/80 text-emerald-800 text-xs font-black">
              {dfdsEncaminhados.length}
            </span>
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-900">{dfdsEncaminhados.length} DFDs</div>
          <p className="mt-1 text-xs text-emerald-700 font-medium">Bancada de ETP, Riscos e Consolidação</p>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#003366]">Setores Técnicos Ativos</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-200/80 text-[#003366] text-xs font-black">
              {setoresTecnicos.length}
            </span>
          </div>
          <div className="mt-2 text-2xl font-black text-[#003366]">{setoresTecnicos.length} Setores</div>
          <p className="mt-1 text-xs text-blue-700 font-medium">Incluindo Comissões e Comitês Especiais</p>
        </div>
      </div>

      {/* Alertas */}
      {msgSucesso && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{msgSucesso}</span>
        </div>
      )}
      {msgErro && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{msgErro}</span>
        </div>
      )}

      {/* Abas */}
      <div className="flex border-b border-slate-200 space-x-2">
        <button
          type="button"
          onClick={() => {
            setAbaAtiva("pendentes");
            setSelecionados(new Set());
          }}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition flex items-center gap-2 ${
            abaAtiva === "pendentes"
              ? "border-[#003366] text-[#003366]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <span>1. Pendentes de Distribuição</span>
          <span className="rounded-full bg-amber-100 text-amber-800 text-[11px] px-2 py-0.5 font-bold">
            {dfdsPendentes.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setAbaAtiva("encaminhados");
            setSelecionados(new Set());
          }}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition flex items-center gap-2 ${
            abaAtiva === "encaminhados"
              ? "border-[#003366] text-[#003366]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <span>2. Demandas Já Distribuídas</span>
          <span className="rounded-full bg-emerald-100 text-emerald-800 text-[11px] px-2 py-0.5 font-bold">
            {dfdsEncaminhados.length}
          </span>
        </button>
      </div>

      {/* Barra de Ações e Filtros */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {abaAtiva === "pendentes" && (
            <>
              <button
                type="button"
                disabled={isPending || selecionados.size === 0}
                onClick={encaminharSelecionados}
                className="flex items-center gap-1.5 rounded-xl bg-[#003366] px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#002244] disabled:opacity-50 transition"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Encaminhar Selecionadas ({selecionados.size})</span>
              </button>

              <button
                type="button"
                disabled={isPending || dfdsPendentes.length === 0}
                onClick={encaminharTodasPadrao}
                className="flex items-center gap-1.5 rounded-xl border border-indigo-300 bg-indigo-50 px-3.5 py-2 text-xs font-bold text-indigo-900 shadow-xs hover:bg-indigo-100 disabled:opacity-50 transition"
                title="Encaminha todas as demandas pendentes automaticamente para os Setores Técnicos Padrão das suas Categorias"
              >
                <ArrowRightLeft className="h-3.5 w-3.5 text-indigo-600" />
                <span>Encaminhar Todas pelo Padrão ({dfdsPendentes.length})</span>
              </button>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filtro Setor */}
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 shadow-xs">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={filtroSetor}
              onChange={(e) => setFiltroSetor(e.target.value)}
              className="bg-transparent text-xs font-medium text-slate-700 focus:outline-none"
            >
              <option value="todos">Todos os Setores Técnicos</option>
              {setoresTecnicos.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Campo de Busca */}
          <div className="relative min-w-[240px]">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar unidade, objeto, DFD..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs placeholder:text-slate-400 focus:border-[#003366] focus:outline-none shadow-xs"
            />
          </div>
        </div>
      </div>

      {/* Tabela de Demandas */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            <tr>
              {abaAtiva === "pendentes" && (
                <th className="px-3 py-3 w-8">
                  <input
                    type="checkbox"
                    checked={filtrados.length > 0 && selecionados.size === filtrados.length}
                    onChange={(e) => alternarTodos(e.target.checked)}
                    className="rounded border-slate-300 text-[#003366] focus:ring-[#003366]"
                  />
                </th>
              )}
              <th className="px-3 py-3">DFD / Objeto</th>
              <th className="px-3 py-3">Unidade Demandante</th>
              <th className="px-3 py-3">Categoria</th>
              <th className="px-3 py-3 text-right">Valor Total</th>
              <th className="px-3 py-3">Setor Técnico Padrão</th>
              <th className="px-3 py-3">
                {abaAtiva === "pendentes" ? "Destino a Encaminhar" : "Setor Técnico Efetivo"}
              </th>
              <th className="px-3 py-3 text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtrados.map((dfd) => {
              const estaSelecionado = selecionados.has(dfd.id);
              const setorDestinoId = destinosEscolhidos[dfd.id] || dfd.setorTecnicoDestinoId || dfd.setorTecnicoPadraoId || "";
              const destinoDiferenteDoPadrao = dfd.setorTecnicoPadraoId && setorDestinoId !== dfd.setorTecnicoPadraoId;

              return (
                <tr
                  key={dfd.id}
                  className={`transition hover:bg-slate-50/80 ${estaSelecionado ? "bg-blue-50/40" : ""}`}
                >
                  {abaAtiva === "pendentes" && (
                    <td className="px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={estaSelecionado}
                        onChange={(e) => alternarSelecao(dfd.id, e.target.checked)}
                        className="rounded border-slate-300 text-[#003366] focus:ring-[#003366]"
                      />
                    </td>
                  )}
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5 font-bold text-slate-800">
                      <Link
                        href={`/dfd/${dfd.id}`}
                        className="text-[#003366] hover:underline hover:text-blue-700"
                        title="Ver / Editar DFD"
                      >
                        DFD {String(dfd.numero).padStart(4, "0")}/{dfd.ano}
                      </Link>
                    </div>
                    <p className="mt-0.5 line-clamp-2 max-w-sm text-slate-600 font-normal">
                      {dfd.descricaoSumaria}
                    </p>
                    {(dfd.processoSeiOrigem || dfd.idSeiDfdOrigem) && (
                      <span className="mt-1 inline-block text-[10px] text-slate-400">
                        SEI: {dfd.processoSeiOrigem || "—"} ({dfd.idSeiDfdOrigem || "—"})
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-slate-700 font-medium">
                    {dfd.unidadeNome}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                      {dfd.categoriaNome}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-bold text-slate-800">
                    {brl(dfd.totalValor)}
                  </td>
                  <td className="px-3 py-2.5 text-slate-600">
                    <span className="text-[11px] font-medium text-slate-600">
                      {dfd.setorTecnicoPadraoNome}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    {abaAtiva === "pendentes" ? (
                      <div className="space-y-1">
                        <select
                          value={setorDestinoId}
                          onChange={(e) => alterarDestino(dfd.id, e.target.value)}
                          className={`w-full rounded-lg border px-2 py-1 text-xs font-semibold focus:outline-none ${
                            destinoDiferenteDoPadrao
                              ? "border-amber-400 bg-amber-50 text-amber-900"
                              : "border-slate-200 bg-white text-slate-800"
                          }`}
                        >
                          {setoresTecnicos.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.nome}
                            </option>
                          ))}
                        </select>
                        {destinoDiferenteDoPadrao && (
                          <span className="block text-[10px] font-bold text-amber-700">
                            ⚠ Alterado da categoria padrão
                          </span>
                        )}
                      </div>
                    ) : (
                      <div>
                        <span className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md px-2 py-0.5 text-[11px]">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          {dfd.setorTecnicoDestinoNome || dfd.setorTecnicoPadraoNome}
                        </span>
                        {dfd.encaminhadoSetorEm && (
                          <span className="block mt-0.5 text-[10px] text-slate-400">
                            Em {new Date(dfd.encaminhadoSetorEm).toLocaleDateString("pt-BR")}
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {abaAtiva === "pendentes" ? (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => encaminharIndividual(dfd.id)}
                        className="inline-flex items-center gap-1 rounded-lg bg-[#003366] px-2.5 py-1 text-[11px] font-bold text-white shadow-xs hover:bg-[#002244] disabled:opacity-50 transition"
                      >
                        <Send className="h-3 w-3" />
                        <span>Encaminhar</span>
                      </button>
                    ) : (
                      <div className="flex items-center justify-end gap-1.5">
                        {dfd.consolidado ? (
                          <span
                            className="text-[10px] font-bold text-slate-400"
                            title="Esta demanda já teve itens consolidados no ETP/PCA pelo Setor Técnico"
                          >
                            Já consolidado
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => reverterEncaminhamento(dfd.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 transition"
                            title="Reverter para Pendente de Distribuição"
                          >
                            <RotateCcw className="h-3 w-3 text-slate-500" />
                            <span>Reverter</span>
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}

            {filtrados.length === 0 && (
              <tr>
                <td
                  colSpan={abaAtiva === "pendentes" ? 8 : 7}
                  className="px-4 py-8 text-center text-slate-400"
                >
                  {abaAtiva === "pendentes"
                    ? "Nenhuma demanda aprovada aguardando encaminhamento."
                    : "Nenhuma demanda encaminhada encontrada com os filtros atuais."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
