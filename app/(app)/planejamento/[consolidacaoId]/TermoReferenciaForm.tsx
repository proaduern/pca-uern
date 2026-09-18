"use client";

import { useState, useTransition } from "react";
import { brl } from "@/lib/formato";
import { SECOES_TR } from "@/lib/termo-referencia";
import { finalizarTermoReferenciaAction, salvarTermoReferenciaRascunhoAction } from "@/lib/actions/termo-referencia";

interface DadosEtpPulled {
  objeto: string;
  necessidadeContratacao: string;
  referenciaPca: string;
  descricaoSolucaoCompleta: string;
}

interface ItemPesquisaPulled {
  item: string;
  quantidade: number;
  valorUnitarioPesquisado: number;
}

interface DadosPesquisaPulled {
  metodologia: string;
  itens: ItemPesquisaPulled[];
}

interface TrDados {
  id: string;
  requisitosContratacao: string;
  modeloExecucaoObjeto: string;
  modeloGestaoContrato: string;
  criteriosMedicaoPagamento: string;
  formaSelecaoFornecedor: string;
  exigenciasHabilitacao: string;
  adequacaoOrcamentaria: string;
  garantiaExecucao: string;
  status: "RASCUNHO" | "FINALIZADO";
  responsavelNome: string | null;
  responsavelMatricula: string | null;
}

export default function TermoReferenciaForm({
  etp,
  pesquisa,
  tr,
  pdfHref,
}: {
  etp: DadosEtpPulled;
  pesquisa: DadosPesquisaPulled;
  tr: TrDados;
  pdfHref: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const finalizado = tr.status === "FINALIZADO";
  const totalPesquisa = pesquisa.itens.reduce((s, it) => s + it.quantidade * it.valorUnitarioPesquisado, 0);

  function executar(formData: FormData, finalizar: boolean) {
    setErro(null);
    setMensagem(null);
    startTransition(async () => {
      const resultado = finalizar
        ? await finalizarTermoReferenciaAction(tr.id, formData)
        : await salvarTermoReferenciaRascunhoAction(tr.id, formData);
      if (resultado.erro) {
        setErro(resultado.erro);
        return;
      }
      setMensagem(finalizar ? "Termo de Referência finalizado com sucesso." : "Rascunho salvo.");
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const acao = (e.nativeEvent as SubmitEvent & { submitter?: HTMLButtonElement }).submitter?.value;
        executar(formData, acao === "finalizar");
      }}
      className="space-y-4"
    >
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Conteúdo puxado do ETP e da Pesquisa de Preços</h2>
          <span
            className={`rounded-full px-2 py-1 text-xs ${finalizado ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}`}
          >
            {finalizado ? "Finalizado" : "Rascunho"}
          </span>
        </div>
        <div className="space-y-2 text-sm text-slate-700">
          <p>
            <span className="font-medium">1. Do Objeto: </span>
            {etp.objeto}
          </p>
          <p>
            <span className="font-medium">2. Da Fundamentação da Contratação: </span>
            {etp.necessidadeContratacao} {etp.referenciaPca}
          </p>
          <p>
            <span className="font-medium">3. Da Descrição da Solução: </span>
            {etp.descricaoSolucaoCompleta}
          </p>
          <p>
            <span className="font-medium">4. Da Estimativa de Valor da Contratação — </span>
            Metodologia: {pesquisa.metodologia}
          </p>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="py-1 pr-2 font-medium">Item</th>
                <th className="py-1 pr-2 font-medium">Qtd.</th>
                <th className="py-1 pr-2 font-medium">Valor unit. pesquisado</th>
                <th className="py-1 font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pesquisa.itens.map((it, i) => (
                <tr key={i}>
                  <td className="py-1.5 pr-2 text-slate-900">{it.item}</td>
                  <td className="py-1.5 pr-2 text-slate-600">{it.quantidade}</td>
                  <td className="py-1.5 pr-2 text-slate-600">{brl(it.valorUnitarioPesquisado)}</td>
                  <td className="py-1.5 text-slate-600">{brl(it.quantidade * it.valorUnitarioPesquisado)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200 font-semibold text-slate-900">
                <td className="py-1.5 pr-2" colSpan={3}>
                  Total estimado
                </td>
                <td className="py-1.5">{brl(totalPesquisa)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Estas seções já foram elaboradas no ETP e na Pesquisa de Preços e não são editáveis aqui
          — o PDF do Termo de Referência as inclui automaticamente.
        </p>
      </div>

      {SECOES_TR.map((secao) => (
        <div key={secao.campo} className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4">
          <h2 className="mb-2 text-sm font-semibold text-slate-900">
            {secao.numero}. {secao.titulo}
          </h2>
          <textarea
            name={secao.campo}
            defaultValue={(tr as unknown as Record<string, string>)[secao.campo]}
            required
            rows={4}
            disabled={finalizado}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
          />
        </div>
      ))}

      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Responsabilidade pela Elaboração</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Nome do responsável</label>
            <input
              name="responsavelNome"
              defaultValue={tr.responsavelNome ?? ""}
              disabled={finalizado}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Matrícula do responsável</label>
            <input
              name="responsavelMatricula"
              defaultValue={tr.responsavelMatricula ?? ""}
              disabled={finalizado}
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
              type="submit"
              name="acao"
              value="rascunho"
              disabled={isPending}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100 disabled:opacity-60"
            >
              {isPending ? "Salvando..." : "Salvar Rascunho"}
            </button>
            <button
              type="submit"
              name="acao"
              value="finalizar"
              disabled={isPending}
              className="rounded-xl bg-[#003366] px-3 py-2 text-sm font-medium text-white hover:bg-[#002244] disabled:opacity-60"
            >
              {isPending ? "Finalizando..." : "Finalizar Termo de Referência"}
            </button>
          </>
        )}
        <a href={pdfHref} className="rounded-xl border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100">
          Baixar PDF
        </a>
      </div>
    </form>
  );
}
