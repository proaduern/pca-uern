"use client";

import { useState, useTransition } from "react";
import { iniciarAtuarComoUsuarioAction } from "@/lib/actions/auth";

export default function AtuarComoUsuarioBotao({
  usuarioId,
  nomeUsuario,
}: {
  usuarioId: string;
  nomeUsuario?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  return (
    <div>
      <button
        disabled={isPending}
        title={nomeUsuario ? `Atuar como ${nomeUsuario}` : "Atuar como este usuário"}
        onClick={() => {
          setErro(null);
          startTransition(async () => {
            try {
              await iniciarAtuarComoUsuarioAction(usuarioId);
            } catch (e) {
              setErro(e instanceof Error ? e.message : "Erro inesperado.");
            }
          });
        }}
        className="rounded-lg bg-amber-500 px-2 py-1 text-xs font-medium text-white hover:bg-amber-600 disabled:opacity-60 transition"
      >
        {isPending ? "Acessando..." : "Atuar Como"}
      </button>
      {erro && <p className="mt-1 text-xs text-red-600">{erro}</p>}
    </div>
  );
}
