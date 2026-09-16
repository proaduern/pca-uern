"use client";

import { useState, useTransition } from "react";
import { aprovarDfdAction, reprovarDfdAction } from "@/lib/actions/admin";
import type { ResultadoAcao } from "@/lib/actions/tipos";

export default function AprovacaoAcoes({ dfdId }: { dfdId: string }) {
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [mostrarMotivo, setMostrarMotivo] = useState(false);

  function executar(fn: () => Promise<ResultadoAcao>) {
    setErro(null);
    startTransition(async () => {
      const resultado = await fn();
      if (resultado.erro) setErro(resultado.erro);
    });
  }

  return (
    <div className="space-y-1">
      <div className="flex gap-2">
        <button
          disabled={isPending}
          onClick={() => executar(() => aprovarDfdAction(dfdId))}
          className="rounded-md bg-emerald-600 px-2 py-1 text-xs text-white disabled:opacity-60"
        >
          Aprovar
        </button>
        <button
          disabled={isPending}
          onClick={() => setMostrarMotivo((v) => !v)}
          className="rounded-md bg-red-600 px-2 py-1 text-xs text-white disabled:opacity-60"
        >
          Reprovar
        </button>
      </div>
      {mostrarMotivo && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            executar(() => reprovarDfdAction(dfdId, formData));
          }}
          className="flex gap-1"
        >
          <input
            name="motivo"
            required
            placeholder="Motivo"
            className="w-40 rounded-xl border border-slate-300 px-2 py-1 text-xs"
          />
          <button type="submit" className="rounded-lg bg-[#003366] px-2 py-1 text-xs text-white hover:bg-[#002244]">
            OK
          </button>
        </form>
      )}
      {erro && <p className="text-xs text-red-600">{erro}</p>}
    </div>
  );
}
