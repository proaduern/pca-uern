"use client";

import { useRef, useState, useTransition } from "react";
import { criarUnidadeAction } from "@/lib/actions/admin";

export default function NovaUnidadeForm() {
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [elegivelCotaOP, setElegivelCotaOP] = useState(false);

  return (
    <form
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault();
        setErro(null);
        const formData = new FormData(e.currentTarget);
        startTransition(async () => {
          try {
            await criarUnidadeAction(formData);
            formRef.current?.reset();
            setElegivelCotaOP(false);
          } catch (err) {
            setErro(err instanceof Error ? err.message : "Erro inesperado.");
          }
        });
      }}
      className="space-y-3 rounded-2xl border border-slate-100 bg-white shadow-sm p-4"
    >
      <h2 className="text-sm font-semibold text-slate-900">Nova unidade</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Nome</label>
          <input name="nome" required className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Email</label>
          <input
            name="email"
            type="email"
            required
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            Senha inicial (provisória)
          </label>
          <input
            name="senhaInicial"
            type="password"
            required
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex items-center gap-2 pt-5">
          <input
            type="checkbox"
            id="elegivelCotaOP"
            name="elegivelCotaOP"
            checked={elegivelCotaOP}
            onChange={(e) => setElegivelCotaOP(e.target.checked)}
            className="h-4 w-4"
          />
          <label htmlFor="elegivelCotaOP" className="text-sm text-slate-700">
            Elegível para cota OP
          </label>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Cota OP (R$)</label>
          <input
            name="cotaOP"
            type="number"
            min={0}
            step="0.01"
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Cota Geral (R$)</label>
          <input
            name="cotaGeral"
            type="number"
            min={0}
            step="0.01"
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        {elegivelCotaOP ? (
          <p className="self-end text-xs text-slate-500">
            Tipo de cota geral: derivado automaticamente (fechada se a cota geral for maior que
            zero, aberta caso contrário) — unidades elegíveis a OP não escolhem manualmente.
          </p>
        ) : (
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Tipo de cota geral</label>
            <select
              name="cotaTipo"
              defaultValue="FECHADA"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="FECHADA">Fechada (valor fixo)</option>
              <option value="ABERTA">Aberta (usa saldo do PCA)</option>
            </select>
          </div>
        )}
        <div className="flex items-center gap-2 pt-5">
          <input type="checkbox" id="verCotaGeralPCA" name="verCotaGeralPCA" className="h-4 w-4" />
          <label htmlFor="verCotaGeralPCA" className="text-sm text-slate-700">
            Unidade vê a cota geral do PCA
          </label>
        </div>
      </div>

      {erro && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-xl bg-[#003366] px-3 py-2 text-sm font-medium text-white hover:bg-[#002244] disabled:opacity-60"
      >
        {isPending ? "Salvando..." : "Salvar"}
      </button>
    </form>
  );
}
