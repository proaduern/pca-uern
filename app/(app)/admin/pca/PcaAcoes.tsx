"use client";

import { useState, useTransition } from "react";
import {
  ativarPcaAction,
  criarOuAtualizarPcaAction,
  desativarPcaAction,
  toggleAberturaExtraAction,
  toggleConcluidoAction,
} from "@/lib/actions/admin";
import {
  publicarPcaEEncaminharParaEtpAction,
  publicarPcaViaApiPncpAction,
} from "@/lib/actions/minutas-juridico";

interface PcaResumo {
  ano: number;
  ativo: boolean;
  aberturaExtraGeral: boolean;
  concluido: boolean;
  cotaGeral?: number;
  cotaOP?: number;
  dataAberturaIso?: string;
  dataFechamentoIso?: string;
}

export default function PcaAcoes({ pca }: { pca: PcaResumo }) {
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [codigoPncp, setCodigoPncp] = useState(`PCA-${pca.ano}-PNCP-UERN`);
  const [editandoPca, setEditandoPca] = useState(false);

  function executar(fn: () => Promise<unknown>, msgSucesso?: string, aoConcluir?: () => void) {
    setErro(null);
    setSucesso(null);
    startTransition(async () => {
      try {
        const res = (await fn()) as { erro?: string } | undefined;
        if (res && typeof res === "object" && "erro" in res && res.erro) {
          setErro(res.erro);
          return;
        }
        if (msgSucesso) setSucesso(msgSucesso);
        if (aoConcluir) aoConcluir();
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro inesperado.");
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 text-xs">
        {!pca.ativo ? (
          <button
            disabled={isPending}
            onClick={() => executar(() => ativarPcaAction(pca.ano))}
            className="rounded-lg bg-[#003366] px-2.5 py-1.5 font-medium text-white hover:bg-[#002244] disabled:opacity-60"
          >
            Ativar este PCA
          </button>
        ) : (
          <button
            disabled={isPending}
            onClick={() => executar(() => desativarPcaAction(pca.ano))}
            className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-slate-700 hover:bg-slate-100 disabled:opacity-60"
          >
            Desativar (tira da lista de seleção)
          </button>
        )}
        <button
          type="button"
          onClick={() => setEditandoPca((v) => !v)}
          className="rounded-lg border border-[#003366]/30 bg-slate-50 px-2.5 py-1.5 font-medium text-[#003366] hover:bg-slate-100"
        >
          {editandoPca ? "Fechar edição" : "Editar Cotas / Datas deste PCA"}
        </button>
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            defaultChecked={pca.aberturaExtraGeral}
            disabled={isPending}
            onChange={(e) => executar(() => toggleAberturaExtraAction(pca.ano, e.target.checked))}
          />
          Abertura extra geral (ignora janela de datas para todas as unidades)
        </label>
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            defaultChecked={pca.concluido}
            disabled={isPending}
            onChange={(e) => executar(() => toggleConcluidoAction(pca.ano, e.target.checked))}
          />
          Concluído (bloqueia novos lançamentos)
        </label>
      </div>

      {editandoPca && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            executar(
              () => criarOuAtualizarPcaAction(fd),
              `Parâmetros do PCA ${pca.ano} atualizados com sucesso!`,
              () => setEditandoPca(false),
            );
          }}
          className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs sm:grid-cols-5"
        >
          <input type="hidden" name="ano" value={pca.ano} />
          <div>
            <label className="mb-1 block font-medium text-slate-700">Cota Geral (R$)</label>
            <input
              name="cotaGeral"
              type="number"
              step="0.01"
              required
              defaultValue={pca.cotaGeral ?? 0}
              className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs"
            />
          </div>
          <div>
            <label className="mb-1 block font-medium text-slate-700">Cota OP (R$)</label>
            <input
              name="cotaOP"
              type="number"
              step="0.01"
              required
              defaultValue={pca.cotaOP ?? 0}
              className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs"
            />
          </div>
          <div>
            <label className="mb-1 block font-medium text-slate-700">Data de abertura</label>
            <input
              name="dataAbertura"
              type="date"
              required
              defaultValue={pca.dataAberturaIso ?? ""}
              className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs"
            />
          </div>
          <div>
            <label className="mb-1 block font-medium text-slate-700">Data de fechamento</label>
            <input
              name="dataFechamento"
              type="date"
              required
              defaultValue={pca.dataFechamentoIso ?? ""}
              className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs"
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-[#003366] px-3 py-1.5 font-semibold text-white hover:bg-[#002244] disabled:opacity-60"
            >
              {isPending ? "Salvando..." : "Salvar alterações"}
            </button>
            <button
              type="button"
              onClick={() => setEditandoPca(false)}
              className="text-xs text-slate-500 underline"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Painel de Publicação no PNCP (Manual ou API) e Encaminhamento Automático ao Subsistema de ETP e Mapa de Riscos */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          executar(
            () => publicarPcaEEncaminharParaEtpAction(fd),
            "Publicação manual registrada e demandas encaminhadas automaticamente para o Subsistema de ETP e Mapa de Riscos (Setores Técnicos)!",
          );
        }}
        className="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-indigo-200 bg-indigo-50/70 p-3 text-xs"
      >
        <input type="hidden" name="ano" value={pca.ano} />
        <div className="flex-1 min-w-[16rem]">
          <p className="font-semibold text-indigo-950">
            Publicação do PCA no PNCP &amp; Disparo Automático para o Subsistema de ETP e Mapa de Riscos
          </p>
          <p className="mt-0.5 text-[11px] text-indigo-800">
            Agrupa automaticamente os DFDs aprovados (por categoria ou por objeto conforme configuração) e encaminha
            as listas de itens para o Setor Técnico competente (STI, Patrimônio, SOBE, DAS, Almoxarifado, Transportes, Comitês).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            name="codigoPcaPadrao"
            value={codigoPncp}
            onChange={(e) => setCodigoPncp(e.target.value)}
            placeholder="Código de Publicação PNCP (Manual)"
            className="rounded-lg border border-indigo-300 bg-white px-2.5 py-1.5 text-xs text-slate-800"
          />
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {isPending ? "Processando..." : "Registrar Publicação Manual & Encaminhar ao ETP/Riscos"}
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              executar(
                () => publicarPcaViaApiPncpAction(pca.ano),
                "PCA publicado diretamente via API do PNCP e encaminhado ao ETP/Riscos!",
              )
            }
            title="Requer credenciais de integrador do PNCP configuradas pela STI/UERN"
            className="rounded-lg border border-amber-400 bg-amber-50 px-3 py-1.5 font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-60"
          >
            Publicar PCA no PNCP (API Direta)
          </button>
        </div>
      </form>

      {erro && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
          ⚠️ {erro}
        </div>
      )}
      {sucesso && <p className="text-xs font-medium text-emerald-700">{sucesso}</p>}
    </div>
  );
}
