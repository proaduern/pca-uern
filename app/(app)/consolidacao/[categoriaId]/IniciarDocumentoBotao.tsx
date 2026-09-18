"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ResultadoAcao } from "@/lib/actions/tipos";

export default function IniciarDocumentoBotao({
  rotulo,
  acao,
  consolidacaoTecnicaId,
}: {
  rotulo: string;
  acao: (consolidacaoTecnicaId: string) => Promise<ResultadoAcao>;
  consolidacaoTecnicaId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4">
      <button
        disabled={isPending}
        onClick={() => {
          setErro(null);
          startTransition(async () => {
            const resultado = await acao(consolidacaoTecnicaId);
            if (resultado.erro) {
              setErro(resultado.erro);
              return;
            }
            router.refresh();
          });
        }}
        className="rounded-xl bg-[#003366] px-3 py-2 text-sm font-medium text-white hover:bg-[#002244] disabled:opacity-60"
      >
        {isPending ? "Criando..." : rotulo}
      </button>
      {erro && <p className="mt-2 text-xs text-red-600">{erro}</p>}
    </div>
  );
}
