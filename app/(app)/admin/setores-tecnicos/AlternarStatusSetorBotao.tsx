"use client";

import { useTransition } from "react";
import { alternarStatusSetorTecnicoAction } from "@/lib/actions/admin";

export default function AlternarStatusSetorBotao({
  id,
  ativo,
}: {
  id: string;
  ativo: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          await alternarStatusSetorTecnicoAction(id, !ativo);
        });
      }}
      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold transition ${
        ativo
          ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
      }`}
      title={ativo ? "Clique para inativar este setor técnico" : "Clique para reativar este setor técnico"}
    >
      {isPending ? "..." : ativo ? "Ativo" : "Inativo"}
    </button>
  );
}
