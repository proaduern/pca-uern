"use client";

import { useState, useTransition } from "react";
import { aprovarContestacaoEntregaAction, rejeitarContestacaoEntregaAction } from "@/lib/actions/entrega";

export default function AnaliseContestacaoForm({ entregaId }: { entregaId: string }) {
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [mostrarRejeicao, setMostrarRejeicao] = useState(false);

  function aprovar() {
    setErro(null);
    startTransition(async () => {
      try {
        await aprovarContestacaoEntregaAction(entregaId);
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro inesperado.");
      }
    });
  }

  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-2">
        <button
          disabled={isPending}
          onClick={aprovar}
          className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
        >
          Aprovar Contestação
        </button>
        <button
          disabled={isPending}
          onClick={() => setMostrarRejeicao((v) => !v)}
          className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
        >
          Rejeitar Contestação
        </button>
      </div>
      {mostrarRejeicao && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setErro(null);
            const formData = new FormData(e.currentTarget);
            startTransition(async () => {
              try {
                await rejeitarContestacaoEntregaAction(entregaId, formData);
                setMostrarRejeicao(false);
              } catch (err) {
                setErro(err instanceof Error ? err.message : "Erro inesperado.");
              }
            });
          }}
          className="flex gap-2"
        >
          <input
            name="comentario"
            required
            placeholder="Motivo para rejeitar (visível ao demandante)"
            className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-xs"
          />
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs hover:bg-slate-100 disabled:opacity-60"
          >
            Confirmar
          </button>
        </form>
      )}
      {erro && <p className="text-xs text-red-600">{erro}</p>}
    </div>
  );
}
