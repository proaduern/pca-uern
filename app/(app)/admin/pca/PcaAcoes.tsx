"use client";

import { useState, useTransition } from "react";
import {
  ativarPcaAction,
  desativarPcaAction,
  toggleAberturaExtraAction,
  toggleConcluidoAction,
} from "@/lib/actions/admin";

interface PcaResumo {
  ano: number;
  ativo: boolean;
  aberturaExtraGeral: boolean;
  concluido: boolean;
}

export default function PcaAcoes({ pca }: { pca: PcaResumo }) {
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
      {!pca.ativo ? (
        <button
          disabled={isPending}
          onClick={() => executar(() => ativarPcaAction(pca.ano))}
          className="rounded-lg bg-[#003366] px-2 py-1 text-white hover:bg-[#002244] disabled:opacity-60"
        >
          Ativar este PCA
        </button>
      ) : (
        <button
          disabled={isPending}
          onClick={() => executar(() => desativarPcaAction(pca.ano))}
          className="rounded-lg border border-slate-300 px-2 py-1 text-slate-700 hover:bg-slate-100 disabled:opacity-60"
        >
          Desativar (tira da lista de seleção)
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
