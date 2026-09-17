"use client";

import { useState, useTransition } from "react";
import {
  FASE_RISCO_LABEL,
  IMPACTO_RISCO_LABEL,
  NIVEL_ACEITACAO_RISCO_LABEL,
  PROBABILIDADE_RISCO_LABEL,
  type DadosRiscoItem,
} from "@/lib/etp-riscos";
import { finalizarRiscosAction, salvarRiscosRascunhoAction } from "@/lib/actions/etp-riscos";

const RISCO_VAZIO: DadosRiscoItem = {
  fase: "PLANEJAMENTO",
  descricao: "",
  danos: "",
  probabilidade: "BAIXA",
  impacto: "ALTO",
  nivelAceitacao: "ACEITACAO_INTERMEDIARIA",
  acoesPreventivas: "",
  acoesContingenciais: "",
  responsavel: "",
};

export default function RiscosForm({
  analiseRiscosId,
  status,
  responsavelNome: responsavelNomeInicial,
  responsavelMatricula: responsavelMatriculaInicial,
  itensIniciais,
  pdfHref,
}: {
  analiseRiscosId: string;
  status: "RASCUNHO" | "FINALIZADO";
  responsavelNome: string | null;
  responsavelMatricula: string | null;
  itensIniciais: DadosRiscoItem[];
  pdfHref: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [itens, setItens] = useState<DadosRiscoItem[]>(itensIniciais);
  const [responsavelNome, setResponsavelNome] = useState(responsavelNomeInicial ?? "");
  const [responsavelMatricula, setResponsavelMatricula] = useState(responsavelMatriculaInicial ?? "");
  const finalizado = status === "FINALIZADO";

  function atualizarItem(indice: number, campo: keyof DadosRiscoItem, valor: string) {
    setItens((atual) => atual.map((it, i) => (i === indice ? { ...it, [campo]: valor } : it)));
  }

  function executar(finalizar: boolean) {
    setErro(null);
    setMensagem(null);
    const formData = new FormData();
    formData.set("itensJson", JSON.stringify(itens));
    formData.set("responsavelNome", responsavelNome);
    formData.set("responsavelMatricula", responsavelMatricula);
    startTransition(async () => {
      const resultado = finalizar
        ? await finalizarRiscosAction(analiseRiscosId, formData)
        : await salvarRiscosRascunhoAction(analiseRiscosId, formData);
      if (resultado.erro) {
        setErro(resultado.erro);
        return;
      }
      setMensagem(finalizar ? "Análise de Riscos finalizada com sucesso." : "Rascunho salvo.");
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Riscos identificados ({itens.length})</h2>
          <span
            className={`rounded-full px-2 py-1 text-xs ${finalizado ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}`}
          >
            {finalizado ? "Finalizado" : "Rascunho"}
          </span>
        </div>

        <div className="space-y-3">
          {itens.map((it, i) => (
            <div key={i} className="space-y-2 rounded-md border border-slate-200 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Risco nº {i + 1}</span>
                {!finalizado && (
                  <button
                    type="button"
                    onClick={() => setItens((atual) => atual.filter((_, j) => j !== i))}
                    className="text-xs text-red-600 underline"
                  >
                    Remover
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">Fase</label>
                  <select
                    value={it.fase}
                    disabled={finalizado}
                    onChange={(e) => atualizarItem(i, "fase", e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-2 py-1 text-sm disabled:bg-slate-50"
                  >
                    {Object.entries(FASE_RISCO_LABEL).map(([valor, rotulo]) => (
                      <option key={valor} value={valor}>
                        {rotulo}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">Probabilidade de ocorrência</label>
                  <select
                    value={it.probabilidade}
                    disabled={finalizado}
                    onChange={(e) => atualizarItem(i, "probabilidade", e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-2 py-1 text-sm disabled:bg-slate-50"
                  >
                    {Object.entries(PROBABILIDADE_RISCO_LABEL).map(([valor, rotulo]) => (
                      <option key={valor} value={valor}>
                        {rotulo}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">Grau de impacto</label>
                  <select
                    value={it.impacto}
                    disabled={finalizado}
                    onChange={(e) => atualizarItem(i, "impacto", e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-2 py-1 text-sm disabled:bg-slate-50"
                  >
                    {Object.entries(IMPACTO_RISCO_LABEL).map(([valor, rotulo]) => (
                      <option key={valor} value={valor}>
                        {rotulo}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Descrição do risco</label>
                <textarea
                  value={it.descricao}
                  disabled={finalizado}
                  onChange={(e) => atualizarItem(i, "descricao", e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-slate-300 px-2 py-1 text-sm disabled:bg-slate-50"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Danos</label>
                <textarea
                  value={it.danos}
                  disabled={finalizado}
                  onChange={(e) => atualizarItem(i, "danos", e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-slate-300 px-2 py-1 text-sm disabled:bg-slate-50"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Nível de aceitação</label>
                <select
                  value={it.nivelAceitacao}
                  disabled={finalizado}
                  onChange={(e) => atualizarItem(i, "nivelAceitacao", e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-2 py-1 text-sm disabled:bg-slate-50 sm:w-1/3"
                >
                  {Object.entries(NIVEL_ACEITACAO_RISCO_LABEL).map(([valor, rotulo]) => (
                    <option key={valor} value={valor}>
                      {rotulo}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Ações preventivas</label>
                <textarea
                  value={it.acoesPreventivas}
                  disabled={finalizado}
                  onChange={(e) => atualizarItem(i, "acoesPreventivas", e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-slate-300 px-2 py-1 text-sm disabled:bg-slate-50"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Ações contingenciais</label>
                <textarea
                  value={it.acoesContingenciais}
                  disabled={finalizado}
                  onChange={(e) => atualizarItem(i, "acoesContingenciais", e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-slate-300 px-2 py-1 text-sm disabled:bg-slate-50"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Responsável</label>
                <input
                  value={it.responsavel}
                  disabled={finalizado}
                  onChange={(e) => atualizarItem(i, "responsavel", e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-2 py-1 text-sm disabled:bg-slate-50 sm:w-1/2"
                />
              </div>
            </div>
          ))}
        </div>

        {!finalizado && (
          <button
            type="button"
            onClick={() => setItens((atual) => [...atual, { ...RISCO_VAZIO }])}
            className="mt-3 rounded-xl border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100"
          >
            + Adicionar risco
          </button>
        )}
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Responsabilidade pela Elaboração</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Nome do responsável</label>
            <input
              value={responsavelNome}
              disabled={finalizado}
              onChange={(e) => setResponsavelNome(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Matrícula do responsável</label>
            <input
              value={responsavelMatricula}
              disabled={finalizado}
              onChange={(e) => setResponsavelMatricula(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
            />
          </div>
        </div>
      </div>

      {erro && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
      {mensagem && <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{mensagem}</p>}

      <div className="flex flex-wrap items-center gap-2">
        {!finalizado && (
          <>
            <button
              type="button"
              disabled={isPending}
              onClick={() => executar(false)}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100 disabled:opacity-60"
            >
              {isPending ? "Salvando..." : "Salvar Rascunho"}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => executar(true)}
              className="rounded-xl bg-[#003366] px-3 py-2 text-sm font-medium text-white hover:bg-[#002244] disabled:opacity-60"
            >
              {isPending ? "Finalizando..." : "Finalizar Análise de Riscos"}
            </button>
          </>
        )}
        <a href={pdfHref} className="rounded-xl border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100">
          Baixar PDF
        </a>
      </div>
    </div>
  );
}
