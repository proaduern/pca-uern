"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { adicionarItemDfdAction } from "@/lib/actions/dfd";
import { brl } from "@/lib/formato";
import type { Categoria, ItemCatalogo } from "@prisma/client";

type ItemCatalogoComCategoria = ItemCatalogo & { categoria: Categoria };

export default function ItemForm({
  dfdId,
  categorias,
  itensCatalogo,
  unidadeElegivelOP,
}: {
  dfdId: string;
  categorias: Categoria[];
  itensCatalogo: ItemCatalogoComCategoria[];
  unidadeElegivelOP: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const [tipo, setTipo] = useState<"MATERIAL" | "SERVICO">("MATERIAL");
  const [enquadramento, setEnquadramento] = useState<"OP" | "GERAL" | "CONVENIO">("GERAL");
  const [emenda, setEmenda] = useState(false);
  const [categoriaId, setCategoriaId] = useState("");
  const [itemCatalogoId, setItemCatalogoId] = useState("");
  const [quantidade, setQuantidade] = useState("1");

  const categoriasDoTipo = useMemo(
    () => categorias.filter((c) => c.tipo === tipo),
    [categorias, tipo],
  );
  const categoriaSelecionada = categorias.find((c) => c.id === categoriaId) ?? null;
  const usaCatalogo =
    categoriaSelecionada &&
    ((tipo === "MATERIAL" && !categoriaSelecionada.semItem) ||
      (tipo === "SERVICO" && categoriaSelecionada.modoServico === "ITENS"));
  const itensDaCategoria = itensCatalogo.filter((it) => it.categoriaId === categoriaId);
  const itemCatalogoSelecionado = itensDaCategoria.find((it) => it.id === itemCatalogoId);
  const valorEstimado = itemCatalogoSelecionado
    ? Number(itemCatalogoSelecionado.valor) * (Number(quantidade) || 1)
    : null;

  return (
    <form
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault();
        setErro(null);
        const formData = new FormData(e.currentTarget);
        startTransition(async () => {
          try {
            await adicionarItemDfdAction(dfdId, formData);
            formRef.current?.reset();
            setCategoriaId("");
            setItemCatalogoId("");
            setQuantidade("1");
          } catch (err) {
            setErro(err instanceof Error ? err.message : "Erro inesperado.");
          }
        });
      }}
      className="space-y-3 border-t border-slate-100 pt-4"
    >
      <h3 className="text-sm font-semibold text-slate-900">Adicionar item</h3>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Natureza</label>
          <select
            name="tipo"
            value={tipo}
            onChange={(e) => {
              setTipo(e.target.value as "MATERIAL" | "SERVICO");
              setCategoriaId("");
              setItemCatalogoId("");
            }}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="MATERIAL">Material</option>
            <option value="SERVICO">Serviço</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Enquadramento</label>
          <select
            name="enquadramento"
            value={enquadramento}
            onChange={(e) => setEnquadramento(e.target.value as typeof enquadramento)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            {unidadeElegivelOP && <option value="OP">OP</option>}
            <option value="GERAL">Geral</option>
            <option value="CONVENIO">Convênio</option>
          </select>
        </div>
      </div>

      {enquadramento === "CONVENIO" && (
        <div className="space-y-2 rounded-md bg-slate-50 p-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Número do convênio
              </label>
              <input
                name="convenioNumero"
                required
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Ano do convênio
              </label>
              <input
                name="convenioAno"
                type="number"
                required
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-700">
            <input
              type="checkbox"
              name="emendaParlamentar"
              checked={emenda}
              onChange={(e) => setEmenda(e.target.checked)}
            />
            É oriundo de emenda parlamentar
          </label>
          {emenda && (
            <input
              name="parlamentarNome"
              required
              placeholder="Nome do(a) parlamentar"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          )}
        </div>
      )}

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-700">Categoria</label>
        <select
          name="categoriaId"
          required
          value={categoriaId}
          onChange={(e) => {
            setCategoriaId(e.target.value);
            setItemCatalogoId("");
          }}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Selecione a categoria...</option>
          {categoriasDoTipo.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
              {c.semItem ? " (sem item — só valor)" : ""}
            </option>
          ))}
        </select>
      </div>

      {categoriaSelecionada && usaCatalogo && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Item</label>
            <select
              name="itemCatalogoId"
              required
              value={itemCatalogoId}
              onChange={(e) => setItemCatalogoId(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Selecione o item...</option>
              {itensDaCategoria.map((it) => (
                <option key={it.id} value={it.id}>
                  {it.item} — {brl(it.valor)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Quantidade</label>
            <input
              name="quantidade"
              type="number"
              min={1}
              required
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          {valorEstimado != null && (
            <p className="col-span-2 text-xs text-slate-500">
              Valor estimado do item: {brl(valorEstimado)}
            </p>
          )}
        </div>
      )}

      {categoriaSelecionada && !usaCatalogo && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              {tipo === "MATERIAL" ? "Descrição do item" : "Objeto resumido"}
            </label>
            <input
              name="itemNomeLivre"
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Valor {tipo === "SERVICO" ? "anual estimado" : "pretendido"} (R$)
            </label>
            <input
              name="valorLivre"
              type="number"
              min={0}
              step="0.01"
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
      )}

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-700">
          Correlação da quantidade/valor com a necessidade relatada
        </label>
        <textarea
          name="correlacao"
          required
          rows={2}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      {erro && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100 disabled:opacity-60"
      >
        {isPending ? "Adicionando..." : "Adicionar item ao DFD"}
      </button>
    </form>
  );
}
