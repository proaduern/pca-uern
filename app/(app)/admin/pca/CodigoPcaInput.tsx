"use client";

import { useState, useTransition } from "react";
import { salvarCodigoPcaAction } from "@/lib/actions/admin";

export default function CodigoPcaInput({
  consolidacaoId,
  valorInicial,
  desabilitado,
}: {
  consolidacaoId: string;
  valorInicial: string;
  desabilitado: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  return (
    <div>
      <input
        type="text"
        defaultValue={valorInicial}
        placeholder="Ex: 12345/2027"
        disabled={desabilitado || isPending}
        onBlur={(e) => {
          setErro(null);
          startTransition(async () => {
            try {
              await salvarCodigoPcaAction(consolidacaoId, e.target.value);
            } catch (err) {
              setErro(err instanceof Error ? err.message : "Erro inesperado.");
            }
          });
        }}
        className="w-40 rounded-md border border-slate-300 px-2 py-1 text-xs"
      />
      {erro && <p className="text-xs text-red-600">{erro}</p>}
    </div>
  );
}
