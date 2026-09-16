"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Users,
  Briefcase,
  Layers,
  BookOpen,
  BarChart3,
  Building2,
  FileSpreadsheet,
  PackageCheck,
  Tags,
  ClipboardList,
  Inbox,
  Settings,
  UserCog,
} from "lucide-react";
import type { TipoSessao } from "@/lib/auth";

const ICONE_POR_HREF: Record<string, typeof LayoutDashboard> = {
  "/": LayoutDashboard,
  "/admin/demandas": FileText,
  "/admin/consolidacao": Layers,
  "/admin/unidades": Building2,
  "/admin/setores-tecnicos": Users,
  "/admin/licitacoes": Briefcase,
  "/admin/execucao": FileSpreadsheet,
  "/admin/entrega": PackageCheck,
  "/admin/gestor-ata": BookOpen,
  "/admin/pca": BarChart3,
  "/admin/categorias": Tags,
  "/admin/catalogo": ClipboardList,
  "/admin/solicitacoes": Inbox,
  "/admin/parametros": Settings,
  "/dados-unidade": UserCog,
};

export default function Sidebar({
  links,
  tipo,
}: {
  links: { href: string; label: string }[];
  tipo: TipoSessao;
}) {
  const pathname = usePathname();

  return (
    <aside className="w-64 flex-shrink-0 border-r border-slate-800 bg-slate-900 text-slate-300 min-h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex-1 space-y-1 p-4">
        <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          {tipo === "ADMIN" ? "Módulos do Sistema" : "Menu"}
        </div>
        {links.map((link) => {
          const Icone = ICONE_POR_HREF[link.href] ?? FileText;
          const ativo = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center space-x-3 rounded-xl px-3 py-2.5 text-xs font-medium transition-all ${
                ativo
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                  : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
              }`}
            >
              <Icone className={`h-4 w-4 ${ativo ? "text-white" : "text-slate-400"}`} />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </div>
      <div className="m-3 space-y-1 rounded-2xl border border-slate-800 bg-slate-800/50 p-4 text-[11px] text-slate-400">
        <div className="flex items-center space-x-1.5 font-semibold text-slate-200">
          <Building2 className="h-3.5 w-3.5 text-blue-400" />
          <span>PROAD / UERN</span>
        </div>
        <p className="text-[10px] leading-snug text-slate-400">Plano de Contratações Anual</p>
      </div>
    </aside>
  );
}
