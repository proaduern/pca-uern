"use client";

import { useTransition } from "react";
import { removerItemDfdAction } from "@/lib/actions/dfd";

export default function RemoverItemBotaoClient({
  dfdId,
  itemId,
}: {
  dfdId: string;
  itemId: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      disabled={isPending}
      onClick={() => startTransition(() => removerItemDfdAction(dfdId, itemId))}
      className="mt-1 text-xs text-red-600 underline disabled:opacity-60"
    >
      Excluir
    </button>
  );
}
