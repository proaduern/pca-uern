"use client";

import { useState, useTransition } from "react";
import { SECOES_ETP } from "@/lib/etp-riscos";
import { finalizarEtpAction, salvarEtpRascunhoAction } from "@/lib/actions/etp-riscos";

interface EtpDados {
  id: string;
  objeto: string;
  localEntregaPrestacao: string;
  necessidadeContratacao: string;
  referenciaPca: string;
  requisitosContratacao: string;
  estimativaQuantidadesMemoria: string;
  levantamentoMercadoJustificativa: string;
  estimativaPreliminarPrecos: string;
  descricaoSolucaoCompleta: string;
  justificativaParcelamento: string;
  resultadosEsperados: string;
  providenciasAdministracao: string;
  contratacoesCorrelatas: string;
  impactosAmbientais: string;
  declaracaoViabilidade: string;
  status: "RASCUNHO" | "FINALIZADO";
  responsavelNome: string | null;
  responsavelMatricula: string | null;
}

export default function EtpForm({ etp, pdfHref }: { etp: EtpDados; pdfHref: string }) {
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const finalizado = etp.status === "FINALIZADO";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setErro(null);
        setMensagem(null);
        const formData = new FormData(e.currentTarget);
        const acao = (e.nativeEvent as SubmitEvent & { submitter?: HTMLButtonElement }).submitter?.value;
        startTransition(async () => {
          const resultado =
            acao === "finalizar" ? await finalizarEtpAction(etp.id, formData) : await salvarEtpRascunhoAction(etp.id, formData);
          if (resultado.erro) {
            setErro(resultado.erro);
            return;
          }
          setMensagem(acao === "finalizar" ? "ETP finalizado com sucesso." : "Rascunho salvo.");
        });
      }}
      className="space-y-4"
    >
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">1. Dados do Processo</h2>
          <span
            className={`rounded-full px-2 py-1 text-xs ${finalizado ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}`}
          >
            {finalizado ? "Finalizado" : "Rascunho"}
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Objeto</label>
            <input
              name="objeto"
              defaultValue={etp.objeto}
              required
              disabled={finalizado}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Local da entrega ou prestação do serviço</label>
            <input
              name="localEntregaPrestacao"
              defaultValue={etp.localEntregaPrestacao}
              required
              disabled={finalizado}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
            />
          </div>
        </div>
      </div>

      {SECOES_ETP.map((secao) => (
        <div key={secao.campo} className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4">
          <h2 className="mb-2 text-sm font-semibold text-slate-900">
            {secao.numero}. {secao.titulo}
          </h2>
          {secao.campo === "referenciaPca" && (
            <p className="mb-2 text-xs text-slate-500">
              Informe o identificador da contratação no PCA/PNCP e, se houver, a referência ao PDI/PPA/Carta
              Programa — o sistema não tem acesso a esses documentos institucionais.
            </p>
          )}
          <textarea
            name={secao.campo}
            defaultValue={(etp as unknown as Record<string, string>)[secao.campo]}
            required
            rows={5}
            disabled={finalizado}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
          />
        </div>
      ))}

      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">15. Responsabilidade pela Elaboração</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Nome do responsável</label>
            <input
              name="responsavelNome"
              defaultValue={etp.responsavelNome ?? ""}
              disabled={finalizado}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Matrícula do responsável</label>
            <input
              name="responsavelMatricula"
              defaultValue={etp.responsavelMatricula ?? ""}
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
              {isPending ? "Finalizando..." : "Finalizar ETP"}
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
