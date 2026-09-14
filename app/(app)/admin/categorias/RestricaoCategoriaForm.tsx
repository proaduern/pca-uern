"use client";

import { useState, useTransition } from "react";
import { definirRestricaoCategoriaAction } from "@/lib/actions/admin";
import SeletorUnidadesRestritas from "../SeletorUnidadesRestritas";

export default function RestricaoCategoriaForm({
  categoriaId,
  modoAtual,
  unidadesRestritasIds,
  unidades,
}: {
  categoriaId: string;
  modoAtual: "TODAS" | "SOMENTE" | "EXCETO";
  unidadesRestritasIds: string[];
  unidades: { id: string; nome: string }[];
}) {
  const [isPending, startTransition] = useTransition();
  const [modo, setModo] = useState(modoAtual);
  const [erro, setErro] = useState<string | null>(null);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setErro(null);
        const formData = new FormData(e.currentTarget);
        startTransition(async () => {
          try {
            await definirRestricaoCategoriaAction(categoriaId, formData);
          } catch (err) {
            setErro(err instanceof Error ? err.message : "Erro inesperado.");
          }
        });
      }}
      className="space-y-1"
    >
      <select
        name="modo"
        value={modo}
        disabled={isPending}
        onChange={(e) => setModo(e.target.value as typeof modo)}
        className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
      >
        <option value="TODAS">Visível para todas as unidades</option>
        <option value="SOMENTE">Somente para as unidades marcadas</option>
        <option value="EXCETO">Para todas, exceto as marcadas</option>
      </select>
      {modo !== "TODAS" && (
        <SeletorUnidadesRestritas
          name="unidadeId"
          unidades={unidades}
          selecionadosIniciais={unidadesRestritasIds}
          disabled={isPending}
        />
      )}
      <button
        type="submit"
        disabled={isPending}
        className="text-xs font-medium text-slate-600 underline disabled:opacity-60"
      >
        {isPending ? "Salvando..." : "Salvar visibilidade"}
      </button>
      {erro && <p className="text-xs text-red-600">{erro}</p>}
    </form>
  );
}
