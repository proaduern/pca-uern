"use client";

import { useTransition } from "react";
import { definirExcecaoExecucaoAction } from "@/lib/actions/admin";
import { SUBPERFIL_EXECUCAO_LABEL, type SubperfilExecucao } from "@/lib/execucao";

export default function RoteamentoCategoriaSelect({
  categoriaId,
  padrao,
  efetivo,
}: {
  categoriaId: string;
  padrao: SubperfilExecucao;
  efetivo: SubperfilExecucao;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <select
      defaultValue={efetivo === padrao ? "" : efetivo}
      disabled={isPending}
      onChange={(e) => {
        startTransition(async () => {
          await definirExcecaoExecucaoAction(categoriaId, e.target.value);
        });
      }}
      className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
    >
      <option value="">Manter padrão ({SUBPERFIL_EXECUCAO_LABEL[padrao]})</option>
      {(Object.keys(SUBPERFIL_EXECUCAO_LABEL) as SubperfilExecucao[])
        .filter((s) => s !== padrao)
        .map((s) => (
          <option key={s} value={s}>
            {SUBPERFIL_EXECUCAO_LABEL[s]}
          </option>
        ))}
    </select>
  );
}
