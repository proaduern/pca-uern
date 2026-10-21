"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, User as UserIcon, ChevronDown, CalendarRange, Layers } from "lucide-react";
import { logoutAction } from "@/lib/actions/auth";
import type { TipoSessao } from "@/lib/auth";

export type SubsistemaCodigo =
  | "PCA"
  | "ETP_RISCOS"
  | "PESQUISA_PRECOS"
  | "TERMO_REFERENCIA"
  | "LICITACOES_MINUTAS";

export const INFO_SUBSISTEMA: Record<
  SubsistemaCodigo,
  { sigla: string; titulo: string; subtitulo: string; badge: string; rotaInicialAdmin: string }
> = {
  PCA: {
    sigla: "PCA",
    titulo: "Subsistema PCA UERN",
    subtitulo: "Coleta de DFDs, Consolidação, Publicação no PNCP e Acompanhamento Item por Item",
    badge: "Subsistema 01 • PCA",
    rotaInicialAdmin: "/",
  },
  ETP_RISCOS: {
    sigla: "ETP",
    titulo: "Subsistema de ETP e Mapa de Riscos",
    subtitulo: "Consolidação Técnica por Competência, Estudo Técnico Preliminar e Gestão de Riscos",
    badge: "Subsistema 02 • Setor Técnico",
    rotaInicialAdmin: "/admin/consolidacao",
  },
  PESQUISA_PRECOS: {
    sigla: "PP",
    titulo: "Subsistema de Pesquisa de Preços",
    subtitulo: "Cotação Referencial de Mercado sobre a Lista Consolidada no ETP",
    badge: "Subsistema 03 • Pesquisa",
    rotaInicialAdmin: "/admin/pesquisa-precos",
  },
  TERMO_REFERENCIA: {
    sigla: "TR",
    titulo: "Subsistema de Termo de Referência (TR)",
    subtitulo: "Planejamento da Contratação com Herança Automática do ETP e Pesquisa de Preços",
    badge: "Subsistema 04 • Planejamento",
    rotaInicialAdmin: "/admin/planejamento",
  },
  LICITACOES_MINUTAS: {
    sigla: "LIC",
    titulo: "Subsistema de Minutas, Fase Jurídica e Licitações",
    subtitulo: "Minutas (Edital/Contrato/Ata), Análise AJUR/PGE, Edital Definitivo, PNCP e Homologação Real",
    badge: "Subsistema 05 • Licitações",
    rotaInicialAdmin: "/admin/licitacoes",
  },
};

const ROTULO_POR_TIPO: Record<TipoSessao, string> = {
  ADMIN: "PROAD",
  UNIDADE: "Unidade demandante",
  SETOR_INTERNO: "Setor interno",
  SETOR_TECNICO: "Setor técnico (ETP/Riscos)",
  LICITACOES: "Licitações e Contratos",
  PESQUISA_PRECOS: "Pesquisa de Preços",
  PLANEJAMENTO: "Planejamento (TR)",
  AGENTE_CONTRATACAO: "Agente de Contratação",
  EXECUCAO: "Execução",
  ENTREGA: "Entrega de Bens",
  GESTOR_ATA: "Gestão de Atas (ARP)",
};

