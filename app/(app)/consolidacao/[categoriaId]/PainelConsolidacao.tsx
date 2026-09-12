"use client";

import { useState, useTransition } from "react";
import { brl } from "@/lib/formato";
import {
  atualizarConsolidacaoAction,
  renomearConsolidadoAction,
  mesclarConsolidadosAction,
  aprovarConsolidadoAction,
  desfazerAprovacaoConsolidadoAction,
} from "@/lib/actions/consolidacao";

interface Origem {
  unidadeNome: string;
  enquadramento: string;
  quantidade: number;
  valorTotal: number;
}

interface Item {
  id: string;
  nomeItem: string;
  quantidadeTotal: number;
  valorTotal: number;
  status: "RASCUNHO" | "APROVADO";
  aprovadoPorNome: string | null;
  origens: Origem[];
}

const ENQUADRAMENTO_LABEL: Record<string, string> = {
  OP: "OP",
  GERAL: "Geral",
  CONVENIO: "Convênio",
};

export default function PainelConsolidacao({
  categoriaId,
  categoriaNome,
  pcaAno,
  pendentes,
  itens,
}: {
  categoriaId: string;
  categoriaNome: string;
  pcaAno: number | null;
  pendentes: number;
  itens: Item[];
}) {
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [editando, setEditando] = useState<string | null>(null);

  function executar(fn: () => Promise<unknown>, sucesso?: string) {
    setErro(null);
    setMensagem(null);
    startTransition(async () => {
      try {
        await fn();
        if (sucesso) setMensagem(sucesso);
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro inesperado.");
      }
    });
  }

  function alternarSelecao(id: string) {
    setSelecionados((atual) =>
      atual.includes(id) ? atual.filter((x) => x !== id) : atual.length < 2 ? [...atual, id] : atual,
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Consolidação — {categoriaNome}</h1>
        {pcaAno && <p className="text-sm text-slate-500">PCA {pcaAno}</p>}
      </div>

      {!pcaAno && (
        <div className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Nenhum PCA ativo no momento.
        </div>
      )}

      {pcaAno && (
        <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4">
          <p className="flex-1 text-sm text-slate-600">
            {pendentes} item(ns) de DFD aprovado(s) ainda não incluído(s) na consolidação abaixo.
          </p>
          <button
            disabled={isPending || pendentes === 0}
            onClick={() =>
              executar(async () => {
                const r = await atualizarConsolidacaoAction(categoriaId, pcaAno);
                setMensagem(`${r.criados} linha(s) nova(s), ${r.atualizados} atualizada(s).`);
              })
            }
            className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          >
            Atualizar consolidação
          </button>
        </div>
      )}

      {erro && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
      {mensagem && <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{mensagem}</p>}

      {selecionados.length === 2 && (
        <div className="flex items-center gap-3 rounded-md bg-slate-100 px-4 py-2 text-sm">
          <span>2 itens selecionados para mesclar.</span>
          <button
            disabled={isPending}
            onClick={() =>
              executar(async () => {
                await mesclarConsolidadosAction(selecionados[0], selecionados[1]);
                setSelecionados([]);
              }, "Itens mesclados.")
            }
            className="rounded-md bg-slate-900 px-2 py-1 text-xs text-white disabled:opacity-60"
          >
            Mesclar
          </button>
          <button onClick={() => setSelecionados([])} className="text-xs text-slate-500">
            Cancelar seleção
          </button>
        </div>
      )}

      <div className="space-y-3">
        {itens.map((item) => (
          <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                {item.status === "RASCUNHO" && (
                  <input
                    type="checkbox"
                    checked={selecionados.includes(item.id)}
                    onChange={() => alternarSelecao(item.id)}
                    className="mt-1 h-4 w-4"
                    title="Selecionar para mesclar"
                  />
                )}
                <div>
                  {editando === item.id ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        executar(async () => {
                          await renomearConsolidadoAction(item.id, String(formData.get("nome") ?? ""));
                          setEditando(null);
                        });
                      }}
                      className="flex items-center gap-2"
                    >
                      <input
                        name="nome"
                        defaultValue={item.nomeItem}
                        className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                        autoFocus
                      />
                      <button type="submit" className="text-xs text-slate-700 underline">
                        Salvar
                      </button>
                      <button type="button" onClick={() => setEditando(null)} className="text-xs text-slate-500">
                        Cancelar
                      </button>
                    </form>
                  ) : (
                    <p className="font-medium text-slate-900">
                      {item.nomeItem}{" "}
                      {item.status === "RASCUNHO" && (
                        <button
                          onClick={() => setEditando(item.id)}
                          className="text-xs font-normal text-slate-500 underline"
                        >
                          renomear
                        </button>
                      )}
                    </p>
                  )}
                  <p className="text-sm text-slate-600">
                    Quantidade total: {item.quantidadeTotal} · Valor total: {brl(item.valorTotal)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-1 text-xs ${
                    item.status === "APROVADO" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {item.status === "APROVADO" ? `Aprovado${item.aprovadoPorNome ? " · " + item.aprovadoPorNome : ""}` : "Rascunho"}
                </span>
                {item.status === "RASCUNHO" ? (
                  <button
                    disabled={isPending}
                    onClick={() => executar(() => aprovarConsolidadoAction(item.id), "Item aprovado.")}
                    className="rounded-md bg-emerald-600 px-2 py-1 text-xs text-white disabled:opacity-60"
                  >
                    Aprovar
                  </button>
                ) : (
                  <button
                    disabled={isPending}
                    onClick={() => executar(() => desfazerAprovacaoConsolidadoAction(item.id), "Aprovação desfeita.")}
                    className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100 disabled:opacity-60"
                  >
                    Desfazer aprovação
                  </button>
                )}
              </div>
            </div>

            <details className="mt-3">
              <summary className="cursor-pointer text-xs text-slate-500">
                Ver origem por unidade e enquadramento ({item.origens.length})
              </summary>
              <table className="mt-2 w-full text-xs">
                <thead className="text-left text-slate-500">
                  <tr>
                    <th className="py-1 pr-3 font-medium">Unidade</th>
                    <th className="py-1 pr-3 font-medium">Enquadramento</th>
                    <th className="py-1 pr-3 font-medium">Quantidade</th>
                    <th className="py-1 font-medium">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {item.origens.map((o, i) => (
                    <tr key={i}>
                      <td className="py-1 pr-3 text-slate-700">{o.unidadeNome}</td>
                      <td className="py-1 pr-3 text-slate-700">{ENQUADRAMENTO_LABEL[o.enquadramento]}</td>
                      <td className="py-1 pr-3 text-slate-700">{o.quantidade}</td>
                      <td className="py-1 text-slate-700">{brl(o.valorTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </div>
        ))}

        {itens.length === 0 && pcaAno && (
          <p className="rounded-lg border border-slate-200 bg-white p-4 text-center text-slate-400">
            Nenhuma consolidação gerada ainda.
          </p>
        )}
      </div>
    </div>
  );
}
