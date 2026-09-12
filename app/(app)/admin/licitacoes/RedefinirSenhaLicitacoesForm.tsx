"use client";

import { useState, useTransition } from "react";
import { redefinirSenhaLicitacoesAction } from "@/lib/actions/admin";

export default function RedefinirSenhaLicitacoesForm({ licitacoesId }: { licitacoesId: string }) {
  const [aberto, setAberto] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  if (!aberto) {
    return (
      <button onClick={() => setAberto(true)} className="text-xs text-slate-600 underline">
        Redefinir senha
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
            await redefinirSenhaLicitacoesAction(licitacoesId, formData);
            setAberto(false);
          } catch (err) {
            setErro(err instanceof Error ? err.message : "Erro inesperado.");
          }
        });
      }}
      className="flex items-center gap-1"
    >
      <input
        name="novaSenha"
        type="password"
        minLength={8}
        required
        placeholder="Nova senha"
        className="w-28 rounded-md border border-slate-300 px-2 py-1 text-xs"
      />
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-slate-900 px-2 py-1 text-xs text-white disabled:opacity-60"
      >
        OK
      </button>
      <button type="button" onClick={() => setAberto(false)} className="text-xs text-slate-500">
        Cancelar
      </button>
      {erro && <span className="text-xs text-red-600">{erro}</span>}
    </form>
  );
}
