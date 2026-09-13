"use client";

import { useMemo, useState, useTransition } from "react";
import { brl } from "@/lib/formato";
import { enviarSolicitacaoTrocaOPAction } from "@/lib/actions/estoque";

type StatusTrocaOP =
  | "PENDENTE_PROAD_INICIAL"
  | "REJEITADO_INICIAL"
  | "PENDENTE_PATRIMONIO"
  | "SEM_ESTOQUE"
  | "PENDENTE_PROAD_FINAL"
  | "REJEITADO_FINAL"
  | "APROVADO";

const STATUS_MSG: Partial<Record<StatusTrocaOP, string>> = {
  PENDENTE_PROAD_INICIAL: "Sua solicitação de troca está aguardando triagem da PROAD.",
  PENDENTE_PATRIMONIO: "A PROAD encaminhou sua solicitação à Unidade de Patrimônio para verificar disponibilidade em estoque.",
  SEM_ESTOQUE: "A Unidade de Patrimônio não possui o item solicitado em estoque no momento.",
  PENDENTE_PROAD_FINAL: "O Patrimônio confirmou disponibilidade — aguardando autorização final da PROAD.",
};

interface ItemCatalogoOpcao {
  id: string;
  item: string;
  categoriaNome: string;
  valor: number;
}

export default function TrocaOPPainel({
  itemDfdId,
  itemNome,
  valorAtual,
  trocaOP,
  categorias,
  itensCatalogo,
}: {
  itemDfdId: string;
  itemNome: string;
  valorAtual: number;
  trocaOP: { status: StatusTrocaOP; itemBNome: string; motivo: string | null } | null;
  categorias: { id: string; nome: string }[];
  itensCatalogo: ItemCatalogoOpcao[];
}) {
  const [aberto, setAberto] = useState(false);
  const [foraCatalogo, setForaCatalogo] = useState(false);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState("");
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  const categoriasComCatalogo = useMemo(
    () => [...new Set(itensCatalogo.map((it) => it.categoriaNome))].sort((a, b) => a.localeCompare(b)),
    [itensCatalogo],
  );
  const itensDaCategoria = itensCatalogo.filter((it) => it.categoriaNome === categoriaSelecionada);

  if (trocaOP?.status === "APROVADO") return null;

  if (trocaOP) {
    return (
      <div className="mt-2 rounded-md bg-slate-100 px-3 py-2 text-xs text-slate-700">
        {trocaOP.status === "REJEITADO_INICIAL" || trocaOP.status === "REJEITADO_FINAL"
          ? `Sua solicitação de troca por "${trocaOP.itemBNome}" foi rejeitada${trocaOP.motivo ? `. Motivo: ${trocaOP.motivo}` : "."}`
          : `${STATUS_MSG[trocaOP.status] ?? ""} (por "${trocaOP.itemBNome}")`}
      </div>
    );
  }

  if (!aberto) {
    return (
      <div className="mt-2">
        <button onClick={() => setAberto(true)} className="text-xs text-slate-600 underline">
          Solicitar Troca de Item (OP)
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setErro(null);
        const formData = new FormData(e.currentTarget);
        if (foraCatalogo) formData.set("foraCatalogo", "on");
        startTransition(async () => {
          try {
            await enviarSolicitacaoTrocaOPAction(itemDfdId, formData);
            setAberto(false);
          } catch (err) {
            setErro(err instanceof Error ? err.message : "Erro inesperado.");
          }
        });
      }}
      className="mt-2 space-y-2 rounded-md border border-slate-200 p-3"
    >
      <p className="text-xs text-slate-600">
        Item atual: <b>{itemNome}</b> — {brl(valorAtual)}
      </p>
      <p className="text-xs text-slate-500">
        A solicitação passa pela análise da PROAD, verificação de disponibilidade em estoque pelo Patrimônio,
        e autorização final da PROAD.
      </p>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id={`troca-fora-catalogo-${itemDfdId}`}
          checked={foraCatalogo}
          onChange={(e) => setForaCatalogo(e.target.checked)}
          className="h-4 w-4"
        />
        <label htmlFor={`troca-fora-catalogo-${itemDfdId}`} className="text-xs text-slate-700">
          O item que preciso não está no catálogo padronizado
        </label>
      </div>

      {foraCatalogo ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Nome do item desejado</label>
            <input name="nomeCustom" required className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Valor estimado (R$)</label>
            <input name="valorCustom" type="number" min={0} step="0.01" required className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Categoria</label>
            <select name="categoriaCustomId" required className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs">
              <option value="">Selecione…</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Tipo de bem</label>
            <select name="tipoBemCustom" defaultValue="PERMANENTE" className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs">
              <option value="PERMANENTE">Permanente</option>
              <option value="CONSUMO">Consumo</option>
            </select>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Categoria desejada</label>
            <select
              value={categoriaSelecionada}
              onChange={(e) => setCategoriaSelecionada(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
            >
              <option value="">Selecione…</option>
              {categoriasComCatalogo.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Item desejado</label>
            <select name="itemCatalogoId" required className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs">
              <option value="">Selecione a categoria primeiro…</option>
              {itensDaCategoria.map((it) => (
                <option key={it.id} value={it.id}>
                  {it.item} — {brl(it.valor)}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-700">Justificativa da troca</label>
        <textarea name="justificativa" required placeholder="Explique por que precisa trocar este item" className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs" />
      </div>

      {erro && <p className="rounded-md bg-red-50 px-2 py-1.5 text-xs text-red-700">{erro}</p>}

      <div className="flex gap-2">
        <button type="submit" disabled={isPending} className="rounded-md bg-amber-500 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60">
          Enviar Solicitação à PROAD
        </button>
        <button type="button" onClick={() => setAberto(false)} className="rounded-md border border-slate-300 px-3 py-1.5 text-xs hover:bg-slate-100">
          Cancelar
        </button>
      </div>
    </form>
  );
}
