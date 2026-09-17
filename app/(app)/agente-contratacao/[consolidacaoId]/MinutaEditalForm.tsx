"use client";

import { useState, useTransition } from "react";
import { SECOES_MINUTA } from "@/lib/minuta-edital";
import { finalizarMinutaEditalAction, salvarMinutaEditalRascunhoAction } from "@/lib/actions/minuta-edital";

interface DadosEtpPulled {
  objeto: string;
}

interface DadosTrPulled {
  formaSelecaoFornecedor: string;
  exigenciasHabilitacao: string;
  criteriosMedicaoPagamento: string;
  garantiaExecucao: string;
}

interface MinutaDados {
  id: string;
  condicoesParticipacao: string;
  credenciamento: string;
  apresentacaoProposta: string;
  julgamentoPropostas: string;
  documentosHabilitacao: string;
  recursosAdministrativos: string;
  sancoesAdministrativas: string;
  disposicoesGerais: string;
  status: "RASCUNHO" | "FINALIZADO";
  responsavelNome: string | null;
  responsavelMatricula: string | null;
}

export default function MinutaEditalForm({
  etp,
  tr,
  minuta,
  pdfHref,
}: {
  etp: DadosEtpPulled;
  tr: DadosTrPulled;
  minuta: MinutaDados;
  pdfHref: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const finalizado = minuta.status === "FINALIZADO";

  function executar(formData: FormData, finalizar: boolean) {
    setErro(null);
    setMensagem(null);
    startTransition(async () => {
      const resultado = finalizar
        ? await finalizarMinutaEditalAction(minuta.id, formData)
        : await salvarMinutaEditalRascunhoAction(minuta.id, formData);
      if (resultado.erro) {
        setErro(resultado.erro);
        return;
      }
      setMensagem(finalizar ? "Minuta de Edital finalizada com sucesso." : "Rascunho salvo.");
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
          <h2 className="text-sm font-semibold text-slate-900">Conteúdo puxado do ETP e do Termo de Referência</h2>
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
            <span className="font-medium">19. Forma e Critério de Seleção do Fornecedor: </span>
            {tr.formaSelecaoFornecedor}
          </p>
          <p>
            <span className="font-medium">20. Exigências de Habilitação: </span>
            {tr.exigenciasHabilitacao}
          </p>
          <p>
            <span className="font-medium">18. Critérios de Medição e de Pagamento: </span>
            {tr.criteriosMedicaoPagamento}
          </p>
          <p>
            <span className="font-medium">22. Garantia de Execução: </span>
            {tr.garantiaExecucao}
          </p>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Estas seções já foram elaboradas no ETP e no Termo de Referência e não são editáveis
          aqui — o PDF da Minuta de Edital as inclui automaticamente.
        </p>
      </div>

      {SECOES_MINUTA.map((secao) => (
        <div key={secao.campo} className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4">
          <h2 className="mb-2 text-sm font-semibold text-slate-900">
            {secao.numero}. {secao.titulo}
          </h2>
          <textarea
            name={secao.campo}
            defaultValue={(minuta as unknown as Record<string, string>)[secao.campo]}
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
              defaultValue={minuta.responsavelNome ?? ""}
              disabled={finalizado}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Matrícula do responsável</label>
            <input
              name="responsavelMatricula"
              defaultValue={minuta.responsavelMatricula ?? ""}
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
              {isPending ? "Finalizando..." : "Finalizar Minuta de Edital"}
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
