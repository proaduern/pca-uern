"use client";

import { useState, useTransition } from "react";
import { solicitarExecucaoAtaAction } from "@/lib/actions/gestor-ata";

export default function SolicitarExecucaoAtaBotao({ consolidacaoId }: { consolidacaoId: string }) {
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
              await solicitarExecucaoAtaAction(consolidacaoId);
            } catch (e) {
              setErro(e instanceof Error ? e.message : "Erro inesperado.");
            }
          });
        }}
        className="rounded-md bg-amber-500 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
      >
        Solicitar Autorização à PROAD
      </button>
      {erro && <p className="mt-1 text-xs text-red-600">{erro}</p>}
    </div>
  );
}
