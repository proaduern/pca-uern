"use client";

import { useState, useTransition } from "react";
import { brl, formatarData, formatarDataHora } from "@/lib/formato";
import {
  statusExecucaoInfo,
  statusExecucaoLabel,
  type CampoStatusExecucao,
  type StatusExecucaoInfo,
  type StatusExecucaoValor,
} from "@/lib/execucao";
import { registrarStatusExecucaoAction } from "@/lib/actions/execucao";

const CAMPO_LABEL: Record<CampoStatusExecucao, string> = {
  dataEnvio: "Data de envio ao fornecedor",
  prazoDias: "Prazo contratual de execução (em dias)",
};
const CAMPO_TIPO: Record<CampoStatusExecucao, "text" | "date" | "number"> = {
  dataEnvio: "date",
  prazoDias: "number",
};

interface ItemLinha {
  id: string;
  nome: string;
  unidadeNome: string | null;
  tipo: "MATERIAL" | "SERVICO";
  quantidade: number;
  valorAdjudicado: number;
}

interface ItemMaterial {
  id: string;
  nome: string;
  unidadeNome: string | null;
  quantidade: number;
}

interface HistoricoLinha {
  id: string;
  status: StatusExecucaoValor;
  criadoEm: string;
  dataEnvio: string | null;
  prazoDias: number | null;
}

export default function PainelExecucaoProcesso({
  processoId,
  processoSEIExecucao,
  categoriaNome,
  processoSEILicitacao,
  itens,
  itensMaterialParaRecebimento,
  atraso,
  proximos,
  historico,
}: {
  processoId: string;
  processoSEIExecucao: string;
  categoriaNome: string;
  processoSEILicitacao: string;
  itens: ItemLinha[];
  itensMaterialParaRecebimento: ItemMaterial[];
  atraso: boolean;
  proximos: StatusExecucaoInfo[];
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
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">
          Processo de Execução {processoSEIExecucao} — {categoriaNome}
        </h1>
        <p className="text-xs text-slate-500">Processo SEI da Licitação: {processoSEILicitacao}</p>
      </div>

      {atraso && (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          Este processo está <b>em atraso pelo fornecedor</b> — o prazo contratual de execução já expirou
          sem confirmação de recebimento.
        </div>
      )}

      {erro && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
      {mensagem && <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{mensagem}</p>}

      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Itens do Processo ({itens.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="py-1 pr-2 font-medium">Item</th>
                <th className="py-1 pr-2 font-medium">Unidade Demandante</th>
                <th className="py-1 pr-2 font-medium">Qtd</th>
                <th className="py-1 font-medium">Valor Adjudicado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {itens.map((it) => (
                <tr key={it.id}>
                  <td className="py-1.5 pr-2 text-slate-900">{it.nome}</td>
                  <td className="py-1.5 pr-2 text-xs text-slate-600">{it.unidadeNome ?? "Setor Técnico"}</td>
                  <td className="py-1.5 pr-2 text-slate-600">{it.quantidade}</td>
                  <td className="py-1.5 text-slate-600">{brl(it.valorAdjudicado)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {proximos.length === 0 ? (
        <div className="rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Processo de execução concluído — não há próxima etapa disponível.
        </div>
      ) : (
        <ProximoStatusForm
          key={proximos.map((s) => s.value).join(",")}
          processoId={processoId}
          proximos={proximos}
          itensMaterialParaRecebimento={itensMaterialParaRecebimento}
          isPending={isPending}
          executar={executar}
        />
      )}

      {historico.length > 0 && (
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Histórico de Status (Timeline)</h2>
          <div className="space-y-2">
            {historico.map((h) => (
              <div key={h.id} className="rounded-md border border-slate-100 p-3 text-sm">
                <p className="font-medium text-slate-900">{statusExecucaoLabel(h.status)}</p>
                <p className="text-xs text-slate-500">{formatarDataHora(h.criadoEm)}</p>
                {(h.dataEnvio || h.prazoDias) && (
                  <p className="mt-1 text-xs text-slate-600">
                    {[h.dataEnvio && `Data de envio: ${formatarData(h.dataEnvio)}`, h.prazoDias && `Prazo contratual: ${h.prazoDias} dia(s)`]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ProximoStatusForm({
  processoId,
  proximos,
  itensMaterialParaRecebimento,
  isPending,
  executar,
}: {
  processoId: string;
  proximos: StatusExecucaoInfo[];
  itensMaterialParaRecebimento: ItemMaterial[];
  isPending: boolean;
  executar: (fn: () => Promise<string | undefined>, sucessoPadrao: string) => void;
}) {
  const [statusSelecionado, setStatusSelecionado] = useState<StatusExecucaoValor | "">(proximos[0]?.value ?? "");
  const infoSelecionado = statusSelecionado ? statusExecucaoInfo(statusSelecionado) : undefined;
  const mostraRecebimento = statusSelecionado === "RECEBIDA_DEFINITIVO" && itensMaterialParaRecebimento.length > 0;

  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4">
      <h2 className="mb-1 text-sm font-semibold text-slate-900">Registrar Próximo Status</h2>
      <p className="mb-3 text-xs text-slate-500">
        Só é possível avançar para a(s) etapa(s) seguinte(s) da sequência — a etapa anterior precisa estar concluída.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          executar(() => registrarStatusExecucaoAction(processoId, formData), "Status registrado com sucesso.");
        }}
        className="space-y-3"
      >
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            {proximos.length > 1 ? "Escolha a próxima etapa" : "Próxima etapa"}
          </label>
          <select
            name="status"
            required
            value={statusSelecionado}
            onChange={(e) => setStatusSelecionado(e.target.value as StatusExecucaoValor)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          >
            {proximos.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        {infoSelecionado?.campos.map((campo) => (
          <div key={campo}>
            <label className="mb-1 block text-xs font-medium text-slate-700">{CAMPO_LABEL[campo]}</label>
            <input
              name={campo}
              type={CAMPO_TIPO[campo]}
              min={campo === "prazoDias" ? 1 : undefined}
              required
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm sm:w-60"
            />
          </div>
        ))}
        {mostraRecebimento && (
          <div className="rounded-md border border-slate-200 p-3">
            <h3 className="mb-1 text-xs font-semibold text-slate-900">Quantidade Efetivamente Recebida</h3>
            <p className="mb-2 text-xs text-slate-500">
              Por padrão, considera-se recebida a quantidade total de cada item. Reduza apenas se houve
              recebimento parcial — o restante volta para uma nova abertura de processo de execução, sem se
              perder.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-left text-slate-500">
                  <tr>
                    <th className="py-1 pr-2 font-medium">Item</th>
                    <th className="py-1 pr-2 font-medium">Unidade Demandante</th>
                    <th className="py-1 pr-2 font-medium">Qtd Total</th>
                    <th className="py-1 font-medium">Qtd Recebida Agora</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {itensMaterialParaRecebimento.map((it) => (
                    <tr key={it.id}>
                      <td className="py-1 pr-2">{it.nome}</td>
                      <td className="py-1 pr-2">{it.unidadeNome ?? "Setor Técnico"}</td>
                      <td className="py-1 pr-2">{it.quantidade}</td>
                      <td className="py-1">
                        <input
                          type="number"
                          name={`qtd_${it.id}`}
                          min={0}
                          max={it.quantidade}
                          defaultValue={it.quantidade}
                          className="w-20 rounded-xl border border-slate-300 px-2 py-1 text-xs"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
