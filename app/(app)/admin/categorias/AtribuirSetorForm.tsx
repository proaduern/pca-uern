"use client";

import { useTransition } from "react";
import { atribuirSetorTecnicoCategoriaAction } from "@/lib/actions/admin";

export default function AtribuirSetorForm({
  categoriaId,
  setorTecnicoId,
  setores,
}: {
  categoriaId: string;
  setorTecnicoId: string | null;
  setores: { id: string; nome: string }[];
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <select
      defaultValue={setorTecnicoId ?? ""}
      disabled={isPending}
      onChange={(e) => {
        const valor = e.target.value || null;
        startTransition(() => atribuirSetorTecnicoCategoriaAction(categoriaId, valor));
      }}
      className="rounded-md border border-slate-300 px-2 py-1 text-xs"
    >
      <option value="">Nenhum</option>
      {setores.map((s) => (
        <option key={s.id} value={s.id}>
          {s.nome}
        </option>
      ))}
    </select>
  );
}
