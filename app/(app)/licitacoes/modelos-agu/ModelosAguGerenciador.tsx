"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { uploadNovoModeloAguAction } from "@/lib/modelos-agu-seed";

interface ModeloItem {
  id: string;
  tipo: string;
  objetoNatureza: string;
  titulo: string;
  descricao?: string | null;
  versaoAgu: string;
  arquivoDocxNome: string;
  ativo: boolean;
  atualizadoPor?: string | null;
  updatedAt: Date;
}

export default function ModelosAguGerenciador({
  modelosIniciais,
}: {
  modelosIniciais: ModeloItem[];
}) {
  const router = useRouter();
  const [modelos] = useState<ModeloItem[]>(modelosIniciais);
  const [modeloIdSelecionado, setModeloIdSelecionado] = useState(
    modelosIniciais[0]?.id || "",
  );
  const [novaVersao, setNovaVersao] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!arquivo) {
      alert("Selecione um arquivo .docx para upload.");
      return;
    }
    if (!novaVersao.trim()) {
      alert("Informe o identificador da versão (ex: v2.4 - Out/2026).");
      return;
    }

    const modeloAtual = modelos.find((m) => m.id === modeloIdSelecionado);
    if (!modeloAtual) {
      alert("Selecione um modelo válido.");
      return;
    }

    setEnviando(true);
    setMensagem(null);
    try {
      const fd = new FormData();
      fd.append("tipo", modeloAtual.tipo);
      fd.append("objetoNatureza", modeloAtual.objetoNatureza);
      fd.append("titulo", modeloAtual.titulo);
      fd.append("versaoAgu", novaVersao.trim());
      fd.append("descricao", observacoes.trim() || modeloAtual.descricao || "");
      fd.append("arquivo", arquivo);

      const res = await uploadNovoModeloAguAction(fd);

      if (!res.erro) {
        setMensagem({
          tipo: "sucesso",
          texto: `Novo modelo atualizado com sucesso! A versão '${novaVersao}' está agora ativa no sistema.`,
        });
        setArquivo(null);
        setNovaVersao("");
        setObservacoes("");
        router.refresh();
      } else {
        setMensagem({ tipo: "erro", texto: res.erro || "Falha no upload do modelo." });
      }
    } catch (err: any) {
      setMensagem({ tipo: "erro", texto: err.message || "Erro inesperado ao enviar arquivo." });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="space-y-6">
      {mensagem && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold ${
            mensagem.tipo === "sucesso"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {mensagem.texto}
        </div>
      )}

      {/* Caixa de Upload do Diretor de Licitações */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Upload de Novo Modelo Oficial da AGU (Lei nº 14.133/2021)
            </h2>
            <p className="text-xs text-slate-500">
              Atualize as minutas-padrão diretamente a partir dos arquivos .docx oficiais da Consultoria-Geral da União
            </p>
          </div>

          <a
            href="https://www.gov.br/agu/pt-br/composicao/cgu/cgu/modelos/licitacoesecontratos/14133/pregao-e-concorrencia"
            target="_blank"
            rel="noreferrer"
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
          >
            <span>Acessar portal de modelos da AGU ↗</span>
          </a>
        </div>

        <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Selecione o Modelo a Atualizar:
            </label>
            <select
              value={modeloIdSelecionado}
              onChange={(e) => setModeloIdSelecionado(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white font-medium"
            >
              {modelos.map((m) => (
                <option key={m.id} value={m.id}>
                  [{m.tipo}] {m.titulo} ({m.versaoAgu})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Rótulo da Nova Versão:
            </label>
            <input
              type="text"
              value={novaVersao}
              onChange={(e) => setNovaVersao(e.target.value)}
              placeholder="Ex: v2.5 - Novembro/2026"
              className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Arquivo .DOCX Oficial da AGU:
            </label>
            <input
              type="file"
              accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(e) => setArquivo(e.target.files?.[0] || null)}
              className="w-full text-xs border border-slate-300 rounded-lg px-3 py-1.5 bg-white file:mr-3 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Notas da Atualização / Referência Normativa:
            </label>
            <input
              type="text"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Ex: Atualização de cláusulas conforme Orientação Normativa AGU nº 82/2026"
              className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white"
            />
          </div>

          <div className="md:col-span-2 flex justify-end pt-2">
            <button
              type="submit"
              disabled={enviando}
              className="px-4 py-2 text-xs font-bold rounded-lg bg-[#003366] hover:bg-[#002244] text-white shadow-sm transition disabled:opacity-50"
            >
              {enviando ? "Processando Upload..." : "Publicar e Ativar Nova Versão do Modelo"}
            </button>
          </div>
        </form>
      </div>

      {/* Catálogo de Modelos Registrados */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Modelos Ativos no Sistema ({modelos.length} modelos configurados)
          </h3>
          <span className="text-[11px] text-slate-500">
            Padrão Advocacia-Geral da União (AGU) e UERN
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-600 border-b border-slate-200 font-semibold">
              <tr>
                <th className="py-2.5 px-4 w-40">Tipo / Artefato</th>
                <th className="py-2.5 px-4">Nome do Modelo</th>
                <th className="py-2.5 px-4 w-28 text-center">Versão Ativa</th>
                <th className="py-2.5 px-4 w-48">Arquivo Base</th>
                <th className="py-2.5 px-4 w-32 text-center">Última Atualização</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {modelos.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50 transition">
                  <td className="py-2.5 px-4 font-semibold text-slate-700">
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] bg-slate-200 text-slate-800">
                      {m.tipo}
                    </span>
                  </td>
                  <td className="py-2.5 px-4">
                    <div className="font-medium text-slate-900">{m.titulo}</div>
                    {m.descricao && (
                      <div className="text-[11px] text-slate-500">{m.descricao}</div>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                      {m.versaoAgu}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-slate-600 font-mono text-[11px]">
                    {m.arquivoDocxNome}
                  </td>
                  <td className="py-2.5 px-4 text-center text-slate-500 text-[11px]">
                    {new Date(m.updatedAt).toLocaleDateString("pt-BR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
