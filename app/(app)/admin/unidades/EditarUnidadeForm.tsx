"use client";

import { useState, useTransition } from "react";
import { atualizarUnidadeAction } from "@/lib/actions/admin";
import type { CotaTipo } from "@prisma/client";

interface UnidadeParaEdicao {
  id: string;
  nome: string;
  email: string;
  elegivelCotaOP: boolean;
  cotaOP: number;
  cotaGeral: number;
  cotaTipo: CotaTipo;
  verCotaGeralPCA: boolean;
}

export default function EditarUnidadeForm({ unidade }: { unidade: UnidadeParaEdicao }) {
  const [aberto, setAberto] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [elegivelCotaOP, setElegivelCotaOP] = useState(unidade.elegivelCotaOP);

  if (!aberto) {
    return (
      <button onClick={() => setAberto(true)} className="text-xs text-slate-600 underline">
        Editar
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
          const resultado = await atualizarUnidadeAction(unidade.id, formData);
          if (resultado.erro) {
            setErro(resultado.erro);
            return;
          }
          setAberto(false);
        });
      }}
      className="mt-2 w-64 space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3"
    >
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-700">Nome</label>
        <input
          name="nome"
          required
          defaultValue={unidade.nome}
          className="w-full rounded-xl border border-slate-300 px-2 py-1 text-xs"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-700">Email</label>
        <input
          name="email"
          type="email"
          required
          defaultValue={unidade.email}
          className="w-full rounded-xl border border-slate-300 px-2 py-1 text-xs"
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id={`elegivelCotaOP-${unidade.id}`}
          name="elegivelCotaOP"
          checked={elegivelCotaOP}
          onChange={(e) => setElegivelCotaOP(e.target.checked)}
          className="h-4 w-4"
        />
        <label htmlFor={`elegivelCotaOP-${unidade.id}`} className="text-xs text-slate-700">
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
          defaultValue={unidade.cotaOP}
          className="w-full rounded-xl border border-slate-300 px-2 py-1 text-xs"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-700">Cota Geral (R$)</label>
        <input
          name="cotaGeral"
          type="number"
          min={0}
          step="0.01"
          defaultValue={unidade.cotaGeral}
          className="w-full rounded-xl border border-slate-300 px-2 py-1 text-xs"
        />
      </div>
      {elegivelCotaOP ? (
        <p className="text-xs text-slate-500">
          Tipo de cota geral: derivado automaticamente (fechada se cota geral &gt; 0).
        </p>
      ) : (
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Tipo de cota geral</label>
          <select
            name="cotaTipo"
            defaultValue={unidade.cotaTipo}
            className="w-full rounded-xl border border-slate-300 px-2 py-1 text-xs"
          >
            <option value="FECHADA">Fechada (valor fixo)</option>
            <option value="ABERTA">Aberta (usa saldo do PCA)</option>
          </select>
        </div>
      )}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id={`verCotaGeralPCA-${unidade.id}`}
          name="verCotaGeralPCA"
          defaultChecked={unidade.verCotaGeralPCA}
          className="h-4 w-4"
        />
        <label htmlFor={`verCotaGeralPCA-${unidade.id}`} className="text-xs text-slate-700">
          Unidade vê a cota geral do PCA
        </label>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-700">
          Nova senha (deixe em branco para manter a atual)
        </label>
        <input
          name="novaSenha"
          type="password"
          minLength={8}
          className="w-full rounded-xl border border-slate-300 px-2 py-1 text-xs"
        />
      </div>

      {erro && <p className="text-xs text-red-600">{erro}</p>}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-[#003366] px-2 py-1 text-xs text-white hover:bg-[#002244] disabled:opacity-60"
        >
          {isPending ? "Salvando..." : "Salvar"}
        </button>
        <button type="button" onClick={() => setAberto(false)} className="text-xs text-slate-500">
          Cancelar
        </button>
      </div>
    </form>
  );
}
