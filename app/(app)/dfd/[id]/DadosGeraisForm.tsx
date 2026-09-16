"use client";

import { useState, useTransition } from "react";
import { adminAtualizarDadosGeraisDfdAction, atualizarDadosGeraisDfdAction } from "@/lib/actions/dfd";
import type { Prioridade, Tipificacao, TipoDemanda } from "@prisma/client";
import { DESCRICAO_SUMARIA_MAX, JUSTIFICATIVA_MIN } from "@/lib/dfd-validacao";

interface DfdParaDadosGerais {
  id: string;
  descricaoSumaria: string;
  tipificacaoId: string | null;
  prioridadeId: string;
  justificativa: string;
  tipoDemanda: TipoDemanda;
  dataRenovacao: Date | null;
  dataEntrega: Date | null;
}

export default function DadosGeraisForm({
  dfd,
  tipificacoes,
  prioridades,
  podeEditar,
  modoAdmin = false,
}: {
  dfd: DfdParaDadosGerais;
  tipificacoes: Tipificacao[];
  prioridades: Prioridade[];
  podeEditar: boolean;
  modoAdmin?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [tipoDemanda, setTipoDemanda] = useState(dfd.tipoDemanda);
  const [justificativaLen, setJustificativaLen] = useState(dfd.justificativa.length);

  const dataAtual = dfd.tipoDemanda === "RENOVACAO" ? dfd.dataRenovacao : dfd.dataEntrega;
  const dataStr = dataAtual ? new Date(dataAtual).toISOString().slice(0, 10) : "";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setErro(null);
        setSucesso(false);
        const formData = new FormData(e.currentTarget);
        startTransition(async () => {
          const action = modoAdmin ? adminAtualizarDadosGeraisDfdAction : atualizarDadosGeraisDfdAction;
          const resultado = await action(dfd.id, formData);
          if (resultado.erro) {
            setErro(resultado.erro);
            return;
          }
          setSucesso(true);
        });
      }}
      className="space-y-4 rounded-2xl border border-slate-100 bg-white shadow-sm p-4"
    >
      <h2 className="text-sm font-semibold text-slate-900">Dados gerais</h2>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-700">
          Descrição sumária da demanda
        </label>
        <input
          name="descricaoSumaria"
          disabled={!podeEditar}
          required
          maxLength={DESCRICAO_SUMARIA_MAX}
          defaultValue={dfd.descricaoSumaria}
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            Tipificação do problema
          </label>
          <select
            name="tipificacaoId"
            required
            disabled={!podeEditar}
            defaultValue={dfd.tipificacaoId ?? ""}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
          >
            <option value="">Selecione...</option>
            {tipificacoes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            Nível de prioridade
          </label>
          <select
            name="prioridadeId"
            required
            disabled={!podeEditar}
            defaultValue={dfd.prioridadeId}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
          >
            <option value="">Selecione...</option>
            {prioridades.map((p) => (
              <option key={p.id} value={p.id}>
                {p.frase}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-700">
          Justificativa da necessidade
        </label>
        <textarea
          name="justificativa"
          disabled={!podeEditar}
          required
          rows={4}
          defaultValue={dfd.justificativa}
          onChange={(e) => setJustificativaLen(e.target.value.length)}
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
        />
        <p
          className={`mt-1 text-xs ${justificativaLen < JUSTIFICATIVA_MIN ? "text-red-600" : "text-emerald-600"}`}
        >
          {justificativaLen}/{JUSTIFICATIVA_MIN} caracteres mínimos.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            Natureza da demanda
          </label>
          <select
            name="tipoDemanda"
            required
            disabled={!podeEditar}
            value={tipoDemanda}
            onChange={(e) => setTipoDemanda(e.target.value as typeof tipoDemanda)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
          >
            <option value="NOVA">Nova compra/contratação</option>
            <option value="RENOVACAO">Renovação de contrato</option>
            <option value="FLUXO_CONTINUO">
              Fluxo Contínuo — Passagens, Hospedagens e Diárias
            </option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            {tipoDemanda === "RENOVACAO" ? "Data prevista de renovação" : "Data pretendida de entrega"}
          </label>
          <input
            name="data"
            type="date"
            required
            disabled={!podeEditar}
            defaultValue={dataStr}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
          />
        </div>
      </div>

      {erro && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
      {sucesso && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">Salvo.</p>
      )}

      {podeEditar && (
        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl bg-[#003366] px-3 py-2 text-sm font-medium text-white hover:bg-[#002244] disabled:opacity-60"
        >
          {isPending ? "Salvando..." : "Salvar dados gerais"}
        </button>
      )}
    </form>
  );
}
