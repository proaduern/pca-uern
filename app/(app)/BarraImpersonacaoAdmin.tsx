'use client';

import React, { useState, useTransition } from 'react';
import {
  ShieldAlert,
  ChevronDown,
  Building2,
  FileText,
  Wrench,
  DollarSign,
  Layers,
  Scale,
  X,
  Sparkles,
} from 'lucide-react';
import {
  iniciarAtuarComoArquetipoAction,
  encerrarAtuarComoAction,
} from '@/lib/actions/auth';

interface BarraImpersonacaoAdminProps {
  sessaoReal?: {
    id: string;
    nome: string;
    tipo: string;
  } | null;
  sessaoAtual?: {
    id: string;
    nome: string;
    tipo: string;
    unidadeNome?: string | null;
  } | null;
}

export default function BarraImpersonacaoAdmin({
  sessaoReal,
  sessaoAtual,
}: BarraImpersonacaoAdminProps) {
  const [isPending, startTransition] = useTransition();
  const [menuAberto, setMenuAberto] = useState(false);

  const isAdminReal = sessaoReal?.tipo === 'ADMIN';

  if (!isAdminReal) {
    return null;
  }

  const isImpersonando = sessaoAtual?.tipo !== 'ADMIN';

  const ROTULO_POR_TIPO: Record<string, string> = {
    ADMIN: 'PROAD (Administrador)',
    UNIDADE: 'Unidade Demandante',
    SETOR_INTERNO: 'Setor Interno',
    SETOR_TECNICO: 'Setor Técnico (SOBE / STI)',
    LICITACOES: 'Diretor de Licitações (DLC)',
    PESQUISA_PRECOS: 'Pesquisa de Preços',
    PLANEJAMENTO: 'Planejamento (TR)',
    AGENTE_CONTRATACAO: 'Agente de Contratação',
    EXECUCAO: 'Execução Contratual',
    ENTREGA: 'Entrega de Bens',
    GESTOR_ATA: 'Gestão de Atas (ARP)',
  };

  const handleTrocarPerfil = (tipo: string) => {
    setMenuAberto(false);
    startTransition(async () => {
      try {
        await iniciarAtuarComoArquetipoAction(tipo);
      } catch (e: any) {
        alert(e?.message || 'Erro ao alternar perfil.');
      }
    });
  };

  const handleEncerrar = () => {
    setMenuAberto(false);
    startTransition(async () => {
      try {
        await encerrarAtuarComoAction();
      } catch (e: any) {
        alert(e?.message || 'Erro ao retornar ao modo administrador.');
      }
    });
  };

  return (
    <>
      {isImpersonando ? (
        <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-600 text-slate-950 px-4 py-2 border-b border-amber-400 shadow-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-black/20 text-white animate-pulse">
                <ShieldAlert className="w-4 h-4 text-yellow-100" />
              </span>
              <div className="leading-tight">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="bg-black text-amber-300 font-extrabold uppercase px-1.5 py-0.5 rounded text-[10px] tracking-wider">
                    Modo Simulação PROAD
                  </span>
                  <span>Atuando como:</span>
                  <strong className="text-black bg-white/70 px-2 py-0.5 rounded font-bold shadow-sm">
                    {sessaoAtual?.nome}
                  </strong>
                  <span className="text-amber-950 font-semibold">
                    ({ROTULO_POR_TIPO[sessaoAtual?.tipo || ''] || sessaoAtual?.tipo})
                  </span>
                </div>
                <div className="text-[11px] text-amber-950 mt-0.5">
                  Sessão Real: <strong>{sessaoReal?.nome}</strong> (PROAD Central)
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 relative">
              <button
                type="button"
                onClick={() => setMenuAberto(!menuAberto)}
                disabled={isPending}
                className="px-2.5 py-1 rounded bg-black/15 hover:bg-black/25 text-amber-950 font-bold flex items-center gap-1 border border-black/10 transition"
              >
                <span>Trocar Perfil</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={handleEncerrar}
                disabled={isPending}
                className="px-3 py-1 rounded bg-slate-950 text-white hover:bg-slate-900 font-bold flex items-center gap-1.5 shadow transition disabled:opacity-50"
                title="Restaurar modo Administrador PROAD"
              >
                <X className="w-3.5 h-3.5 text-amber-400" />
                <span>{isPending ? 'Saindo...' : 'Voltar para Admin'}</span>
              </button>

              {menuAberto && (
                <div className="absolute right-0 top-9 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 z-50 text-slate-800 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="px-3 py-1.5 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Alternar para Subsistema / Papel
                  </div>
                  <button
                    onClick={() => handleTrocarPerfil('UNIDADE')}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-amber-50 flex items-center gap-2 transition"
                  >
                    <Building2 className="w-4 h-4 text-blue-600" />
                    <div>
                      <div className="font-semibold text-slate-800">Unidade Demandante</div>
                      <div className="text-[10px] text-slate-500">Minhas Demandas e DFDs</div>
                    </div>
                  </button>
                  <button
                    onClick={() => handleTrocarPerfil('SETOR_TECNICO')}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-amber-50 flex items-center gap-2 transition"
                  >
                    <Wrench className="w-4 h-4 text-orange-600" />
                    <div>
                      <div className="font-semibold text-slate-800">Setor Técnico (SOBE / STI)</div>
                      <div className="text-[10px] text-slate-500">ETP e Mapa de Riscos</div>
                    </div>
                  </button>
                  <button
                    onClick={() => handleTrocarPerfil('PESQUISA_PRECOS')}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-amber-50 flex items-center gap-2 transition"
                  >
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    <div>
                      <div className="font-semibold text-slate-800">Pesquisa de Preços</div>
                      <div className="text-[10px] text-slate-500">Fila de Cotações e Mapa</div>
                    </div>
                  </button>
                  <button
                    onClick={() => handleTrocarPerfil('PLANEJAMENTO')}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-amber-50 flex items-center gap-2 transition"
                  >
                    <FileText className="w-4 h-4 text-purple-600" />
                    <div>
                      <div className="font-semibold text-slate-800">Planejamento (TR)</div>
                      <div className="text-[10px] text-slate-500">Termo de Referência</div>
                    </div>
                  </button>
                  <button
                    onClick={() => handleTrocarPerfil('LICITACOES')}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-amber-50 flex items-center gap-2 transition"
                  >
                    <Scale className="w-4 h-4 text-amber-600" />
                    <div>
                      <div className="font-semibold text-slate-800">Diretor de Licitações (DLC)</div>
                      <div className="text-[10px] text-slate-500">Designação e Processos</div>
                    </div>
                  </button>
                  <button
                    onClick={() => handleTrocarPerfil('GESTOR_ATA')}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-amber-50 flex items-center gap-2 transition"
                  >
                    <Layers className="w-4 h-4 text-indigo-600" />
                    <div>
                      <div className="font-semibold text-slate-800">Gestão de Atas (ARP)</div>
                      <div className="text-[10px] text-slate-500">Minutas e controle de atas</div>
                    </div>
                  </button>

                  <div className="border-t border-slate-100 p-2 mt-1">
                    <button
                      onClick={handleEncerrar}
                      className="w-full text-center py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg transition"
                    >
                      Voltar ao Administrador PROAD
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 text-slate-200 border-b border-slate-800 px-4 py-1.5 text-xs">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>
                Sessão Oficial PROAD: <strong>{sessaoReal?.nome}</strong> (Administrador Geral)
              </span>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuAberto(!menuAberto)}
                className="px-2.5 py-0.5 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold flex items-center gap-1.5 transition text-[11px]"
              >
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>🎭 Atuar Como Perfil...</span>
                <ChevronDown className="w-3 h-3" />
              </button>

              {menuAberto && (
                <div className="absolute right-0 top-7 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 z-50 text-slate-800 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="px-3 py-1.5 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Simular Perfil no PCA / Pré-Contratual
                  </div>
                  <button
                    onClick={() => handleTrocarPerfil('UNIDADE')}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-amber-50 flex items-center gap-2 transition"
                  >
                    <Building2 className="w-4 h-4 text-blue-600" />
                    <div>
                      <div className="font-semibold text-slate-800">Unidade Demandante</div>
                      <div className="text-[10px] text-slate-500">Minhas Demandas e DFDs</div>
                    </div>
                  </button>
                  <button
                    onClick={() => handleTrocarPerfil('SETOR_TECNICO')}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-amber-50 flex items-center gap-2 transition"
                  >
                    <Wrench className="w-4 h-4 text-orange-600" />
                    <div>
                      <div className="font-semibold text-slate-800">Setor Técnico (SOBE / STI)</div>
                      <div className="text-[10px] text-slate-500">ETP e Mapa de Riscos</div>
                    </div>
                  </button>
                  <button
                    onClick={() => handleTrocarPerfil('PESQUISA_PRECOS')}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-amber-50 flex items-center gap-2 transition"
                  >
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    <div>
                      <div className="font-semibold text-slate-800">Pesquisa de Preços</div>
                      <div className="text-[10px] text-slate-500">Fila de Cotações</div>
                    </div>
                  </button>
                  <button
                    onClick={() => handleTrocarPerfil('PLANEJAMENTO')}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-amber-50 flex items-center gap-2 transition"
                  >
                    <FileText className="w-4 h-4 text-purple-600" />
                    <div>
                      <div className="font-semibold text-slate-800">Planejamento (TR)</div>
                      <div className="text-[10px] text-slate-500">Elaboração de TR</div>
                    </div>
                  </button>
                  <button
                    onClick={() => handleTrocarPerfil('LICITACOES')}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-amber-50 flex items-center gap-2 transition"
                  >
                    <Scale className="w-4 h-4 text-amber-600" />
                    <div>
                      <div className="font-semibold text-slate-800">Diretor de Licitações (DLC)</div>
                      <div className="text-[10px] text-slate-500">Abertura e Designação</div>
                    </div>
                  </button>
                  <button
                    onClick={() => handleTrocarPerfil('GESTOR_ATA')}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-amber-50 flex items-center gap-2 transition"
                  >
                    <Layers className="w-4 h-4 text-indigo-600" />
                    <div>
                      <div className="font-semibold text-slate-800">Gestão de Atas (ARP)</div>
                      <div className="text-[10px] text-slate-500">Minutas e homologações</div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
