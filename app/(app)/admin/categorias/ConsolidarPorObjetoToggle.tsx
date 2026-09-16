"use client";

import { useState, useTransition } from "react";
import { salvarConsolidarPorObjetoAction } from "@/lib/actions/admin";

export default function ConsolidarPorObjetoToggle({
  categoriaId,
  valorInicial,
}: {
  categoriaId: string;
  valorInicial: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [marcado, setMarcado] = useState(valorInicial);

  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs text-slate-700">
        <input
          type="checkbox"
          checked={marcado}
          disabled={isPending}
          onChange={(e) => {
            const novoValor = e.target.checked;
            setMarcado(novoValor);
            setErro(null);
            startTransition(async () => {
              try {
                await salvarConsolidarPorObjetoAction(categoriaId, novoValor);
              } catch (err) {
                setMarcado(!novoValor);
                setErro(err instanceof Error ? err.message : "Erro inesperado.");
              }
            });
          }}
          className="h-4 w-4"
        />
        Cada objeto vira uma linha (obras, serviços por objeto)
      </label>
      {erro && <p className="text-xs text-red-600">{erro}</p>}
    </div>
  );
}
