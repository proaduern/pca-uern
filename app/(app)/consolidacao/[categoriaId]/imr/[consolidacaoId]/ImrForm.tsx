"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  salvarImrRascunhoAction,
  finalizarImrAction,
  adicionarPacoteEspecializadoAction,
} from "@/lib/actions/imr";
import type { ItemImrPadrao } from "@/lib/imr-padrao";

interface ImrFormProps {
  consolidacaoId: string;
  imrId: string;
  status: "RASCUNHO" | "FINALIZADO";
  tipoModeloInicial: "DEDICACAO_EXCLUSIVA" | "SERVICOS_GERAIS";
  responsavelNomeInicial: string | null;
  responsavelMatriculaInicial: string | null;
  itensIniciais: ItemImrPadrao[];
  pdfHref: string;
  docxHref: string;
}

export default function ImrForm({
  consolidacaoId,
  imrId,
  status,
  tipoModeloInicial,
  responsavelNomeInicial,
  responsavelMatriculaInicial,
  itensIniciais,
  pdfHref,
  docxHref,
}: ImrFormProps) {
  const router = useRouter();
  const [tipoModelo, setTipoModelo] = useState(tipoModeloInicial);
  const [itens, setItens] = useState<ItemImrPadrao[]>(itensIniciais);
  const [responsavelNome, setResponsavelNome] = useState(responsavelNomeInicial || "");
  const [responsavelMatricula, setResponsavelMatricula] = useState(responsavelMatriculaInicial || "");
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);

  const somenteLeitura = status === "FINALIZADO";

  const handleSalvarRascunho = async () => {
    setSalvando(true);
    setMensagem(null);
    try {
      const fd = new FormData();
      fd.append("responsavelNome", responsavelNome);
      fd.append("responsavelMatricula", responsavelMatricula);
      fd.append(
        "itensJson",
        JSON.stringify(
          itens.map((it, idx) => ({
            ordem: idx + 1,
            indicadorNumero: it.indicadorNumero,
            indicadorNome: it.indicadorNome,
            servicoEscopo: it.servicoEscopo,
            descricao: it.descricao,
            pontuacaoPrevista: it.pontuacaoPrevista,
            pontuacaoTexto: it.pontuacaoTexto,
          })),
        ),
      );

      const res = await salvarImrRascunhoAction(imrId, fd);

      if (!res.erro) {
        setMensagem({ tipo: "sucesso", texto: "Rascunho do IMR salvo com sucesso!" });
        router.refresh();
      } else {
        setMensagem({ tipo: "erro", texto: res.erro || "Erro ao salvar rascunho." });
      }
    } catch (e: any) {
      setMensagem({ tipo: "erro", texto: e.message || "Falha na comunicação." });
    } finally {
      setSalvando(false);
    }
  };

  const handleFinalizar = async () => {
    if (!responsavelNome.trim()) {
      alert("Por favor, preencha o nome do responsável pela elaboração.");
      return;
    }
    if (!confirm("Deseja realmente finalizar o Instrumento de Medição de Resultado (IMR)?")) {
      return;
    }

    setSalvando(true);
    setMensagem(null);
    try {
      const fd = new FormData();
      fd.append("responsavelNome", responsavelNome);
      fd.append("responsavelMatricula", responsavelMatricula);
      fd.append(
        "itensJson",
        JSON.stringify(
          itens.map((it, idx) => ({
            ordem: idx + 1,
            indicadorNumero: it.indicadorNumero,
            indicadorNome: it.indicadorNome,
            servicoEscopo: it.servicoEscopo,
            descricao: it.descricao,
            pontuacaoPrevista: it.pontuacaoPrevista,
            pontuacaoTexto: it.pontuacaoTexto,
          })),
        ),
      );

      const res = await finalizarImrAction(imrId, fd);

      if (!res.erro) {
        setMensagem({ tipo: "sucesso", texto: "IMR finalizado com sucesso!" });
        router.refresh();
      } else {
        setMensagem({ tipo: "erro", texto: res.erro || "Erro ao finalizar IMR." });
      }
    } catch (e: any) {
      setMensagem({ tipo: "erro", texto: e.message || "Falha na comunicação." });
    } finally {
      setSalvando(false);
    }
  };

  const handleAdicionarPacote = async (pacote: "TI" | "MANUTENCAO" | "EVENTOS") => {
    setSalvando(true);
    try {
      const res = await adicionarPacoteEspecializadoAction(imrId, pacote);
      if (!res.erro) {
        setMensagem({ tipo: "sucesso", texto: `Pacote especializado '${pacote}' adicionado ao IMR!` });
        router.refresh();
      } else {
        setMensagem({ tipo: "erro", texto: res.erro || "Erro ao adicionar pacote." });
      }
    } catch (e: any) {
      setMensagem({ tipo: "erro", texto: e.message || "Falha ao adicionar pacote." });
    } finally {
      setSalvando(false);
    }
  };

  const adicionarLinhaOcorrencia = () => {
    setItens([
      ...itens,
      {
        indicadorNumero: "Indicador Personalizado",
        indicadorNome: "Qualidade e Execução",
        servicoEscopo: "GERAL",
        descricao: "Descrever nova ocorrência de desconformidade...",
        pontuacaoPrevista: 1.0,
        pontuacaoTexto: "1,0 ponto",
      },
    ]);
  };

  const atualizarItem = (index: number, campo: keyof ItemImrPadrao, valor: any) => {
    const novos = [...itens];
    novos[index] = { ...novos[index], [campo]: valor };
    if (campo === "pontuacaoPrevista") {
      novos[index].pontuacaoTexto = `${valor} ponto(s)`;
    }
    setItens(novos);
  };

  const removerItem = (index: number) => {
    if (confirm("Remover esta ocorrência do IMR?")) {
      setItens(itens.filter((_, i) => i !== index));
    }
  };

  return (
    <div className="space-y-6">
      {mensagem && (
        <div
          className={`p-4 rounded-md text-sm font-medium ${
            mensagem.tipo === "sucesso"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {mensagem.texto}
        </div>
      )}

      {/* Barra de Ações e Exportações */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Status do Documento
          </span>
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              status === "FINALIZADO"
                ? "bg-emerald-100 text-emerald-800"
                : "bg-amber-100 text-amber-800"
            }`}
          >
            {status === "FINALIZADO" ? "FINALIZADO (APROVADO)" : "RASCUNHO (EM EDIÇÃO)"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={pdfHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-red-600 text-white hover:bg-red-700 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Exportar .PDF (Brasão UERN)
          </a>
          <a
            href={docxHref}
            download
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-blue-600 text-white hover:bg-blue-700 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Exportar .DOCX (Nativo SEI)
          </a>
        </div>
      </div>

      {/* Seleção do Modelo e Pacotes Especializados */}
      {!somenteLeitura && (
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                Modelo Base do IMR:
              </label>
              <select
                value={tipoModelo}
                onChange={(e) => setTipoModelo(e.target.value as any)}
                className="text-xs font-medium border border-slate-300 rounded px-2.5 py-1.5 bg-white focus:ring-1 focus:ring-blue-500"
              >
                <option value="SERVICOS_GERAIS">
                  Modelo B: Serviços em Geral sem Mão de Obra Exclusiva (SLA & Qualidade)
                </option>
                <option value="DEDICACAO_EXCLUSIVA">
                  Modelo A: Serviços com Dedicação Exclusiva de Mão de Obra (Padrão Zelo)
                </option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600 font-medium">Acrescentar Pacote Setorial:</span>
              <button
                type="button"
                disabled={salvando}
                onClick={() => handleAdicionarPacote("TI")}
                className="text-xs bg-white hover:bg-slate-100 text-slate-700 font-medium border border-slate-300 px-2.5 py-1 rounded shadow-sm transition"
              >
                + TI & Sistemas
              </button>
              <button
                type="button"
                disabled={salvando}
                onClick={() => handleAdicionarPacote("MANUTENCAO")}
                className="text-xs bg-white hover:bg-slate-100 text-slate-700 font-medium border border-slate-300 px-2.5 py-1 rounded shadow-sm transition"
              >
                + Manutenção & Climatização
              </button>
              <button
                type="button"
                disabled={salvando}
                onClick={() => handleAdicionarPacote("EVENTOS")}
                className="text-xs bg-white hover:bg-slate-100 text-slate-700 font-medium border border-slate-300 px-2.5 py-1 rounded shadow-sm transition"
              >
                + Eventos & Estrutura
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabela de Ocorrências e Pontuações */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Catálogo de Ocorrências, Indicadores e Pontuação ({itens.length} itens mapeados)
          </h2>
          {!somenteLeitura && (
            <button
              type="button"
              onClick={adicionarLinhaOcorrencia}
              className="text-xs font-medium text-blue-600 hover:text-blue-800 bg-white border border-blue-200 px-2.5 py-1 rounded shadow-sm"
            >
              + Adicionar Ocorrência
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-600 border-b border-slate-200 font-semibold">
              <tr>
                <th className="py-2 px-3 w-12 text-center">Nº</th>
                <th className="py-2 px-3 w-48">Indicador</th>
                <th className="py-2 px-3 w-36">Escopo / Área</th>
                <th className="py-2 px-3">Descrição da Ocorrência / Não Conformidade</th>
                <th className="py-2 px-3 w-28 text-center">Pontos</th>
                {!somenteLeitura && <th className="py-2 px-3 w-16 text-center">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {itens.map((it, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition">
                  <td className="py-2 px-3 text-center font-bold text-slate-500">
                    {(idx + 1).toString().padStart(2, "0")}
                  </td>
                  <td className="py-2 px-3">
                    {somenteLeitura ? (
                      <span className="font-medium text-slate-800">{it.indicadorNome}</span>
                    ) : (
                      <input
                        type="text"
                        value={it.indicadorNome}
                        onChange={(e) => atualizarItem(idx, "indicadorNome", e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded px-2 py-1"
                      />
                    )}
                  </td>
                  <td className="py-2 px-3">
                    {somenteLeitura ? (
                      <span className="text-slate-600">{it.servicoEscopo}</span>
                    ) : (
                      <input
                        type="text"
                        value={it.servicoEscopo}
                        onChange={(e) => atualizarItem(idx, "servicoEscopo", e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded px-2 py-1"
                      />
                    )}
                  </td>
                  <td className="py-2 px-3">
                    {somenteLeitura ? (
                      <span className="text-slate-700">{it.descricao}</span>
                    ) : (
                      <textarea
                        rows={2}
                        value={it.descricao}
                        onChange={(e) => atualizarItem(idx, "descricao", e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded px-2 py-1"
                      />
                    )}
                  </td>
                  <td className="py-2 px-3 text-center">
                    {somenteLeitura ? (
                      <span className="font-bold text-slate-800">{it.pontuacaoTexto}</span>
                    ) : (
                      <input
                        type="number"
                        step="0.5"
                        min="0.1"
                        max="20"
                        value={it.pontuacaoPrevista}
                        onChange={(e) =>
                          atualizarItem(idx, "pontuacaoPrevista", parseFloat(e.target.value) || 0)
                        }
                        className="w-20 text-center text-xs border border-slate-200 rounded px-2 py-1 font-bold"
                      />
                    )}
                  </td>
                  {!somenteLeitura && (
                    <td className="py-2 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => removerItem(idx)}
                        className="text-red-500 hover:text-red-700 text-xs font-bold"
                        title="Remover ocorrência"
                      >
                        ✕
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Responsável e Submissão */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
          Responsabilidade Técnica pela Elaboração do IMR
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              Nome do Responsável:
            </label>
            <input
              type="text"
              disabled={somenteLeitura}
              value={responsavelNome}
              onChange={(e) => setResponsavelNome(e.target.value)}
              placeholder="Ex: Maria da Silva"
              className="w-full text-xs border border-slate-300 rounded px-3 py-2 disabled:bg-slate-100"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              Matrícula / Lotação:
            </label>
            <input
              type="text"
              disabled={somenteLeitura}
              value={responsavelMatricula}
              onChange={(e) => setResponsavelMatricula(e.target.value)}
              placeholder="Ex: 123456-7 — DLC/PROAD"
              className="w-full text-xs border border-slate-300 rounded px-3 py-2 disabled:bg-slate-100"
            />
          </div>
        </div>

        {!somenteLeitura && (
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              disabled={salvando}
              onClick={handleSalvarRascunho}
              className="px-4 py-2 text-xs font-semibold rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
            >
              {salvando ? "Salvando..." : "Salvar Rascunho"}
            </button>
            <button
              type="button"
              disabled={salvando}
              onClick={handleFinalizar}
              className="px-4 py-2 text-xs font-semibold rounded bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition"
            >
              {salvando ? "Processando..." : "Finalizar e Aprovar IMR"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
