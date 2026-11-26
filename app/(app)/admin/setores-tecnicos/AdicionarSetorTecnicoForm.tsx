"use client";

import { useRef, useState, useTransition } from "react";
import { Plus, ShieldCheck } from "lucide-react";
import { adicionarSetorTecnicoDaUnidadeAction } from "@/lib/actions/admin";

interface UnidadeOpcao {
  id: string;
  nome: string;
  email: string;
}

export default function AdicionarSetorTecnicoForm({
  unidadesDisponiveis,
}: {
  unidadesDisponiveis: UnidadeOpcao[];
}) {
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault();
        setErro(null);
        setSucesso(null);
        const formData = new FormData(e.currentTarget);
        startTransition(async () => {
          const res = await adicionarSetorTecnicoDaUnidadeAction(formData);
          if (res?.erro) {
            setErro(res.erro);
          } else {
            setSucesso("Setor técnico habilitado com sucesso!");
            formRef.current?.reset();
            setTimeout(() => setSucesso(null), 4000);
          }
        });
      }}
      className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"
    >
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-[#003366]">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-slate-900">
            Habilitar Unidade/Setor da UERN como Setor Técnico
          </h2>
          <p className="text-xs text-slate-500">
            Selecione uma unidade oficial já cadastrada na UERN para atuar como Setor Técnico no PCA (compilação de categorias, ETP e Mapa de Riscos).
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex-1">
          <select
            name="unidadeId"
            required
            disabled={isPending || unidadesDisponiveis.length === 0}
            defaultValue=""
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-[#003366] focus:ring-1 focus:ring-[#003366] disabled:opacity-50"
          >
            <option value="" disabled>
              {unidadesDisponiveis.length === 0
                ? "Todas as unidades cadastradas já estão habilitadas como Setor Técnico"
                : "Selecione o setor da UERN para habilitar..."}
            </option>
            {unidadesDisponiveis.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nome} ({u.email})
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={isPending || unidadesDisponiveis.length === 0}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#003366] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#002244] transition disabled:opacity-60 shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>{isPending ? "Habilitando..." : "Habilitar Setor Técnico"}</span>
        </button>
      </div>

      {erro && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
          {erro}
        </p>
      )}

      {sucesso && (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
          {sucesso}
        </p>
      )}
    </form>
  );
}
