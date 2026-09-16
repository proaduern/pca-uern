"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { adicionarItemDfdAction, adminAdicionarItemDfdAction } from "@/lib/actions/dfd";
import { brl } from "@/lib/formato";
import SolicitarItemPainel from "./SolicitarItemPainel";
import type { ModoServico, TipoCategoria } from "@prisma/client";

interface CategoriaParaItem {
  id: string;
  nome: string;
  tipo: TipoCategoria;
  semItem: boolean;
  modoServico: ModoServico;
}

interface ItemCatalogoParaItem {
  id: string;
  categoriaId: string;
  item: string;
  valor: number;
}

export default function ItemForm({
  dfdId,
  categorias,
  itensCatalogo,
  unidadeElegivelOP,
  modoAdmin = false,
}: {
  dfdId: string;
  categorias: CategoriaParaItem[];
  itensCatalogo: ItemCatalogoParaItem[];
  unidadeElegivelOP: boolean;
  modoAdmin?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const [tipo, setTipo] = useState<"MATERIAL" | "SERVICO">("MATERIAL");
  const [enquadramento, setEnquadramento] = useState<
    "OP" | "GERAL" | "CONVENIO" | "RECURSOS_EXTRA"
  >("GERAL");
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
    ? itemCatalogoSelecionado.valor * (Number(quantidade) || 1)
    : null;

  return (
    <>
    <form
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault();
        setErro(null);
        const formData = new FormData(e.currentTarget);
        startTransition(async () => {
          const action = modoAdmin ? adminAdicionarItemDfdAction : adicionarItemDfdAction;
          const resultado = await action(dfdId, formData);
          if (resultado.erro) {
            setErro(resultado.erro);
            return;
          }
          formRef.current?.reset();
          setCategoriaId("");
          setItemCatalogoId("");
          setQuantidade("1");
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
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
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
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          >
            {unidadeElegivelOP && <option value="OP">OP</option>}
            <option value="GERAL">Geral</option>
            <option value="CONVENIO">Convênio</option>
            <option value="RECURSOS_EXTRA">Recursos arrecadados pela Unidade (Recursos Extra)</option>
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
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
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
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
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
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          )}
        </div>
      )}

      {enquadramento === "RECURSOS_EXTRA" && (
        <div className="space-y-2 rounded-md bg-slate-50 p-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Agência</label>
              <input
                name="recursoExtraAgencia"
                required
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Conta bancária</label>
              <input
                name="recursoExtraConta"
                required
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Conta obrigatoriamente institucional da unidade/curso (em caso de dúvidas, consultar
            Proplan), não se aplicando para contas bancárias privadas/particulares.
          </p>
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
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
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
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
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
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
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
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
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
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
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
          rows={5}
          placeholder="Pode colar aqui uma tabela copiada de uma planilha (Excel, Google Sheets etc.) — a estrutura de linhas e colunas é preservada."
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono"
        />
        <p className="mt-1 text-xs text-slate-500">
          Dica: é possível colar diretamente uma tabela copiada de uma planilha, mantendo a
          estrutura de linhas e colunas.
        </p>
      </div>

      {erro && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-xl border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100 disabled:opacity-60"
      >
        {isPending ? "Adicionando..." : "Adicionar item ao DFD"}
      </button>
    </form>
    {tipo === "MATERIAL" && !modoAdmin && <SolicitarItemPainel />}
    </>
  );
}
