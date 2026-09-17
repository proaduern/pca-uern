"use client";

import { useState, useTransition } from "react";
import { brl } from "@/lib/formato";
import { totalPesquisaPrecos, type DadosPesquisaPrecoItem } from "@/lib/pesquisa-precos";
import { finalizarPesquisaPrecosAction, salvarPesquisaPrecosRascunhoAction } from "@/lib/actions/pesquisa-precos";

export default function PesquisaPrecosForm({
  pesquisa,
  pdfHref,
}: {
  pesquisa: {
    id: string;
    metodologia: string;
    arquivoPdfNome: string | null;
    arquivoPdfTexto: string | null;
    status: "RASCUNHO" | "FINALIZADO";
    responsavelNome: string | null;
    responsavelMatricula: string | null;
    itens: DadosPesquisaPrecoItem[];
  };
  pdfHref: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [itens, setItens] = useState<DadosPesquisaPrecoItem[]>(pesquisa.itens);
  const [metodologia, setMetodologia] = useState(pesquisa.metodologia);
  const [responsavelNome, setResponsavelNome] = useState(pesquisa.responsavelNome ?? "");
  const [responsavelMatricula, setResponsavelMatricula] = useState(pesquisa.responsavelMatricula ?? "");
  const [mostrarTextoPdf, setMostrarTextoPdf] = useState(false);
  const finalizado = pesquisa.status === "FINALIZADO";

  function atualizarItem(indice: number, campo: "valorUnitarioPesquisado" | "fontesConsultadas", valor: string) {
    setItens((atual) =>
      atual.map((it, i) =>
        i === indice ? { ...it, [campo]: campo === "valorUnitarioPesquisado" ? Number(valor) : valor } : it,
      ),
    );
  }

  function executar(finalizar: boolean) {
    setErro(null);
    setMensagem(null);
    const formData = new FormData();
    formData.set(
      "itensJson",
      JSON.stringify(
        itens.map((it) => ({
          valorUnitarioPesquisado: it.valorUnitarioPesquisado,
          fontesConsultadas: it.fontesConsultadas,
        })),
      ),
    );
    formData.set("metodologia", metodologia);
    formData.set("responsavelNome", responsavelNome);
    formData.set("responsavelMatricula", responsavelMatricula);
    startTransition(async () => {
      const resultado = finalizar
        ? await finalizarPesquisaPrecosAction(pesquisa.id, formData)
        : await salvarPesquisaPrecosRascunhoAction(pesquisa.id, formData);
      if (resultado.erro) {
        setErro(resultado.erro);
        return;
      }
      setMensagem(finalizar ? "Pesquisa de Preços finalizada com sucesso." : "Rascunho salvo.");
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">
            PDF enviado: {pesquisa.arquivoPdfNome ?? "—"}
          </h2>
          <span
            className={`rounded-full px-2 py-1 text-xs ${finalizado ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}`}
          >
            {finalizado ? "Finalizado" : "Rascunho"}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setMostrarTextoPdf((v) => !v)}
          className="text-xs text-slate-600 underline"
        >
          {mostrarTextoPdf ? "Ocultar" : "Ver"} texto extraído do PDF (referência)
        </button>
        {mostrarTextoPdf && (
          <textarea
            readOnly
            value={pesquisa.arquivoPdfTexto ?? ""}
            rows={10}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600"
          />
        )}
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Itens Pesquisados ({itens.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="py-1 pr-2 font-medium">Item</th>
                <th className="py-1 pr-2 font-medium">Qtd.</th>
                <th className="py-1 pr-2 font-medium">Valor unit. pesquisado</th>
                <th className="py-1 pr-2 font-medium">Total</th>
                <th className="py-1 font-medium">Fontes consultadas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {itens.map((it, i) => (
                <tr key={i}>
                  <td className="py-1.5 pr-2 align-top text-slate-900">{it.item}</td>
                  <td className="py-1.5 pr-2 align-top text-slate-600">{it.quantidade}</td>
                  <td className="py-1.5 pr-2 align-top">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={it.valorUnitarioPesquisado || ""}
                      disabled={finalizado}
                      onChange={(e) => atualizarItem(i, "valorUnitarioPesquisado", e.target.value)}
                      className="w-28 rounded-xl border border-slate-300 px-2 py-1 text-sm disabled:bg-slate-50"
                    />
                  </td>
                  <td className="py-1.5 pr-2 align-top text-slate-600">
                    {brl(it.quantidade * it.valorUnitarioPesquisado)}
                  </td>
                  <td className="py-1.5 align-top">
                    <textarea
                      value={it.fontesConsultadas}
                      disabled={finalizado}
                      onChange={(e) => atualizarItem(i, "fontesConsultadas", e.target.value)}
                      rows={2}
                      placeholder="Ex.: Painel de Preços (id X), cotação com fornecedor Y, contrato Z..."
                      className="w-full min-w-[16rem] rounded-xl border border-slate-300 px-2 py-1 text-sm disabled:bg-slate-50"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200 font-semibold text-slate-900">
                <td className="py-1.5 pr-2" colSpan={3}>
                  Total estimado
                </td>
                <td className="py-1.5 pr-2">{brl(totalPesquisaPrecos(itens))}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4">
        <h2 className="mb-2 text-sm font-semibold text-slate-900">Metodologia da Pesquisa</h2>
        <textarea
          value={metodologia}
          disabled={finalizado}
          onChange={(e) => setMetodologia(e.target.value)}
          rows={4}
          placeholder="Fontes consultadas, critério de composição do preço estimado, tratamento de valores inexequíveis/excessivos etc."
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
        />
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
              {isPending ? "Finalizando..." : "Finalizar Pesquisa de Preços"}
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
