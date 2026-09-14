"use client";

import { useState, useTransition } from "react";
import { CalendarRange, CheckCircle2, ArrowRight } from "lucide-react";
import { selecionarPcaAtuacaoAction } from "@/lib/actions/pca-contexto";

interface Opcao {
  ano: number;
  janela: string;
  abertoParaLancamento: boolean;
}

export default function SelecionarPcaForm({ opcoes }: { opcoes: Opcao[] }) {
  const [isPending, startTransition] = useTransition();
  const [selecionando, setSelecionando] = useState<number | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  function escolher(ano: number) {
    setErro(null);
    setSelecionando(ano);
    startTransition(async () => {
      try {
        await selecionarPcaAtuacaoAction(ano);
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro inesperado.");
        setSelecionando(null);
      }
    });
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-[#002244] to-[#003366] p-4 md:p-8">
      <div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-[#003366] shadow-inner">
            <CalendarRange className="h-7 w-7 text-[#0055A5]" />
          </div>
          <h1 className="text-xl font-bold text-slate-800">Selecione o PCA</h1>
          <p className="mt-1 text-sm text-slate-500">
            Há mais de um Plano de Contratações Anual em aberto. Escolha em qual você vai atuar
            agora — para lançar novas demandas ou para acompanhar as já lançadas.
          </p>
        </div>

        <div className="space-y-3">
          {opcoes.map((opcao) => (
            <button
              key={opcao.ano}
              type="button"
              disabled={isPending}
              onClick={() => escolher(opcao.ano)}
              className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-left transition-all hover:border-blue-600 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <div>
                <p className="text-base font-bold text-slate-800">PCA {opcao.ano}</p>
                <p className="text-xs text-slate-500">Janela: {opcao.janela}</p>
                <p className={`mt-1 text-xs font-medium ${opcao.abertoParaLancamento ? "text-emerald-600" : "text-slate-400"}`}>
                  {opcao.abertoParaLancamento
                    ? "Aberto para lançamento de novas demandas"
                    : "Fechado para novas demandas — só acompanhamento"}
                </p>
              </div>
              {selecionando === opcao.ano ? (
                <div className="h-5 w-5 flex-shrink-0 animate-spin rounded-full border-2 border-slate-300 border-t-[#003366]" />
              ) : (
                <ArrowRight className="h-5 w-5 flex-shrink-0 text-slate-400" />
              )}
            </button>
          ))}
        </div>

        {erro && (
          <div className="mt-4 flex items-start space-x-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <span>{erro}</span>
          </div>
        )}

        <p className="mt-6 flex items-center justify-center gap-1.5 border-t border-slate-100 pt-6 text-center text-xs text-slate-400">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Você pode trocar de PCA a qualquer momento pelo menu no topo da tela.
        </p>
      </div>
    </div>
  );
}
