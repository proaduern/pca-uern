"use client";

import { useState, useTransition } from "react";
import { solicitarAutorizacaoCotaGeralAction } from "@/lib/actions/dfd";

export default function SolicitarAutorizacaoCotaGeralPainel({
  dfdId,
  dadosItem,
  onEnviado,
}: {
  dfdId: string;
  dadosItem: FormData;
  onEnviado: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [justificativa, setJustificativa] = useState("");

  return (
    <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50 p-3">
      <h4 className="text-sm font-semibold text-slate-900">
        Solicitar Autorização da PROAD
      </h4>
      <p className="text-xs text-slate-600">
        Explique por que esta demanda precisa usar Cota Geral fora da liberação
        padrão. A PROAD vai analisar e, se aceitar, o item é incluído
        automaticamente neste DFD.
      </p>
      <textarea
        value={justificativa}
        onChange={(e) => setJustificativa(e.target.value)}
        rows={3}
        placeholder="Justifique a necessidade (mínimo 50 caracteres)"
        className="w-full rounded-xl border border-slate-300 px-2 py-1 text-xs"
      />
      {erro && <p className="text-xs text-red-600">{erro}</p>}
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            setErro(null);
            const formData = dadosItem;
            formData.set("justificativa", justificativa);
            startTransition(async () => {
              const resultado = await solicitarAutorizacaoCotaGeralAction(
                dfdId,
                formData,
              );
              if (resultado.erro) {
                setErro(resultado.erro);
                return;
              }
              setJustificativa("");
              onEnviado();
            });
          }}
          className="rounded-lg bg-[#003366] px-2 py-1 text-xs text-white hover:bg-[#002244] disabled:opacity-60"
        >
          {isPending ? "Enviando..." : "Solicitar Autorização"}
        </button>
      </div>
    </div>
  );
}
