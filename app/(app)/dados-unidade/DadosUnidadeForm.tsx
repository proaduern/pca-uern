"use client";

import { useState, useTransition } from "react";
import { atualizarResponsavelUnidadeAction } from "@/lib/actions/unidade";

export default function DadosUnidadeForm({
  responsavelNome,
  responsavelMatricula,
  responsavelTelefone,
}: {
  responsavelNome: string | null;
  responsavelMatricula: string | null;
  responsavelTelefone: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setErro(null);
        setSalvo(false);
        const formData = new FormData(e.currentTarget);
        startTransition(async () => {
          try {
            await atualizarResponsavelUnidadeAction(formData);
            setSalvo(true);
          } catch (err) {
            setErro(err instanceof Error ? err.message : "Erro inesperado.");
          }
        });
      }}
      className="max-w-md space-y-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
    >
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-700">Nome completo</label>
        <input
          name="responsavelNome"
          defaultValue={responsavelNome ?? ""}
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-700">Matrícula</label>
        <input
          name="responsavelMatricula"
          defaultValue={responsavelMatricula ?? ""}
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-700">Telefone para contato</label>
        <input
          name="responsavelTelefone"
          defaultValue={responsavelTelefone ?? ""}
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      {erro && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
      {salvo && !erro && <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Salvo.</p>}

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
