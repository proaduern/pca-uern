"use client";

import { useState, useTransition } from "react";
import { proporAtendimentoEstoqueAction } from "@/lib/actions/estoque";

export default function ProporAtendimentoEstoqueBotao({ itemDfdId }: { itemDfdId: string }) {
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
              await proporAtendimentoEstoqueAction(itemDfdId);
            } catch (e) {
              setErro(e instanceof Error ? e.message : "Erro inesperado.");
            }
          });
        }}
        className="rounded-md bg-amber-500 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
      >
        Propor Atendimento
      </button>
      {erro && <p className="mt-1 text-xs text-red-600">{erro}</p>}
    </div>
  );
}
