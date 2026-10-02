"use client";

import { useState, useTransition } from "react";
import { redefinirSenhaUsuarioAction } from "@/lib/actions/admin";
import { KeyRound } from "lucide-react";

export default function RedefinirSenhaUsuarioForm({ usuarioId }: { usuarioId: string }) {
  const [aberto, setAberto] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50"
        title="Redefinir senha de acesso do usuário"
      >
        <KeyRound className="h-3.5 w-3.5 text-amber-600" />
        <span>Senha</span>
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setErro(null);
        const formData = new FormData(e.currentTarget);
        startTransition(async () => {
          const resultado = await redefinirSenhaUsuarioAction(usuarioId, formData);
          if (resultado.erro) {
            setErro(resultado.erro);
            return;
          }
          setAberto(false);
        });
      }}
      className="flex flex-wrap items-center gap-1.5"
    >
      <input
        name="novaSenha"
        type="password"
        minLength={8}
        required
        placeholder="Nova senha (min. 8)"
        className="w-32 rounded-xl border border-slate-300 bg-white px-2 py-1 text-xs outline-none focus:border-blue-600"
      />
      <button
        type="submit"
        disabled={isPending}
        className="cursor-pointer rounded-lg bg-[#003366] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[#002244] disabled:opacity-60"
      >
        {isPending ? "..." : "Salvar"}
      </button>
      <button
        type="button"
        onClick={() => setAberto(false)}
        className="cursor-pointer text-xs text-slate-500 hover:text-slate-700"
      >
        Cancelar
      </button>
      {erro && <span className="block w-full text-[11px] text-red-600">{erro}</span>}
    </form>
  );
}
