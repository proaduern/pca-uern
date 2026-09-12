"use client";

import { useState, useTransition } from "react";
import { renomearOuMesclarCategoriaAction } from "@/lib/actions/admin";

export default function RenomearCategoriaForm({
  categoriaId,
  nomeAtual,
}: {
  categoriaId: string;
  nomeAtual: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [aberto, setAberto] = useState(false);

  if (!aberto) {
    return (
      <button onClick={() => setAberto(true)} className="text-xs text-slate-600 underline">
        Renomear/mesclar
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setErro(null);
        const formData = new FormData(e.currentTarget);
        startTransition(async () => {
          try {
            await renomearOuMesclarCategoriaAction(categoriaId, formData);
            setAberto(false);
          } catch (err) {
            setErro(err instanceof Error ? err.message : "Erro inesperado.");
          }
        });
      }}
      className="space-y-1"
    >
      <input
        name="novoNome"
        defaultValue={nomeAtual}
        required
        disabled={isPending}
        className="w-40 rounded-md border border-slate-300 px-2 py-1 text-xs"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="text-xs font-medium text-slate-900 underline disabled:opacity-60"
        >
          {isPending ? "Salvando..." : "Salvar"}
        </button>
        <button
          type="button"
          onClick={() => setAberto(false)}
          className="text-xs text-slate-500 underline"
        >
          Cancelar
        </button>
      </div>
      <p className="text-[11px] text-slate-400">
        Se o nome já existir em outra categoria, as duas são mescladas.
      </p>
      {erro && <p className="text-xs text-red-600">{erro}</p>}
    </form>
  );
}
