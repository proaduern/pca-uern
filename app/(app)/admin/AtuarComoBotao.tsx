"use client";

import { useState, useTransition } from "react";
import { iniciarAtuarComoAction } from "@/lib/actions/auth";

export default function AtuarComoBotao({
  tipo,
  id,
}: {
  tipo:
    | "UNIDADE"
    | "SETOR_TECNICO"
    | "LICITACOES"
    | "PESQUISA_PRECOS"
    | "PLANEJAMENTO"
    | "AGENTE_CONTRATACAO"
    | "EXECUCAO"
    | "ENTREGA"
    | "GESTOR_ATA";
  id: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  return (
    <div>
      <button
        disabled={isPending}
        onClick={() => {
          setErro(null);
          startTransition(async () => {
            try {
              await iniciarAtuarComoAction(tipo, id);
            } catch (e) {
              setErro(e instanceof Error ? e.message : "Erro inesperado.");
            }
          });
        }}
        className="rounded-lg bg-amber-500 px-2 py-1 text-xs font-medium text-white disabled:opacity-60"
      >
        Atuar Como
      </button>
      {erro && <p className="mt-1 text-xs text-red-600">{erro}</p>}
    </div>
  );
}
