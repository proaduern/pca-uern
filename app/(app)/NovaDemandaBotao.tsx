"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { criarRascunhoDfdAction } from "@/lib/actions/dfd";

export default function NovaDemandaBotao() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  return (
    <div>
      <button
        disabled={isPending}
        onClick={() => {
          setErro(null);
          startTransition(async () => {
            const resultado = await criarRascunhoDfdAction();
            if (resultado.erro) {
              setErro(resultado.erro);
              return;
            }
            if (resultado.dfdId) router.push(`/dfd/${resultado.dfdId}`);
          });
        }}
        className="rounded-xl bg-[#003366] px-3 py-2 text-sm font-medium text-white hover:bg-[#002244] disabled:opacity-60"
      >
        {isPending ? "Criando..." : "+ Nova Demanda (DFD)"}
      </button>
      {erro && <p className="mt-1 text-xs text-red-600">{erro}</p>}
    </div>
  );
}
