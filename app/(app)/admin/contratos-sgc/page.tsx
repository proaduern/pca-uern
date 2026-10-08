'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileText,
  Calendar,
  Building2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Sparkles,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Zap,
} from 'lucide-react';

interface ContratoSgc {
  id: string;
  numeroContrato: string;
  processoSeiMae: string;
  objeto: string;
  tipoContrato: string;
  tipoVigencia: string;
  vigenciaInicio: string;
  vigenciaFim: string;
  anoTerminoVigencia: number;
  anosVigenciaAcumulados: number;
  atingiraLimiteDecenal: boolean;
  valorGlobal: number;
  valorAtualizado: number;
  valorAnualizadoEstimado: number;
  tipoDemandaSugerida: 'RENOVACAO' | 'NOVA';
  venceNoAnoPca: boolean;
  vigenciaAdentraAnoPca: boolean;
  jaIncorporadoPca: boolean;
  dfdExistente?: {
    id: string;
    numero: number;
    status: string;
    unidadeNome?: string;
  } | null;
  fornecedor: {
    id: string;
    razaoSocial: string;
    nomeFantasia?: string;
    cnpj: string;
  };
}

export default function ContratosSgcPage() {
  const [ano, setAno] = useState<number>(2026);
  const [contratos, setContratos] = useState<ContratoSgc[]>([]);
  const [loading, setLoading] = useState(true);
  const [incorporandoId, setIncorporandoId] = useState<string | null>(null);
  const [msgSucesso, setMsgSucesso] = useState<string | null>(null);
  const [msgErro, setMsgErro] = useState<string | null>(null);

  const carregarContratos = async (anoSelecionado = ano) => {
    setLoading(true);
    setMsgErro(null);
    try {
      const res = await fetch(`/api/integracao/sgc-contratos?ano=${anoSelecionado}`);
      if (!res.ok) throw new Error('Falha ao consultar contratos do SGC.');
      const data = await res.json();
      setContratos(data.contratos || []);
    } catch (err: any) {
      setMsgErro(err.message || 'Erro ao comunicar com a integração do SGC.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarContratos(ano);
  }, [ano]);

  const handleIncorporarContrato = async (c: ContratoSgc) => {
    setIncorporandoId(c.id);
    setMsgSucesso(null);
    setMsgErro(null);

    try {
      const res = await fetch('/api/integracao/incorporar-contrato', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contratoId: c.id,
          anoPca: ano,
          contratoData: c,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao incorporar contrato ao PCA.');
      }

      setMsgSucesso(data.message || `DFD gerado com sucesso para o Contrato ${c.numeroContrato}!`);
      // Recarrega lista para atualizar status
      carregarContratos(ano);
    } catch (err: any) {
      setMsgErro(err.message);
    } finally {
      setIncorporandoId(null);
    }
  };

  const totalAtivos = contratos.length;
  const totalIncorporados = contratos.filter((c) => c.jaIncorporadoPca).length;
  const totalPendentes = contratos.filter((c) => !c.jaIncorporadoPca).length;
  const totalValor = contratos.reduce((acc, c) => acc + (c.valorAnualizadoEstimado || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" /> Integração Automática SGC ➔ PCA
          </div>
          <h1 className="text-xl font-extrabold text-white tracking-tight">
            Contratos Vigentes & Previsão de Continuidade
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Contratos de serviços continuados do SGC alimentando o planejamento do PCA sem digitação manual.
          </p>
        </div>

        {/* Seletor de Ano do PCA */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-medium text-slate-300">Exercício PCA:</span>
            <select
              value={ano}
              onChange={(e) => setAno(parseInt(e.target.value, 10))}
              className="bg-slate-950 text-white font-bold text-xs rounded-lg px-2 py-1 outline-none border border-slate-700 cursor-pointer"
            >
              <option value={2026}>PCA 2026</option>
              <option value={2027}>PCA 2027</option>
              <option value={2028}>PCA 2028</option>
              <option value={2029}>PCA 2029</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => carregarContratos(ano)}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title="Sincronizar com SGC"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Alertas */}
      {msgSucesso && (
        <div className="p-4 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-200 text-xs flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{msgSucesso}</span>
          </div>
          <button onClick={() => setMsgSucesso(null)} className="text-emerald-400 font-bold">×</button>
        </div>
      )}

      {msgErro && (
        <div className="p-4 rounded-xl bg-red-950/70 border border-red-500/40 text-red-200 text-xs flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{msgErro}</span>
          </div>
          <button onClick={() => setMsgErro(null)} className="text-red-400 font-bold">×</button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
          <span className="text-[11px] text-slate-400 block font-medium">Contratos Contínuos SGC</span>
          <span className="text-2xl font-black text-white mt-1 block">{totalAtivos}</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
          <span className="text-[11px] text-emerald-400 block font-medium">Já Incorporados ao PCA</span>
          <span className="text-2xl font-black text-emerald-400 mt-1 block">{totalIncorporados}</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
          <span className="text-[11px] text-amber-400 block font-medium">Pendentes de Inclusão</span>
          <span className="text-2xl font-black text-amber-400 mt-1 block">{totalPendentes}</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
          <span className="text-[11px] text-blue-400 block font-medium">Previsão Anual Total</span>
          <span className="text-lg font-black text-blue-400 mt-1 block">
            {totalValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
        </div>
      </div>

      {/* Tabela de Contratos */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-400" />
            <span>Contratos Contínuos para o Exercício de {ano}</span>
          </h2>
          <span className="text-xs text-slate-400">
            Regra Lei 14.133/2021 (Art. 106/107)
          </span>
        </div>

        {contratos.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-semibold">Nenhum contrato contínuo localizado no SGC para este período.</p>
            <p className="text-xs text-slate-500 mt-1">Verifique se o servidor do SGC está em execução ou cadastre novos contratos contínuos.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-3.5">Contrato & Processo SEI</th>
                  <th className="p-3.5">Objeto & Fornecedor</th>
                  <th className="p-3.5">Vigência & Anos</th>
                  <th className="p-3.5">Previsão Anual (R$)</th>
                  <th className="p-3.5">Natureza Sugerida</th>
                  <th className="p-3.5 text-right">Ação / Status PCA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {contratos.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-3.5">
                      <div className="font-bold text-white">{c.numeroContrato}</div>
                      <div className="text-[11px] text-slate-400">SEI: {c.processoSeiMae}</div>
                    </td>

                    <td className="p-3.5 max-w-xs">
                      <div className="font-medium text-slate-200 truncate" title={c.objeto}>
                        {c.objeto}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                        {c.fornecedor.razaoSocial}
                      </div>
                      <div className="text-[10px] text-slate-500">CNPJ: {c.fornecedor.cnpj}</div>
                    </td>

                    <td className="p-3.5">
                      <div className="text-slate-300">
                        Até <strong className="text-amber-300">{new Date(c.vigenciaFim).toLocaleDateString('pt-BR')}</strong>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {c.anosVigenciaAcumulados} ano(s) decorrido(s)
                      </div>
                    </td>

                    <td className="p-3.5 font-bold text-white">
                      {c.valorAnualizadoEstimado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>

                    <td className="p-3.5">
                      {c.tipoDemandaSugerida === 'RENOVACAO' ? (
                        <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20 text-[10px] font-semibold">
                          Renovação Contratual
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-300 border border-orange-500/20 text-[10px] font-semibold" title="Limite decenal atingido: exige nova licitação">
                          Nova Contratação (Decenal)
                        </span>
                      )}
                    </td>

                    <td className="p-3.5 text-right">
                      {c.jaIncorporadoPca && c.dfdExistente ? (
                        <div className="inline-flex items-center gap-1.5">
                          <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold text-[11px] flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            DFD nº {c.dfdExistente.numero}/{ano}
                          </span>
                          <Link
                            href={`/dfd/${c.dfdExistente.id}`}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                            title="Visualizar DFD"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleIncorporarContrato(c)}
                          disabled={incorporandoId === c.id}
                          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition active:scale-95 disabled:opacity-50 ml-auto"
                        >
                          <Zap className="w-3.5 h-3.5 text-amber-300" />
                          <span>{incorporandoId === c.id ? 'Incorporando...' : 'Incorporar ao PCA'}</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
