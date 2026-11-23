"use client";

import { useMemo, useState, useTransition } from "react";
import { brl } from "@/lib/formato";
import { adminEditarItemDfdAction, editarItemDfdAction } from "@/lib/actions/dfd";

export interface ItemParaEdicao {
  id: string;
  tipo: "MATERIAL" | "SERVICO";
  enquadramento: "OP" | "GERAL" | "CONVENIO" | "RECURSOS_EXTRA";
  convenioNumero: string | null;
  convenioAno: number | null;
  emendaParlamentar: boolean;
  parlamentarNome: string | null;
  recursoExtraAgencia: string | null;
  recursoExtraConta: string | null;
  categoriaId: string;
  categoriaNome: string;
  itemCatalogoNome: string | null;
  itemNomeLivre: string | null;
  quantidade: number | null;
  valorUnit: number | null;
  valorTotal: number;
  correlacao: string;
}

export interface CategoriaOpcao {
  id: string;
  nome: string;
  tipo: "MATERIAL" | "SERVICO";
  semItem: boolean;
  modoServico: "OBJETO" | "VALOR" | "ITENS";
}

export interface ItemCatalogoOpcao {
  id: string;
  categoriaId: string;
  item: string;
  valor: number;
}

export default function EditarItemModal({
  dfdId,
  item,
  categorias,
  itensCatalogo,
  unidadeElegivelOP,
  modoAdmin = false,
}: {
  dfdId: string;
  item: ItemParaEdicao;
  categorias: CategoriaOpcao[];
  itensCatalogo: ItemCatalogoOpcao[];
  unidadeElegivelOP: boolean;
  modoAdmin?: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  // Estados dos campos do formulário
  const [tipo, setTipo] = useState<"MATERIAL" | "SERVICO">(item.tipo);
  const [enquadramento, setEnquadramento] = useState<
    "OP" | "GERAL" | "CONVENIO" | "RECURSOS_EXTRA"
  >(item.enquadramento);
  const [convenioNumero, setConvenioNumero] = useState(
    item.convenioNumero ?? "",
  );
  const [convenioAno, setConvenioAno] = useState(
    item.convenioAno ? String(item.convenioAno) : "",
  );
  const [emenda, setEmenda] = useState(item.emendaParlamentar ?? false);
  const [parlamentarNome, setParlamentarNome] = useState(
    item.parlamentarNome ?? "",
  );
  const [recursoExtraAgencia, setRecursoExtraAgencia] = useState(
    item.recursoExtraAgencia ?? "",
  );
  const [recursoExtraConta, setRecursoExtraConta] = useState(
    item.recursoExtraConta ?? "",
  );

  const [categoriaId, setCategoriaId] = useState(item.categoriaId);

  // Localizar item de catálogo inicial a partir do nome
  const itemInicialId = useMemo(() => {
    if (item.itemCatalogoNome) {
      const match = itensCatalogo.find(
        (it) =>
          it.categoriaId === item.categoriaId &&
          it.item.trim().toLowerCase() ===
            item.itemCatalogoNome?.trim().toLowerCase(),
      );
      if (match) return match.id;
    }
    return "";
  }, [item, itensCatalogo]);

  const [itemCatalogoId, setItemCatalogoId] = useState(itemInicialId);
  const [itemNomeLivre, setItemNomeLivre] = useState(
    item.itemNomeLivre ?? item.itemCatalogoNome ?? "",
  );
  const [quantidade, setQuantidade] = useState(
    item.quantidade != null ? String(item.quantidade) : "1",
  );
  const [valorLivre, setValorLivre] = useState(
    item.valorTotal != null ? String(item.valorTotal) : "",
  );
  const [correlacao, setCorrelacao] = useState(item.correlacao ?? "");

  const categoriasDoTipo = useMemo(
    () => categorias.filter((c) => c.tipo === tipo),
    [categorias, tipo],
  );

  const categoriaSelecionada =
    categorias.find((c) => c.id === categoriaId) ?? null;

  const usaCatalogo =
    categoriaSelecionada &&
    ((tipo === "MATERIAL" && !categoriaSelecionada.semItem) ||
      (tipo === "SERVICO" && categoriaSelecionada.modoServico === "ITENS"));

  const itensDaCategoria = useMemo(
    () => itensCatalogo.filter((it) => it.categoriaId === categoriaId),
    [itensCatalogo, categoriaId],
  );

  const itemCatalogoSelecionado = useMemo(
    () => itensDaCategoria.find((it) => it.id === itemCatalogoId) ?? null,
    [itensDaCategoria, itemCatalogoId],
  );

  // Valor total calculado para exibição em tempo real
  const valorTotalCalculado = useMemo(() => {
    if (usaCatalogo && itemCatalogoSelecionado) {
      const q = Math.max(1, Number(quantidade) || 1);
      return itemCatalogoSelecionado.valor * q;
    }
    return Number(valorLivre) || 0;
  }, [usaCatalogo, itemCatalogoSelecionado, quantidade, valorLivre]);

  const abrirModal = () => {
    setTipo(item.tipo);
    setEnquadramento(item.enquadramento);
    setConvenioNumero(item.convenioNumero ?? "");
    setConvenioAno(item.convenioAno ? String(item.convenioAno) : "");
    setEmenda(item.emendaParlamentar ?? false);
    setParlamentarNome(item.parlamentarNome ?? "");
    setRecursoExtraAgencia(item.recursoExtraAgencia ?? "");
    setRecursoExtraConta(item.recursoExtraConta ?? "");
    setCategoriaId(item.categoriaId);
    setItemCatalogoId(itemInicialId);
    setItemNomeLivre(item.itemNomeLivre ?? item.itemCatalogoNome ?? "");
    setQuantidade(item.quantidade != null ? String(item.quantidade) : "1");
    setValorLivre(item.valorTotal != null ? String(item.valorTotal) : "");
    setCorrelacao(item.correlacao ?? "");
    setErro(null);
    setAberto(true);
  };

  const fecharModal = () => {
    setAberto(false);
    setErro(null);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErro(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const action = modoAdmin ? adminEditarItemDfdAction : editarItemDfdAction;
      const resultado = await action(dfdId, item.id, formData);
      if (resultado?.erro) {
        setErro(resultado.erro);
        return;
      }
      fecharModal();
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={abrirModal}
        className="text-xs font-medium text-emerald-700 hover:text-emerald-900 hover:underline"
      >
        Editar
      </button>

      {aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-semibold text-slate-900">
                Editar Item do DFD
              </h2>
              <button
                type="button"
                onClick={fecharModal}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {erro && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  {erro}
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Natureza
                  </label>
                  <select
                    name="tipo"
                    value={tipo}
                    onChange={(e) => {
                      const novoTipo = e.target.value as "MATERIAL" | "SERVICO";
                      setTipo(novoTipo);
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
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Enquadramento
                  </label>
                  <select
                    name="enquadramento"
                    value={enquadramento}
                    onChange={(e) =>
                      setEnquadramento(e.target.value as typeof enquadramento)
                    }
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  >
                    {unidadeElegivelOP && <option value="OP">OP</option>}
                    <option value="GERAL">Geral</option>
                    <option value="CONVENIO">Convênio</option>
                    <option value="RECURSOS_EXTRA">
                      Recursos arrecadados pela Unidade (Recursos Extra)
                    </option>
                  </select>
                </div>
              </div>

              {enquadramento === "CONVENIO" && (
                <div className="space-y-2 rounded-xl bg-slate-50 p-3 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block font-medium text-slate-700">
                        Número do convênio
                      </label>
                      <input
                        name="convenioNumero"
                        required
                        value={convenioNumero}
                        onChange={(e) => setConvenioNumero(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block font-medium text-slate-700">
                        Ano
                      </label>
                      <input
                        name="convenioAno"
                        type="number"
                        required
                        value={convenioAno}
                        onChange={(e) => setConvenioAno(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 font-medium text-slate-700">
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
                      value={parlamentarNome}
                      onChange={(e) => setParlamentarNome(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                  )}
                </div>
              )}

              {enquadramento === "RECURSOS_EXTRA" && (
                <div className="space-y-2 rounded-xl bg-slate-50 p-3 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block font-medium text-slate-700">
                        Agência
                      </label>
                      <input
                        name="recursoExtraAgencia"
                        required
                        value={recursoExtraAgencia}
                        onChange={(e) => setRecursoExtraAgencia(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block font-medium text-slate-700">
                        Conta bancária
                      </label>
                      <input
                        name="recursoExtraConta"
                        required
                        value={recursoExtraConta}
                        onChange={(e) => setRecursoExtraConta(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Categoria
                </label>
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
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Item do Catálogo
                    </label>
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
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Quantidade
                    </label>
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
                  {itemCatalogoSelecionado && (
                    <div className="col-span-1 sm:col-span-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 flex justify-between">
                      <span>Valor Unitário: {brl(itemCatalogoSelecionado.valor)}</span>
                      <span className="font-semibold text-slate-900">
                        Valor Total: {brl(valorTotalCalculado)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {categoriaSelecionada && !usaCatalogo && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      {tipo === "MATERIAL"
                        ? "Descrição do item"
                        : "Objeto resumido"}
                    </label>
                    <input
                      name="itemNomeLivre"
                      required
                      value={itemNomeLivre}
                      onChange={(e) => setItemNomeLivre(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Quantidade
                    </label>
                    <input
                      name="quantidade"
                      type="number"
                      min={1}
                      value={quantidade}
                      onChange={(e) => setQuantidade(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Valor {tipo === "SERVICO" ? "anual estimado" : "pretendido"} (R$)
                    </label>
                    <input
                      name="valorLivre"
                      type="number"
                      min={0}
                      step="0.01"
                      required
                      value={valorLivre}
                      onChange={(e) => setValorLivre(e.target.value)}
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
                  rows={4}
                  value={correlacao}
                  onChange={(e) => setCorrelacao(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={fecharModal}
                  disabled={isPending}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {isPending ? "Salvando..." : "Salvar alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
