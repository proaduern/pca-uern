"use client";

import { useActionState } from "react";
import { trocarSenhaAction, type TrocarSenhaState } from "@/lib/actions/auth";

const initialState: TrocarSenhaState = {};

export default function TrocarSenhaPage() {
  const [state, formAction, pending] = useActionState(trocarSenhaAction, initialState);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold text-slate-900">Defina sua senha</h1>
        <p className="mb-6 text-sm text-slate-500">
          Este é seu primeiro acesso. Por segurança, defina uma senha própria antes de continuar.
        </p>

        <form action={formAction} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Nova senha</label>
            <input
              name="novaSenha"
              type="password"
              required
              minLength={8}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Confirme a nova senha
            </label>
            <input
              name="confirmacao"
              type="password"
              required
              minLength={8}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </div>

          {state.erro && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.erro}</p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {pending ? "Salvando..." : "Definir senha e continuar"}
          </button>
        </form>
      </div>
    </div>
  );
}
