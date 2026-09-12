"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "@/lib/actions/auth";

const initialState: LoginState = {};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold text-slate-900">
          Sistema de Coleta de Demandas
        </h1>
        <p className="mb-6 text-sm text-slate-500">
          Universidade do Estado do Rio Grande do Norte — PROAD
        </p>

        <form action={formAction} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              E-mail institucional
            </label>
            <input
              name="email"
              type="email"
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
              placeholder="setor@uern.br"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Senha</label>
            <input
              name="senha"
              type="password"
              required
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
            {pending ? "Entrando..." : "Entrar"}
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-slate-400">
          Acesso restrito a unidades cadastradas pela administração da UERN.
        </p>
      </div>
    </div>
  );
}
