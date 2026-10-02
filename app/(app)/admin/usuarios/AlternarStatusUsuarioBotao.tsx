"use client";

import { useState, useTransition } from "react";
import { alternarStatusUsuarioAction } from "@/lib/actions/admin";

export default function AlternarStatusUsuarioBotao({
  id,
  ativo,
}: {
  id: string;
  ativo: boolean;
}) {
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
              await alternarStatusUsuarioAction(id, !ativo);
            } catch (e) {
              setErro(e instanceof Error ? e.message : "Erro ao alterar status.");
            }
          });
        }}
        className={`rounded-lg px-2 py-1 text-xs font-medium transition disabled:opacity-50 ${
          ativo
            ? "border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
            : "border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
        }`}
      >
        {isPending ? "Salvando..." : ativo ? "Desativar" : "Ativar"}
      </button>
      {erro && <p className="mt-1 text-xs text-red-600">{erro}</p>}
    </div>
  );
}