export default function Navbar({
  nome,
  tipo,
  subtitulo,
  pcaAtuacao,
  subsistemaAtivo = "PCA",
}: {
  nome: string;
  tipo: TipoSessao;
  subtitulo?: string | null;
  pcaAtuacao?: { ano: number; podeTrocar: boolean } | null;
  subsistemaAtivo?: SubsistemaCodigo;
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const infoSub = INFO_SUBSISTEMA[subsistemaAtivo] ?? INFO_SUBSISTEMA.PCA;

  function trocarSubsistemaAdmin(novo: SubsistemaCodigo) {
    document.cookie = `proad_subsistema_ativo=${novo}; path=/; max-age=${60 * 60 * 8}; SameSite=Lax`;
    router.push(INFO_SUBSISTEMA[novo].rotaInicialAdmin);
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 flex-shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm md:px-8">
      <div className="flex items-center space-x-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#003366] text-xs font-extrabold text-white shadow">
          {infoSub.sigla}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="block text-sm font-bold leading-tight text-slate-800 md:text-base">
              {infoSub.titulo}
            </span>
            <span className="hidden rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-[#003366] sm:inline-block">
              {infoSub.badge}
            </span>
          </div>
          <span className="block text-[10px] font-medium uppercase tracking-wide text-slate-400">
            {infoSub.subtitulo}
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        {tipo === "ADMIN" && (
          <div className="hidden lg:flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1">
            <Layers className="h-3.5 w-3.5 text-[#003366]" />
            <span className="text-[11px] font-semibold text-slate-600">Subsistema:</span>
            <select
              value={subsistemaAtivo}
              onChange={(e) => trocarSubsistemaAdmin(e.target.value as SubsistemaCodigo)}
              className="bg-transparent text-xs font-bold text-[#003366] focus:outline-none cursor-pointer"
            >
              <option value="PCA">01 • PCA (Coleta & PNCP)</option>
              <option value="ETP_RISCOS">02 • ETP e Mapa de Riscos</option>
              <option value="PESQUISA_PRECOS">03 • Pesquisa de Preços</option>
              <option value="TERMO_REFERENCIA">04 • Termo de Referência (TR)</option>
              <option value="LICITACOES_MINUTAS">05 • Minutas, PGE e Licitações</option>
            </select>
          </div>
        )}

        {pcaAtuacao &&
          (pcaAtuacao.podeTrocar ? (
            <Link
              href="/selecionar-pca"
              className="flex items-center space-x-1.5 rounded-xl border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100"
              title="Trocar o PCA em que você está atuando"
            >
              <CalendarRange className="h-3.5 w-3.5" />
              <span>PCA {pcaAtuacao.ano}</span>
              <ChevronDown className="h-3 w-3" />
            </Link>
          ) : (
            <span className="flex items-center space-x-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
              <CalendarRange className="h-3.5 w-3.5" />
              <span>PCA {pcaAtuacao.ano}</span>
            </span>
          ))}

        <div className="relative">
          <button
            onClick={() => setAberto((v) => !v)}
            className="flex cursor-pointer items-center space-x-3 rounded-xl p-1.5 text-left transition-colors hover:bg-slate-100"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-blue-200 bg-blue-100 text-[#003366]">
              <UserIcon className="h-4 w-4" />
            </div>
            <div className="hidden md:block">
              <div className="text-xs font-bold leading-tight text-slate-800">{nome}</div>
              <div className="mt-0.5 text-[11px] font-medium leading-tight text-blue-600">
                {subtitulo ? `${subtitulo} • ${ROTULO_POR_TIPO[tipo]}` : ROTULO_POR_TIPO[tipo]}
              </div>
            </div>
            <ChevronDown className="hidden h-4 w-4 text-slate-400 md:block" />
          </button>

          {aberto && (
            <div
              onMouseLeave={() => setAberto(false)}
              className="absolute right-0 z-50 mt-2 w-64 rounded-2xl border border-slate-100 bg-white py-2 shadow-xl"
            >
              <div className="border-b border-slate-100 px-4 py-2.5">
                <p className="truncate text-xs font-semibold text-slate-800">{nome}</p>
                {subtitulo && (
                  <p className="mt-0.5 truncate text-[11px] text-slate-500">{subtitulo}</p>
                )}
                <span className="mt-1.5 inline-block rounded-md border border-blue-100 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                  {ROTULO_POR_TIPO[tipo]}
                </span>
              </div>
              <form action={logoutAction} className="py-1">
                <button className="flex w-full cursor-pointer items-center space-x-2 px-4 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50">
                  <LogOut className="h-4 w-4" />
                  <span>Encerrar Sessão</span>
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
