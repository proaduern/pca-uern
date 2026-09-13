"use client";

import { useTransition } from "react";
import { encerrarAtuarComoAction } from "@/lib/actions/auth";

export default function VoltarParaAdminBotao() {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      disabled={isPending}
      onClick={() => startTransition(() => encerrarAtuarComoAction())}
      className="rounded-md bg-white px-2 py-1 text-xs font-medium text-amber-700 disabled:opacity-60"
    >
      Voltar para Admin
    </button>
  );
}
