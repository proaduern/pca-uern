"use client";

import { useState, useTransition } from "react";
import { autorizarTrocaOPFinalAction, rejeitarTrocaOPFinalAction } from "@/lib/actions/estoque";

export default function TrocaOPAutorizacaoFinalBotoes({ trocaId, extrapola }: { trocaId: string; extrapola: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [mostrarRejeicao, setMostrarRejeicao] = useState(false);

  return (
    <div className="text-right">
      <button
        disabled={isPending}
        onClick={() => {
          if (extrapola && !confirm("Esta troca fará o saldo de Cota OP da unidade ficar negativo. Autorizar excepcionalmente mesmo assim?")) return;
          setErro(null);
          startTransition(async () => {
            try {
              await autorizarTrocaOPFinalAction(trocaId);
            } catch (e) {
              setErro(e instanceof Error ? e.message : "Erro inesperado.");
            }
          });
        }}
        className="rounded-md bg-amber-500 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
      >
        {extrapola ? "Autorizar Mesmo Assim" : "Autorizar Troca"}
      </button>
      <button
        disabled={isPending}
        onClick={() => setMostrarRejeicao((v) => !v)}
        className="mt-1 block rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
      >
        Rejeitar
      </button>
      {mostrarRejeicao && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setErro(null);
            const formData = new FormData(e.currentTarget);
            startTransition(async () => {
              try {
                await rejeitarTrocaOPFinalAction(trocaId, formData);
                setMostrarRejeicao(false);
              } catch (err) {
                setErro(err instanceof Error ? err.message : "Erro inesperado.");
              }
            });
          }}
          className="mt-2 flex gap-1"
        >
          <input name="motivo" required placeholder="Motivo (visível ao demandante)" className="w-56 rounded-md border border-slate-300 px-2 py-1 text-xs" />
          <button type="submit" disabled={isPending} className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100">
            Confirmar
          </button>
        </form>
      )}
      {erro && <p className="mt-1 text-xs text-red-600">{erro}</p>}
    </div>
  );
}
