"use client";

import { useState, useTransition } from "react";
import { atualizarItemCatalogoAction } from "@/lib/actions/admin";

export default function EditarItemCatalogoForm({
  item,
  categorias,
}: {
  item: {
    id: string;
    categoriaId: string;
    item: string;
    valor: number;
    tipoBem: "CONSUMO" | "PERMANENTE";
  };
  categorias: { id: string; nome: string }[];
}) {
  const [aberto, setAberto] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

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
          const resultado = await atualizarItemCatalogoAction(item.id, formData);
          if (resultado.erro) {
            setErro(resultado.erro);
          } else {
            setAberto(false);
          }
        });
      }}
      className="mt-2 w-64 space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3"
    >
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-700">Categoria</label>
        <select
          name="categoriaId"
          defaultValue={item.categoriaId}
          required
          className="w-full rounded-xl border border-slate-300 px-2 py-1 text-xs"
        >
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-700">Nome do item</label>
        <input
          name="item"
          defaultValue={item.item}
          required
          className="w-full rounded-xl border border-slate-300 px-2 py-1 text-xs"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-700">Valor unitário (R$)</label>
        <input
          name="valor"
          type="number"
          min={0}
          step="0.01"
          defaultValue={item.valor}
          required
          className="w-full rounded-xl border border-slate-300 px-2 py-1 text-xs"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-700">Tipo de bem</label>
        <select
          name="tipoBem"
          defaultValue={item.tipoBem}
          className="w-full rounded-xl border border-slate-300 px-2 py-1 text-xs"
        >
          <option value="PERMANENTE">Permanente</option>
          <option value="CONSUMO">Consumo</option>
        </select>
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
