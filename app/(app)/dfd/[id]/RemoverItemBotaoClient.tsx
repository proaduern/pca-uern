"use client";

import { useTransition } from "react";
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
  const action = modoAdmin ? adminRemoverItemDfdAction : removerItemDfdAction;

  return (
    <button
      disabled={isPending}
      onClick={() => startTransition(() => action(dfdId, itemId))}
      className="mt-1 text-xs text-red-600 underline disabled:opacity-60"
    >
      Excluir
    </button>
  );
}
