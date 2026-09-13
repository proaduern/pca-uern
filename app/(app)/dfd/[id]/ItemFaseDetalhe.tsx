"use client";

import { useState, useTransition } from "react";
import { formatarData } from "@/lib/formato";
import { obterTimelineItemDfdAction } from "@/lib/actions/fase-item";
import { confirmarRecebimentoEntregaAction, enviarContestacaoEntregaAction } from "@/lib/actions/entrega";

interface Fase {
  label: string;
  badge: "ok" | "warn" | "danger" | "neutral";
  executado: boolean;
  entregaId?: string;
  aguardaConfirmacao?: boolean;
  prazoConfirmacao?: string;
}

const BADGE_CLASSE: Record<Fase["badge"], string> = {
  ok: "bg-emerald-100 text-emerald-700",
  warn: "bg-amber-100 text-amber-700",
  danger: "bg-red-100 text-red-700",
  neutral: "bg-slate-100 text-slate-600",
};

export default function ItemFaseDetalhe({ itemId, fase }: { itemId: string; fase: Fase }) {
  const [timelineAberta, setTimelineAberta] = useState(false);
  const [timeline, setTimeline] = useState<{ data: string; titulo: string; desc: string }[] | null>(null);
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [mostrarContestacao, setMostrarContestacao] = useState(false);

  function alternarTimeline() {
    if (timelineAberta) {
      setTimelineAberta(false);
      return;
    }
    setTimelineAberta(true);
    if (timeline) return;
    startTransition(async () => {
      try {
        const eventos = await obterTimelineItemDfdAction(itemId);
        setTimeline(eventos);
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro inesperado.");
      }
    });
  }

  function confirmar() {
    setErro(null);
    startTransition(async () => {
      try {
        await confirmarRecebimentoEntregaAction(fase.entregaId!);
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro inesperado.");
      }
    });
  }

  return (
    <div className="mt-2 border-t border-slate-100 pt-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2 py-1 text-xs ${BADGE_CLASSE[fase.badge]}`}>{fase.label}</span>
        <button onClick={alternarTimeline} className="text-xs text-slate-500 underline">
          {timelineAberta ? "Ocultar linha do tempo" : "Ver linha do tempo"}
        </button>
      </div>

      {fase.aguardaConfirmacao && fase.entregaId && (
        <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm">
          <p className="text-amber-800">
            A Unidade de Entrega de Bens registrou este item como entregue. Confirme o recebimento, ou
            conteste caso não tenha sido efetivamente entregue. Sem manifestação até{" "}
            <b>{fase.prazoConfirmacao ? formatarData(fase.prazoConfirmacao) : "—"}</b>, o sistema considera a
            entrega automaticamente aceita.
          </p>
          <div className="mt-2 flex gap-2">
            <button
              disabled={isPending}
              onClick={confirmar}
              className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
            >
              Confirmar Recebimento
            </button>
            <button
              disabled={isPending}
              onClick={() => setMostrarContestacao((v) => !v)}
              className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
            >
              Contestar Entrega
            </button>
          </div>
          {mostrarContestacao && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setErro(null);
                const formData = new FormData(e.currentTarget);
                startTransition(async () => {
                  try {
                    await enviarContestacaoEntregaAction(fase.entregaId!, formData);
                    setMostrarContestacao(false);
                  } catch (err) {
                    setErro(err instanceof Error ? err.message : "Erro inesperado.");
                  }
                });
              }}
              className="mt-2 space-y-2"
            >
              <textarea
                name="motivo"
                required
                placeholder="Descreva o que houve"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs"
              />
              <button
                type="submit"
                disabled={isPending}
                className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
              >
                Enviar Contestação
              </button>
            </form>
          )}
        </div>
      )}

      {erro && <p className="mt-1 text-xs text-red-600">{erro}</p>}

      {timelineAberta && (
        <div className="mt-2 space-y-1.5">
          {!timeline ? (
            <p className="text-xs text-slate-400">Carregando…</p>
          ) : timeline.length === 0 ? (
            <p className="text-xs text-slate-400">Nenhum evento registrado ainda.</p>
          ) : (
            timeline.map((e, i) => (
              <div key={i} className="rounded-md bg-slate-50 p-2 text-xs">
                <p className="text-slate-400">{e.data}</p>
                <p className="font-medium text-slate-800">{e.titulo}</p>
                {e.desc && <p className="text-slate-600">{e.desc}</p>}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
