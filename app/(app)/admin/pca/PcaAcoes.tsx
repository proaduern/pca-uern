"use client";

import { useState, useTransition } from "react";
import {
  ativarPcaAction,
  toggleAberturaExtraAction,
  toggleConcluidoAction,
} from "@/lib/actions/admin";
import type { Pca } from "@prisma/client";

export default function PcaAcoes({ pca }: { pca: Pca }) {
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function executar(fn: () => Promise<unknown>) {
    setErro(null);
    startTransition(async () => {
      try {
        await fn();
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro inesperado.");
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3 text-xs">
      {!pca.ativo && (
        <button
          disabled={isPending}
          onClick={() => executar(() => ativarPcaAction(pca.ano))}
          className="rounded-md bg-slate-900 px-2 py-1 text-white disabled:opacity-60"
        >
          Ativar este PCA
        </button>
      )}
      <label className="flex items-center gap-1">
        <input
          type="checkbox"
          defaultChecked={pca.aberturaExtraGeral}
          disabled={isPending}
          onChange={(e) => executar(() => toggleAberturaExtraAction(pca.ano, e.target.checked))}
        />
        Abertura extra geral (ignora janela de datas para todas as unidades)
      </label>
      <label className="flex items-center gap-1">
        <input
          type="checkbox"
          defaultChecked={pca.concluido}
          disabled={isPending}
          onChange={(e) => executar(() => toggleConcluidoAction(pca.ano, e.target.checked))}
        />
        Concluído (bloqueia novos lançamentos)
      </label>
      {erro && <span className="text-red-600">{erro}</span>}
    </div>
  );
}
