"use client";

import { useState, useTransition } from "react";
import { brl, formatarDataHora } from "@/lib/formato";
import { statusEntregaLabel, type StatusEntregaInfo, type StatusEntregaValor } from "@/lib/entrega";
import { avancarStatusEntregaAction } from "@/lib/actions/entrega";

interface HistoricoLinha {
  id: string;
  status: StatusEntregaValor;
  criadoEm: string;
}

export default function PainelEntregaDetalhe({
  entregaId,
  itemNome,
  unidadeNome,
  categoriaNome,
  enquadramento,
  viaEstoque,
  valorAdjudicado,
  quantidadeItemOriginal,
  statusAtual,
  proximos,
  historico,
}: {
  entregaId: string;
  itemNome: string;
  unidadeNome: string | null;
  categoriaNome: string;
  enquadramento: "OP" | "GERAL" | "CONVENIO" | "RECURSOS_EXTRA";
  viaEstoque: boolean;
  valorAdjudicado: number;
  quantidadeItemOriginal: number;
  statusAtual: StatusEntregaValor | null;
  proximos: StatusEntregaInfo[];
  historico: HistoricoLinha[];
}) {
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);

  function executar(fn: () => Promise<string | undefined>, sucessoPadrao: string) {
    setErro(null);
    setMensagem(null);
    startTransition(async () => {
      try {
        const aviso = await fn();
        setMensagem(sucessoPadrao + (aviso ?? ""));
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro inesperado.");
      }
    });
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">
          {itemNome} {viaEstoque && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-normal">Atendimento por Estoque</span>}
        </h1>
        <p className="text-sm text-slate-600">
          Unidade demandante: {unidadeNome ?? "—"} · Categoria: {categoriaNome}
        </p>
        <p className="text-sm text-slate-600">Enquadramento: {enquadramento} · Valor adjudicado: {brl(valorAdjudicado)}</p>
      </div>

      {erro && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
      {mensagem && <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{mensagem}</p>}

      {proximos.length > 0 ? (
        <AvancarStatusForm
          key={proximos.map((s) => s.value).join(",")}
          entregaId={entregaId}
          proximos={proximos}
          viaEstoque={viaEstoque}
          quantidadeItemOriginal={quantidadeItemOriginal}
          isPending={isPending}
          executar={executar}
        />
      ) : statusAtual === "ENTREGUE" ? (
        <div className="rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Este item já foi marcado como entregue ao destinatário.
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Histórico de Status (Timeline)</h2>
        <div className="space-y-2">
          {historico.map((h) => (
            <div key={h.id} className="rounded-md border border-slate-100 p-3 text-sm">
              <p className="font-medium text-slate-900">{statusEntregaLabel(h.status)}</p>
              <p className="text-xs text-slate-500">{formatarDataHora(h.criadoEm)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AvancarStatusForm({
  entregaId,
  proximos,
  viaEstoque,
  quantidadeItemOriginal,
  isPending,
  executar,
}: {
  entregaId: string;
  proximos: StatusEntregaInfo[];
  viaEstoque: boolean;
  quantidadeItemOriginal: number;
  isPending: boolean;
  executar: (fn: () => Promise<string | undefined>, sucessoPadrao: string) => void;
}) {
  const [statusSelecionado, setStatusSelecionado] = useState<StatusEntregaValor | "">(proximos[0]?.value ?? "");
  const mostraQuantidade = statusSelecionado === "ENTREGUE" && !viaEstoque && quantidadeItemOriginal > 1;

  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4">
      <h2 className="mb-1 text-sm font-semibold text-slate-900">Avançar Status da Entrega</h2>
      <p className="mb-3 text-xs text-slate-500">Só é possível avançar para a próxima etapa da sequência.</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          executar(() => avancarStatusEntregaAction(entregaId, formData), "Status atualizado com sucesso.");
        }}
        className="space-y-3"
      >
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Próxima etapa</label>
          <select
            name="status"
            required
            value={statusSelecionado}
            onChange={(e) => setStatusSelecionado(e.target.value as StatusEntregaValor)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          >
            {proximos.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        {mostraQuantidade && (
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Quantidade efetivamente entregue agora</label>
            <input
              name="quantidadeEntregue"
              type="number"
              min={1}
              max={quantidadeItemOriginal}
              defaultValue={quantidadeItemOriginal}
              className="w-32 rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-slate-500">
              Quantidade total do item: {quantidadeItemOriginal}. Se entregar menos que isso, o restante
              permanece pendente — volta a aguardar nova autorização da PROAD para uma entrega futura, sem se
              perder.
            </p>
          </div>
        )}
        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl bg-[#003366] px-3 py-2 text-sm font-medium text-white hover:bg-[#002244] disabled:opacity-60"
        >
          Registrar Status
        </button>
      </form>
    </div>
  );
}
