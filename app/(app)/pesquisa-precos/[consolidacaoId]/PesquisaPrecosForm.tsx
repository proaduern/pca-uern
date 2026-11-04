"use client";

import { useState, useTransition } from "react";
import { Download, Upload, CheckCircle2, FileSpreadsheet } from "lucide-react";
import { brl } from "@/lib/formato";
import { totalPesquisaPrecos, type DadosPesquisaPrecoItem } from "@/lib/pesquisa-precos";
import {
  finalizarPesquisaPrecosAction,
  importarPlanilhaBancoPrecosAction,
  salvarPesquisaPrecosRascunhoAction,
} from "@/lib/actions/pesquisa-precos";

export default function PesquisaPrecosForm({
  consolidacaoId,
  exportXlsxHref,
  pesquisa,
  pdfHref,
}: {
  consolidacaoId: string;
  exportXlsxHref: string;
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
  const [arquivoImportadoNome, setArquivoImportadoNome] = useState<string | null>(pesquisa.arquivoPdfNome);
  const finalizado = pesquisa.status === "FINALIZADO";

  function atualizarItem(
    indice: number,
    campo: "valorUnitarioPesquisado" | "medianaPesquisada" | "fontesConsultadas",
    valor: string,
  ) {
    setItens((atual) =>
      atual.map((it, i) => {
        if (i !== indice) return it;
        if (campo === "fontesConsultadas") return { ...it, fontesConsultadas: valor };
        return { ...it, [campo]: valor === "" ? null : Number(valor) };
      }),
    );
  }

  function handleImportarBancoPrecos(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    setMensagem(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await importarPlanilhaBancoPrecosAction(pesquisa.id, formData);
      if (res.erro) {
        setErro(res.erro);
        return;
      }
      if (res.itensAtualizados) {
        setItens(res.itensAtualizados);
      }
      if (res.responsavelNome) setResponsavelNome(res.responsavelNome);
      if (res.responsavelMatricula) setResponsavelMatricula(res.responsavelMatricula);
      if (res.metodologia) setMetodologia(res.metodologia);
      const file = formData.get("arquivoXlsx");
      if (file instanceof File) setArquivoImportadoNome(file.name);
      setMensagem(res.resumoImportacao ?? "Planilha do Banco de Preços importada com sucesso!");
    });
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
          medianaPesquisada: it.medianaPesquisada,
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
      setMensagem(
        finalizar
          ? "Pesquisa de Preços concluída com sucesso! O processo foi devolvido ao Agente de Contratação."
          : "Rascunho salvo com sucesso.",
      );
    });
  }

  return (
    <div className="space-y-4">
      {/* Card de Integração com o Sistema Banco de Preços (Exportação e Importação .xlsx) */}
      <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/50 p-4 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-emerald-700" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Integração com o Sistema Banco de Preços (Exportação e Importação .xlsx)
              </h2>
              <p className="text-xs text-slate-600">
                Exporte os itens consolidados no formato oficial do Banco de Preços e importe de volta o Relatório de Cotação (.xlsx) para preencher automaticamente a Coluna E (Preço Estimado).
              </p>
            </div>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
              finalizado ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
            }`}
          >
            {finalizado ? "Pesquisa Concluída (Devolvida ao Agente)" : "Em Elaboração"}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Passo 1: Exportar Modelo para Banco de Preços */}
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 flex flex-col justify-between space-y-3">
            <div>
              <span className="inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800 mb-1">
                1º Passo — Saída do PCA para o Banco de Preços
              </span>
              <h3 className="text-xs font-semibold text-slate-900">
                Baixar Planilha no Modelo do Banco de Preços (.xlsx)
              </h3>
              <p className="mt-1 text-[11px] text-slate-500">
                Gera a planilha <b>Modelo.xlsx</b> com Nome, Descrição, Quantidade e Unidade padrão <b>&quot;Unidades&quot;</b> (mantendo Código, Cidade, UF, Observação e Lote em branco).
              </p>
            </div>
            <div>
              <a
                href={exportXlsxHref}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-800 transition"
              >
                <Download className="h-4 w-4" />
                <span>Exportar Planilha para Banco de Preços (.xlsx)</span>
              </a>
            </div>
          </div>

          {/* Passo 2: Importar Relatório de Cotação do Banco de Preços */}
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2.5">
            <div>
              <span className="inline-block rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-800 mb-1">
                2º Passo — Retorno do Banco de Preços para Consolidação no PCA
              </span>
              <h3 className="text-xs font-semibold text-slate-900">
                Importar Relatório de Cotação do Banco de Preços (.xlsx)
              </h3>
              <p className="mt-1 text-[11px] text-slate-500">
                Lê a planilha gerada pelo Banco de Preços e extrai automaticamente o <b>Preço Estimado (Coluna E)</b> para cada item correspondente abaixo.
              </p>
            </div>
            {!finalizado ? (
              <form onSubmit={handleImportarBancoPrecos} className="flex flex-wrap items-center gap-2 pt-1">
                <input
                  type="file"
                  name="arquivoXlsx"
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  required
                  className="flex-1 min-w-[14rem] rounded-xl border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700"
                />
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#003366] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#002244] disabled:opacity-60 transition"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>{isPending ? "Importando..." : "Importar Cotação (.xlsx)"}</span>
                </button>
              </form>
            ) : (
              <p className="text-xs text-emerald-700 font-medium">
                Pesquisa já concluída. Arquivo de referência: {arquivoImportadoNome ?? "—"}
              </p>
            )}
          </div>
        </div>

        {arquivoImportadoNome && (
          <div className="flex items-center justify-between border-t border-emerald-200/60 pt-2 text-xs text-slate-600">
            <span>
              Último arquivo de cotação vinculado: <b>{arquivoImportadoNome}</b>
            </span>
            {pesquisa.arquivoPdfTexto && (
              <button
                type="button"
                onClick={() => setMostrarTextoPdf((v) => !v)}
                className="text-xs text-slate-600 underline"
              >
                {mostrarTextoPdf ? "Ocultar" : "Ver"} texto extraído (referência)
              </button>
            )}
          </div>
        )}
        {mostrarTextoPdf && pesquisa.arquivoPdfTexto && (
          <textarea
            readOnly
            value={pesquisa.arquivoPdfTexto}
            rows={8}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600"
          />
        )}
      </div>

      {erro && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
      {mensagem && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{mensagem}</span>
        </div>
      )}

      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900">
            Itens Consolidados Pesquisados ({itens.length})
          </h2>
          <span className="text-xs text-slate-500">
            Os valores da Coluna E importados da planilha do Banco de Preços preenchem o Valor Unitário Pesquisado abaixo
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500 border-b border-slate-100">
              <tr>
                <th className="py-1.5 pr-2 font-medium">#</th>
                <th className="py-1.5 pr-2 font-medium">Item Objeto do Processo</th>
                <th className="py-1.5 pr-2 font-medium">Qtd.</th>
                <th className="py-1.5 pr-2 font-medium">Valor Unit. Pesquisado (Col. E)</th>
                <th className="py-1.5 pr-2 font-medium">Mediana Pesquisada</th>
                <th className="py-1.5 pr-2 font-medium">Total Estimado</th>
                <th className="py-1.5 font-medium">Fontes Consultadas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {itens.map((it, i) => (
                <tr key={i}>
                  <td className="py-1.5 pr-2 align-top text-xs font-semibold text-slate-400">{i + 1}</td>
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
                      className="w-28 rounded-xl border border-slate-300 px-2 py-1 text-sm font-semibold text-emerald-900 disabled:bg-slate-50"
                    />
                  </td>
                  <td className="py-1.5 pr-2 align-top">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={it.medianaPesquisada ?? ""}
                      disabled={finalizado}
                      onChange={(e) => atualizarItem(i, "medianaPesquisada", e.target.value)}
                      className="w-28 rounded-xl border border-slate-300 px-2 py-1 text-sm disabled:bg-slate-50"
                    />
                  </td>
                  <td className="py-1.5 pr-2 align-top font-medium text-slate-800">
                    {brl(it.quantidade * it.valorUnitarioPesquisado)}
                  </td>
                  <td className="py-1.5 align-top">
                    <textarea
                      value={it.fontesConsultadas}
                      disabled={finalizado}
                      onChange={(e) => atualizarItem(i, "fontesConsultadas", e.target.value)}
                      rows={2}
                      placeholder="Ex.: Sistema Banco de Preços, Painel de Preços, cotação com fornecedor..."
                      className="w-full min-w-[14rem] rounded-xl border border-slate-300 px-2 py-1 text-xs disabled:bg-slate-50"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200 font-semibold text-slate-900">
                <td className="py-2 pr-2" colSpan={5}>
                  Total Estimado da Pesquisa de Preços
                </td>
                <td className="py-2 pr-2 text-emerald-800">{brl(totalPesquisaPrecos(itens))}</td>
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
          rows={3}
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

      <div className="flex flex-wrap items-center gap-2">
        {!finalizado && (
          <>
            <button
              type="button"
              disabled={isPending}
              onClick={() => executar(false)}
              className="rounded-xl border border-slate-300 px-3.5 py-2 text-sm hover:bg-slate-100 disabled:opacity-60"
            >
              {isPending ? "Salvando..." : "Salvar Rascunho"}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => executar(true)}
              className="rounded-xl bg-[#003366] px-4 py-2 text-sm font-medium text-white hover:bg-[#002244] disabled:opacity-60"
            >
              {isPending ? "Concluindo..." : "Concluir Pesquisa de Preços e Devolver ao Agente"}
            </button>
          </>
        )}
        <a
          href={pdfHref}
          className="rounded-xl border border-slate-300 px-3.5 py-2 text-sm hover:bg-slate-100"
        >
          Baixar PDF da Pesquisa
        </a>
      </div>
    </div>
  );
}
