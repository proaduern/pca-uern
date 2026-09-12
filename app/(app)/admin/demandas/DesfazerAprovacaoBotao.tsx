"use client";

import { useState, useTransition } from "react";
import { desfazerAprovacaoDfdAction } from "@/lib/actions/admin";

export default function DesfazerAprovacaoBotao({ dfdId }: { dfdId: string }) {
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
              await desfazerAprovacaoDfdAction(dfdId);
            } catch (e) {
              setErro(e instanceof Error ? e.message : "Erro inesperado.");
            }
          });
        }}
        className="rounded-md bg-amber-600 px-2 py-1 text-xs text-white disabled:opacity-60"
      >
        Desfazer Aprovação
      </button>
      {erro && <p className="mt-1 text-xs text-red-600">{erro}</p>}
    </div>
  );
}
