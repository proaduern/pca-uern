"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, CheckCircle2, Send } from "lucide-react";
import { formatarDataHora } from "@/lib/formato";
import { concluirDiligenciaSetorTecnicoAction } from "@/lib/actions/fluxo-pos-etp";

export default function BannerDiligenciaAgente({
  consolidacaoId,
  etapaFluxoPosEtp,
  diligenciaAgenteAlvo,
  diligenciaAgenteMotivo,
  diligenciaAgenteEm,
  diligenciaAgenteAtendidaEm,
  etpFinalizado,
}: {
  consolidacaoId: string;
  etapaFluxoPosEtp: string | null;
  diligenciaAgenteAlvo: string | null;
  diligenciaAgenteMotivo: string | null;
  diligenciaAgenteEm: string | null;
  diligenciaAgenteAtendidaEm: string | null;
  etpFinalizado: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);

  if (!diligenciaAgenteMotivo) return null;

  const emDiligencia = etapaFluxoPosEtp === "DILIGENCIA_SETOR_TECNICO";

  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm space-y-2 ${
        emDiligencia
          ? "border-amber-300 bg-amber-50/80 text-amber-950"
          : "border-emerald-200 bg-emerald-50/70 text-emerald-950"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-bold text-sm">
          {emDiligencia ? (
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          )}
          <span>
            {emDiligencia
              ? `Diligência Preliminar do Agente de Contratação (Alvo: ${diligenciaAgenteAlvo ?? "ETP / Itens"})`
              : "Diligência do Agente de Contratação Atendida"}
          </span>
        </div>
        <span className="text-xs opacity-75">
          {diligenciaAgenteEm ? `Registrada em ${formatarDataHora(diligenciaAgenteEm)}` : ""}
        </span>
      </div>

      <p className="text-xs leading-relaxed">
        <b>Inconsistência / Orientação do Agente:</b> {diligenciaAgenteMotivo}
      </p>

      {erro && <p className="rounded-lg bg-red-100 px-3 py-1.5 text-xs text-red-800">{erro}</p>}
      {mensagem && <p className="rounded-lg bg-emerald-100 px-3 py-1.5 text-xs text-emerald-800">{mensagem}</p>}

      {emDiligencia && (
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <span className="text-[11px] text-amber-800">
            Realize os ajustes necessários no ETP e/ou na Lista de Itens e clique em Finalizar ETP (ou no botão ao lado) para devolver ao Agente de Contratação.
          </span>
          {etpFinalizado && (
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                setErro(null);
                setMensagem(null);
                startTransition(async () => {
                  const res = await concluirDiligenciaSetorTecnicoAction(consolidacaoId);
                  if (res.erro) {
                    setErro(res.erro);
                    return;
                  }
                  setMensagem("Diligência concluída! O processo retornou ao Agente de Contratação.");
                });
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-amber-800 disabled:opacity-60"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{isPending ? "Reenviando..." : "Devolver ao Agente de Contratação"}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
