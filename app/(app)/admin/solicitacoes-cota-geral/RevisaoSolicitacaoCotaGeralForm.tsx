"use client";

import { useState, useTransition } from "react";
import {
  aceitarSolicitacaoAutorizacaoCotaGeralAction,
  rejeitarSolicitacaoAutorizacaoCotaGeralAction,
} from "@/lib/actions/dfd";
import { brl } from "@/lib/formato";

interface SolicitacaoParaRevisao {
  id: string;
  categoriaNome: string;
  itemNome: string;
  quantidade: number | null;
  valorTotal: number;
  correlacao: string;
  justificativa: string;
  createdAt: string;
}

export default function RevisaoSolicitacaoCotaGeralForm({
  solicitacao,
  unidade,
  dfdDescricao,
}: {
  solicitacao: SolicitacaoParaRevisao;
  unidade: { nome: string } | null;
  dfdDescricao: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  return (
    <div className="rounded-md border border-slate-200 p-3 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-slate-900">{solicitacao.itemNome}</p>
          <p className="text-xs text-slate-500">
            Categoria: {solicitacao.categoriaNome}
          </p>
          <p className="text-xs text-slate-500">
            Solicitado por: {unidade?.nome ?? "Unidade removida"} em{" "}
            {new Date(solicitacao.createdAt).toLocaleString("pt-BR")}
          </p>
          {dfdDescricao && (
            <p className="text-xs text-slate-500">DFD: {dfdDescricao}</p>
          )}
          {solicitacao.quantidade != null && (
            <p className="text-xs text-slate-500">
              Quantidade: {solicitacao.quantidade}
            </p>
          )}
          <p className="mt-1 text-xs text-slate-600">
            Correlação: {solicitacao.correlacao}
          </p>
          <p className="mt-1 text-xs font-medium text-slate-700">
            Justificativa:{" "}
            <span className="font-normal text-slate-600">
              {solicitacao.justificativa}
            </span>
          </p>
        </div>
        <p className="whitespace-nowrap font-semibold text-slate-900">
          {brl(solicitacao.valorTotal)}
        </p>
      </div>

      {erro && <p className="mt-2 text-xs text-red-600">{erro}</p>}

      <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            setErro(null);
            startTransition(async () => {
              const resultado =
                await aceitarSolicitacaoAutorizacaoCotaGeralAction(
                  solicitacao.id,
                );
              if (resultado.erro) setErro(resultado.erro);
            });
          }}
          className="rounded-lg bg-[#003366] px-2 py-1 text-xs text-white hover:bg-[#002244] disabled:opacity-60"
        >
          {isPending ? "Processando..." : "Aceitar e Incluir no DFD"}
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
              const resultado =
                await rejeitarSolicitacaoAutorizacaoCotaGeralAction(
                  solicitacao.id,
                  formData,
                );
              if (resultado.erro) setErro(resultado.erro);
            });
          }}
          className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-700 disabled:opacity-60"
        >
          Rejeitar Solicitação
        </button>
      </div>
    </div>
  );
}
