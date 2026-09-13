"use client";

import { useState, useTransition } from "react";
import { aceitarSolicitacaoCatalogoAction, rejeitarSolicitacaoCatalogoAction } from "@/lib/actions/solicitacoes";
import { brl } from "@/lib/formato";
import type { SolicitacaoCatalogo, Unidade } from "@prisma/client";

export default function RevisaoSolicitacaoForm({
  solicitacao,
  unidade,
  categoriasExistentes,
}: {
  solicitacao: SolicitacaoCatalogo;
  unidade: Unidade | null;
  categoriasExistentes: string[];
}) {
  const [aberto, setAberto] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [tipoBem, setTipoBem] = useState<"CONSUMO" | "PERMANENTE">(solicitacao.tipoBemSugerido);

  return (
    <div className="rounded-md border border-slate-200 p-3 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-slate-900">{solicitacao.nomeResumido}</p>
          <p className="text-xs text-slate-500">
            Solicitado por: {unidade?.nome ?? "Unidade removida"} em{" "}
            {new Date(solicitacao.createdAt).toLocaleString("pt-BR")}
          </p>
          <p className="mt-1 text-xs text-slate-600">{solicitacao.descricao}</p>
          <p className="text-xs text-slate-500">
            Marca/modelo de referência: {solicitacao.marcaModelo || "—"}
          </p>
          <p className="text-xs text-slate-500">Aplicação prática: {solicitacao.aplicacao}</p>
          <p className="text-xs text-slate-500">
            Tipo de bem sugerido: {solicitacao.tipoBemSugerido === "CONSUMO" ? "Consumo" : "Permanente"}
          </p>
          <p className="text-xs text-slate-500">
            {solicitacao.link ? (
              <a href={solicitacao.link} target="_blank" rel="noopener" className="underline">
                {solicitacao.link}
              </a>
            ) : (
              "Sem link informado"
            )}
          </p>
        </div>
        <div className="text-right">
          <p className="font-semibold text-slate-900">{brl(solicitacao.valorEstimado)}</p>
          {!aberto && (
            <button
              onClick={() => setAberto(true)}
              className="mt-2 rounded-md bg-slate-900 px-2 py-1 text-xs text-white"
            >
              Analisar
            </button>
          )}
        </div>
      </div>

      {aberto && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setErro(null);
            const formData = new FormData(e.currentTarget);
            startTransition(async () => {
              try {
                await aceitarSolicitacaoCatalogoAction(solicitacao.id, formData);
              } catch (err) {
                setErro(err instanceof Error ? err.message : "Erro inesperado.");
              }
            });
          }}
          className="mt-3 space-y-2 border-t border-slate-100 pt-3"
        >
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Categoria (no catálogo)
              </label>
              <input
                name="categoria"
                required
                list="categorias-existentes-catalogo"
                defaultValue=""
                placeholder="Selecione ou digite uma nova categoria"
                className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
              />
              <datalist id="categorias-existentes-catalogo">
                {categoriasExistentes.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Item (descrição resumida no catálogo)
              </label>
              <input
                name="item"
                required
                defaultValue={solicitacao.nomeResumido}
                className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Valor estimado (validado/ajustado)
              </label>
              <input
                name="valor"
                type="number"
                min={0}
                step="0.01"
                required
                defaultValue={Number(solicitacao.valorEstimado)}
                className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Tipo de bem (validado/ajustado)
              </label>
              <select
                name="tipoBem"
                required
                value={tipoBem}
                onChange={(e) => setTipoBem(e.target.value as typeof tipoBem)}
                className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
              >
                <option value="PERMANENTE">Permanente</option>
                <option value="CONSUMO">Consumo</option>
              </select>
            </div>
          </div>

          {erro && <p className="text-xs text-red-600">{erro}</p>}

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-slate-900 px-2 py-1 text-xs text-white disabled:opacity-60"
            >
              {isPending ? "Salvando..." : "Aceitar e Incluir no Catálogo"}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                setErro(null);
                const motivo = window.prompt(
                  "Motivo da rejeição (opcional, será visível para a unidade solicitante):",
                );
                if (motivo === null) return;
                const formData = new FormData();
                formData.set("motivo", motivo);
                startTransition(async () => {
                  try {
                    await rejeitarSolicitacaoCatalogoAction(solicitacao.id, formData);
                  } catch (err) {
                    setErro(err instanceof Error ? err.message : "Erro inesperado.");
                  }
                });
              }}
              className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-700 disabled:opacity-60"
            >
              Rejeitar Solicitação
            </button>
            <button type="button" onClick={() => setAberto(false)} className="text-xs text-slate-500">
              Fechar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
