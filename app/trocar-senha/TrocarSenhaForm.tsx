"use client";

import { useActionState } from "react";
import { KeyRound, AlertCircle } from "lucide-react";
import { trocarSenhaAction, type TrocarSenhaState } from "@/lib/actions/auth";

const initialState: TrocarSenhaState = {};

export default function TrocarSenhaPage() {
  const [state, formAction, pending] = useActionState(trocarSenhaAction, initialState);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-[#002244] to-[#003366] px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-100 bg-white p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-[#003366] shadow-inner">
            <KeyRound className="h-7 w-7 text-[#0055A5]" />
          </div>
          <h1 className="text-xl font-bold text-slate-800">Defina sua senha</h1>
          <p className="mt-1 text-sm text-slate-500">
            Este é seu primeiro acesso. Por segurança, defina uma senha própria antes de continuar.
          </p>
        </div>

        <form action={formAction} className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Nova senha
            </label>
            <input
              name="novaSenha"
              type="password"
              required
              minLength={8}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm outline-none transition-all hover:bg-white focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Confirme a nova senha
            </label>
            <input
              name="confirmacao"
              type="password"
              required
              minLength={8}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm outline-none transition-all hover:bg-white focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {state.erro && (
            <div className="flex items-start space-x-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
              <span>{state.erro}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl bg-[#003366] px-4 py-3.5 font-semibold text-white shadow-lg shadow-blue-900/20 transition-all hover:bg-[#002244] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {pending ? "Salvando..." : "Definir senha e continuar"}
          </button>
        </form>
      </div>
    </div>
  );
}
