"use client";

import { useState, useTransition } from "react";
import { autorizarExecucaoAtaAction } from "@/lib/actions/admin";

export default function AutorizarExecucaoAtaBotao({ consolidacaoId }: { consolidacaoId: string }) {
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  return (
    <div>
      <button
        disabled={isPending}
        onClick={() => {
          setErro(null);
          startTransition(async () => {
            try {
              await autorizarExecucaoAtaAction(consolidacaoId);
            } catch (e) {
              setErro(e instanceof Error ? e.message : "Erro inesperado.");
            }
          });
        }}
        className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
      >
        Autorizar Execução da Ata
      </button>
      {erro && <p className="mt-1 text-xs text-red-600">{erro}</p>}
    </div>
  );
}
