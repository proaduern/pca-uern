"use client";

import { useState, useTransition } from "react";
import { salvarClassificacaoRubricaAction } from "@/lib/actions/admin";

export default function ClassificacaoRubricaInput({
  categoriaId,
  valorInicial,
}: {
  categoriaId: string;
  valorInicial: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  return (
    <div>
      <input
        type="text"
        defaultValue={valorInicial}
        placeholder="Ex: Materiais de consumo"
        disabled={isPending}
        onBlur={(e) => {
          setErro(null);
          startTransition(async () => {
            try {
              await salvarClassificacaoRubricaAction(categoriaId, e.target.value);
            } catch (err) {
              setErro(err instanceof Error ? err.message : "Erro inesperado.");
            }
          });
        }}
        className="w-40 rounded-xl border border-slate-300 px-2 py-1 text-xs"
      />
      {erro && <p className="text-xs text-red-600">{erro}</p>}
    </div>
  );
}
