"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  aprovarKitDefinitivoPosPgeAction,
  solicitarDiligenciaPosPgeAction,
} from "@/lib/actions/kit-definitivo";

interface PainelKitDefinitivoProps {
  consolidacaoId: string;
  categoriaId: string;
  trFinalizado: boolean;
  minutaFinalizada: boolean;
  kitDefinitivoAprovadoEm: string | null;
  kitDefinitivoParecerSei: string | null;
  kitDefinitivoAgenteNome: string | null;
  editalNumeroFormatado: string | null;
  trNumeroFormatado: string | null;
  etpNumeroFormatado: string | null;
  riscosNumeroFormatado: string | null;
  imrNumeroFormatado: string | null;
  contratoNumeroFormatado: string | null;
  ataNumeroFormatado: string | null;
}

export default function PainelKitDefinitivoAgente({
  consolidacaoId,
  categoriaId,
  trFinalizado,
  minutaFinalizada,
  kitDefinitivoAprovadoEm,
  kitDefinitivoParecerSei,
  kitDefinitivoAgenteNome,
  editalNumeroFormatado,
  trNumeroFormatado,
  etpNumeroFormatado,
  riscosNumeroFormatado,
  imrNumeroFormatado,
  contratoNumeroFormatado,
  ataNumeroFormatado,
}: PainelKitDefinitivoProps) {
  const router = useRouter();
  const [parecerSei, setParecerSei] = useState(kitDefinitivoParecerSei || "");
  const [artefatoDiligencia, setArtefatoDiligencia] = useState<"ETP" | "PESQUISA" | "TR" | "RISCOS" | "IMR" | "EDITAL">("TR");
  const [motivoDiligencia, setMotivoDiligencia] = useState("");
  const [processando, setProcessando] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);

  const aprovado = !!kitDefinitivoAprovadoEm;

  const handleAprovarKit = async () => {
    if (!parecerSei.trim()) {
      alert("Por favor, informe o Parecer Jurídico da PGE / Número SEI correspondente.");
      return;
    }
    if (!confirm("Confirmar a aprovação jurídica pós-PGE e gerar o Kit de Documentos Definitivos com Sequencial Oficial SGC?")) {
      return;
    }

    setProcessando(true);
    setMensagem(null);
    try {
      const res = await aprovarKitDefinitivoPosPgeAction(consolidacaoId, parecerSei);
      if (res.sucesso) {
        setMensagem({ tipo: "sucesso", texto: "Kit de Documentos Definitivos gerado com sucesso!" });
        router.refresh();
      } else {
        setMensagem({ tipo: "erro", texto: res.erro || "Falha ao aprovar kit." });
      }
    } catch (e: any) {
      setMensagem({ tipo: "erro", texto: e.message || "Erro inesperado." });
    } finally {
      setProcessando(false);
    }
  };

  const handleSolicitarDiligencia = async () => {
    if (!motivoDiligencia.trim()) {
      alert("Informe o motivo da diligência recomendada pelo Parecer da PGE.");
      return;
    }
    if (!confirm(`Deseja devolver o artefato '${artefatoDiligencia}' para adequação pelo setor responsável?`)) {
      return;
    }

    setProcessando(true);
    setMensagem(null);
    try {
      const res = await solicitarDiligenciaPosPgeAction(consolidacaoId, artefatoDiligencia, motivoDiligencia);
      if (res.sucesso) {
        setMensagem({ tipo: "sucesso", texto: `Diligência registrada! O artefato '${artefatoDiligencia}' foi reaberto.` });
        setMotivoDiligencia("");
        router.refresh();
      } else {
        setMensagem({ tipo: "erro", texto: res.erro || "Falha ao registrar diligência." });
      }
    } catch (e: any) {
      setMensagem({ tipo: "erro", texto: e.message || "Erro inesperado." });
    } finally {
      setProcessando(false);
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900">
            4. Análise Jurídica (PGE), Diligências e Kit de Documentos Definitivos
          </h2>
          <p className="text-xs text-slate-500">
            Regramento AGU / Lei 14.133/2021 c/c LC Estadual nº 675/2020-RN e Sequencial Oficial SGC
          </p>
        </div>

        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
            aprovado
              ? "bg-emerald-100 text-emerald-800"
              : trFinalizado
                ? "bg-blue-100 text-blue-800"
                : "bg-slate-100 text-slate-600"
          }`}
        >
          {aprovado
            ? "KIT DEFINITIVO APROVADO COM SEQUENCIAL"
            : trFinalizado
              ? "AGUARDANDO APROVAÇÃO PÓS-PGE"
              : "AGUARDANDO CONCLUSÃO DO TR"}
        </span>
      </div>

      {mensagem && (
        <div
          className={`p-3 rounded-md text-xs font-medium ${
            mensagem.tipo === "sucesso"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {mensagem.texto}
        </div>
      )}

      {/* Caixa de Entrada do Parecer PGE e Botão de Aprovação */}
      {!aprovado && (
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Número do Parecer Jurídico da PGE / Documento SEI:
              </label>
              <input
                type="text"
                value={parecerSei}
                onChange={(e) => setParecerSei(e.target.value)}
                placeholder="Ex: Parecer nº 456/2026-PGE / Doc. SEI 41999888"
                className="w-full text-xs border border-slate-300 rounded px-3 py-2 bg-white"
              />
            </div>
            <div>
              <button
                type="button"
                disabled={processando || !trFinalizado}
                onClick={handleAprovarKit}
                className="w-full px-4 py-2 text-xs font-bold rounded bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition disabled:opacity-50"
              >
                {processando ? "Processando..." : "Aprovar Pós-PGE e Gerar Kit Definitivo"}
              </button>
            </div>
          </div>

          {/* Diligência Seletiva */}
          <div className="pt-2 border-t border-slate-200">
            <details className="text-xs text-slate-600">
              <summary className="font-semibold text-blue-700 cursor-pointer hover:underline">
                PGE solicitou diligências ou ajustes? Clique aqui para devolver artefato específico
              </summary>
              <div className="mt-3 p-3 bg-white rounded-lg border border-slate-200 space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-1">
                      Artefato a Reabrir:
                    </label>
                    <select
                      value={artefatoDiligencia}
                      onChange={(e) => setArtefatoDiligencia(e.target.value as any)}
                      className="text-xs border border-slate-300 rounded px-2.5 py-1.5"
                    >
                      <option value="TR">Termo de Referência (TR)</option>
                      <option value="ETP">Estudo Técnico Preliminar (ETP)</option>
                      <option value="IMR">Instrumento de Medição de Resultado (IMR)</option>
                      <option value="RISCOS">Mapa de Riscos</option>
                      <option value="PESQUISA">Pesquisa de Preços</option>
                      <option value="EDITAL">Minuta de Edital</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-medium text-slate-600 block mb-1">
                      Instruções / Apontamento da PGE:
                    </label>
                    <input
                      type="text"
                      value={motivoDiligencia}
                      onChange={(e) => setMotivoDiligencia(e.target.value)}
                      placeholder="Ex: Ajustar item 4.2 do TR conforme parecer da PGE..."
                      className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5"
                    />
                  </div>
                  <div className="self-end">
                    <button
                      type="button"
                      disabled={processando}
                      onClick={handleSolicitarDiligencia}
                      className="px-3 py-1.5 text-xs font-medium bg-amber-600 hover:bg-amber-700 text-white rounded transition"
                    >
                      Devolver Artefato
                    </button>
                  </div>
                </div>
              </div>
            </details>
          </div>
        </div>
      )}

      {/* Exibição do Kit Definitivo Gerado */}
      {aprovado && (
        <div className="space-y-3 bg-emerald-50/50 p-4 rounded-xl border border-emerald-200">
          <div className="flex flex-wrap items-center justify-between text-xs text-slate-700">
            <span>
              <strong>Parecer PGE:</strong> {kitDefinitivoParecerSei} | <strong>Aprovado por:</strong> {kitDefinitivoAgenteNome}
            </span>
            <span className="text-slate-500">
              Data: {new Date(kitDefinitivoAprovadoEm!).toLocaleString("pt-BR")}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            {/* Edital Definitivo */}
            <div className="bg-white p-3 rounded-lg border border-slate-200 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-xs font-bold text-slate-800 block">
                  {editalNumeroFormatado || "Edital de Licitação"}
                </span>
                <span className="text-[11px] text-slate-500">Instrumento Convocatório Principal</span>
              </div>
              <div className="flex items-center gap-1.5">
                <a
                  href={`/agente-contratacao/${consolidacaoId}/pdf`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2 py-1 text-xs font-medium rounded bg-red-100 text-red-800 hover:bg-red-200"
                >
                  .PDF
                </a>
                <a
                  href={`/agente-contratacao/${consolidacaoId}/docx`}
                  download
                  className="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800 hover:bg-blue-200"
                >
                  .DOCX
                </a>
              </div>
            </div>

            {/* Termo de Referência Definitivo */}
            <div className="bg-white p-3 rounded-lg border border-slate-200 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-xs font-bold text-slate-800 block">
                  {trNumeroFormatado || "Termo de Referência"}
                </span>
                <span className="text-[11px] text-slate-500">Anexo I do Edital (Cotas LC 675/2020)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <a
                  href={`/planejamento/${consolidacaoId}/pdf`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2 py-1 text-xs font-medium rounded bg-red-100 text-red-800 hover:bg-red-200"
                >
                  .PDF
                </a>
                <a
                  href={`/planejamento/${consolidacaoId}/docx`}
                  download
                  className="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800 hover:bg-blue-200"
                >
                  .DOCX
                </a>
              </div>
            </div>

            {/* Estudo Técnico Preliminar Definitivo */}
            <div className="bg-white p-3 rounded-lg border border-slate-200 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-xs font-bold text-slate-800 block">
                  {etpNumeroFormatado || "Estudo Técnico Preliminar"}
                </span>
                <span className="text-[11px] text-slate-500">Anexo II do Edital (Lista Consolidada ETP)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <a
                  href={`/consolidacao/${categoriaId}/etp/${consolidacaoId}/pdf`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2 py-1 text-xs font-medium rounded bg-red-100 text-red-800 hover:bg-red-200"
                >
                  .PDF
                </a>
                <a
                  href={`/consolidacao/${categoriaId}/etp/${consolidacaoId}/docx`}
                  download
                  className="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800 hover:bg-blue-200"
                >
                  .DOCX
                </a>
              </div>
            </div>

            {/* Instrumento de Medição de Resultado - IMR */}
            <div className="bg-white p-3 rounded-lg border border-slate-200 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-xs font-bold text-slate-800 block">
                  {imrNumeroFormatado || "Instrumento de Medição de Resultado (IMR)"}
                </span>
                <span className="text-[11px] text-slate-500">Anexo III do Edital (SLA & Glosas)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <a
                  href={`/consolidacao/${categoriaId}/imr/${consolidacaoId}/pdf`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2 py-1 text-xs font-medium rounded bg-red-100 text-red-800 hover:bg-red-200"
                >
                  .PDF
                </a>
                <a
                  href={`/consolidacao/${categoriaId}/imr/${consolidacaoId}/docx`}
                  download
                  className="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800 hover:bg-blue-200"
                >
                  .DOCX
                </a>
              </div>
            </div>

            {/* Mapa de Riscos */}
            <div className="bg-white p-3 rounded-lg border border-slate-200 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-xs font-bold text-slate-800 block">
                  {riscosNumeroFormatado || "Mapa de Gerenciamento de Riscos"}
                </span>
                <span className="text-[11px] text-slate-500">Anexo IV do Edital (21 Fatores UERN)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <a
                  href={`/consolidacao/${categoriaId}/riscos/${consolidacaoId}/pdf`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2 py-1 text-xs font-medium rounded bg-red-100 text-red-800 hover:bg-red-200"
                >
                  .PDF
                </a>
                <a
                  href={`/consolidacao/${categoriaId}/riscos/${consolidacaoId}/docx`}
                  download
                  className="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800 hover:bg-blue-200"
                >
                  .DOCX
                </a>
              </div>
            </div>

            {/* Minuta de Contrato / Ata */}
            <div className="bg-white p-3 rounded-lg border border-slate-200 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-xs font-bold text-slate-800 block">
                  {contratoNumeroFormatado || ataNumeroFormatado || "Minuta de Contrato / Ata"}
                </span>
                <span className="text-[11px] text-slate-500">Anexo V do Edital (Minuta AGU)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <a
                  href={`/planejamento/${consolidacaoId}/contrato/docx`}
                  download
                  className="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800 hover:bg-blue-200"
                  title="Baixar Contrato em DOCX"
                >
                  Contrato .DOCX
                </a>
                <a
                  href={`/planejamento/${consolidacaoId}/ata/docx`}
                  download
                  className="px-2 py-1 text-xs font-medium rounded bg-indigo-100 text-indigo-800 hover:bg-indigo-200"
                  title="Baixar Ata em DOCX"
                >
                  Ata .DOCX
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
