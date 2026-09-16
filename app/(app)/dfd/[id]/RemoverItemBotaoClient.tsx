"use client";

import { useState, useTransition } from "react";
import { adminRemoverItemDfdAction, removerItemDfdAction } from "@/lib/actions/dfd";

export default function RemoverItemBotaoClient({
  dfdId,
  itemId,
  modoAdmin = false,
}: {
  dfdId: string;
  itemId: string;
  modoAdmin?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const action = modoAdmin ? adminRemoverItemDfdAction : removerItemDfdAction;

  return (
    <div>
      <button
        disabled={isPending}
        onClick={() => {
          setErro(null);
          startTransition(async () => {
            const resultado = await action(dfdId, itemId);
            if (resultado?.erro) setErro(resultado.erro);
          });
        }}
        className="mt-1 text-xs text-red-600 underline disabled:opacity-60"
      >
        Excluir
      </button>
      {erro && <p className="mt-1 text-xs text-red-600">{erro}</p>}
    </div>
  );
}
