"use client";

import { useState, useTransition } from "react";
import type { ResultadoAcao } from "@/lib/actions/tipos";

export default function BotaoExcluir({
  action,
  id,
  confirmMessage = "Tem certeza que deseja excluir?",
}: {
  action: (id: string) => Promise<ResultadoAcao | void>;
  id: string;
  confirmMessage?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  return (
    <div>
      <button
        disabled={isPending}
        onClick={() => {
          if (!confirm(confirmMessage)) return;
          setErro(null);
          startTransition(async () => {
            const resultado = await action(id);
            if (resultado?.erro) setErro(resultado.erro);
          });
        }}
        className="text-xs font-medium text-red-600 underline hover:text-red-800 disabled:opacity-60"
      >
        Excluir
      </button>
      {erro && <p className="mt-1 text-xs text-red-600">{erro}</p>}
    </div>
  );
}
