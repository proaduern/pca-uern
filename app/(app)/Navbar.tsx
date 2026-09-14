"use client";

import { useState } from "react";
import Link from "next/link";
import { LogOut, User as UserIcon, ChevronDown, CalendarRange } from "lucide-react";
import { logoutAction } from "@/lib/actions/auth";
import type { TipoSessao } from "@/lib/auth";

const ROTULO_POR_TIPO: Record<TipoSessao, string> = {
  ADMIN: "PROAD",
  UNIDADE: "Unidade demandante",
  SETOR_TECNICO: "Setor técnico",
  LICITACOES: "Licitações",
  EXECUCAO: "Execução",
  ENTREGA: "Entrega de Bens",
  GESTOR_ATA: "Gestão de Ata",
};

export default function Navbar({
  nome,
  tipo,
  pcaAtuacao,
}: {
  nome: string;
  tipo: TipoSessao;
  pcaAtuacao?: { ano: number; podeTrocar: boolean } | null;
}) {
  const [aberto, setAberto] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-16 flex-shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm md:px-8">
      <div className="flex items-center space-x-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#003366] text-sm font-bold text-white shadow">
          U
        </div>
        <div>
          <span className="block text-sm font-bold leading-tight text-slate-800 md:text-base">
            Sistema PCA UERN
          </span>
          <span className="block text-[10px] font-medium uppercase tracking-wide text-slate-400">
            Coleta, gestão e acompanhamento de demandas de bens e serviços da UERN
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-3">
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
                {ROTULO_POR_TIPO[tipo]}
              </div>
            </div>
            <ChevronDown className="hidden h-4 w-4 text-slate-400 md:block" />
          </button>

          {aberto && (
            <div
              onMouseLeave={() => setAberto(false)}
              className="absolute right-0 z-50 mt-2 w-56 rounded-2xl border border-slate-100 bg-white py-2 shadow-xl"
            >
              <div className="border-b border-slate-100 px-4 py-2.5">
                <p className="truncate text-xs font-semibold text-slate-800">{nome}</p>
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
