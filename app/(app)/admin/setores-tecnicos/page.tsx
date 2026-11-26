import { prisma } from "@/lib/prisma";
import { excluirSetorTecnicoAction } from "@/lib/actions/admin";
import BotaoExcluir from "../BotaoExcluir";
import RedefinirSenhaSetorForm from "./RedefinirSenhaSetorForm";
import AtuarComoBotao from "../AtuarComoBotao";
import { exigirAdminNaPagina } from "@/lib/auth";
import AdicionarSetorTecnicoForm from "./AdicionarSetorTecnicoForm";
import AlternarStatusSetorBotao from "./AlternarStatusSetorBotao";
import Link from "next/link";
import { Building2, Layers } from "lucide-react";

export const metadata = {
  title: "Setores Técnicos | PCA UERN",
};

export default async function SetoresTecnicosPage() {
  await exigirAdminNaPagina();
  const [setores, todasUnidades] = await Promise.all([
    prisma.setorTecnico.findMany({
      orderBy: { nome: "asc" },
      include: {
        categorias: { select: { id: true, nome: true }, orderBy: { nome: "asc" } },
        unidade: { select: { id: true, nome: true, email: true } },
      },
    }),
    prisma.unidade.findMany({
      where: { ativa: true },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, email: true },
    }),
  ]);

  const unidadesEmUsoIds = new Set(
    setores.filter((s) => s.ativo && s.unidadeId).map((s) => s.unidadeId)
  );
  const unidadesDisponiveis = todasUnidades.filter(
    (u) => !unidadesEmUsoIds.has(u.id)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Setores Técnicos</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Setores e comitês da UERN responsáveis pela análise técnica, compilação de demandas por categoria, ETP e Mapa de Riscos.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/categorias"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-[#003366] shadow-xs hover:bg-slate-50 transition"
          >
            <Layers className="h-4 w-4" />
            <span>Ver Categorias por Competência</span>
          </Link>
          <Link
            href="/admin/unidades"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-[#003366] shadow-xs hover:bg-slate-50 transition"
          >
            <Building2 className="h-4 w-4" />
            <span>Unidades Demandantes</span>
          </Link>
        </div>
      </div>

      <AdicionarSetorTecnicoForm unidadesDisponiveis={unidadesDisponiveis} />

      <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Nome do Setor Técnico</th>
              <th className="px-4 py-3 font-medium">Unidade / Login Oficial</th>
              <th className="px-4 py-3 font-medium">Categorias Atribuídas</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {setores.map((s) => (
              <tr key={s.id} className={s.ativo ? "" : "opacity-60 bg-slate-50/50"}>
                <td className="px-4 py-3 font-semibold text-slate-900">{s.nome}</td>
                <td className="px-4 py-3 text-slate-600">
                  {s.vinculado && s.unidade ? (
                    <div>
                      <span className="font-medium text-slate-900">{s.unidade.email}</span>
                      <div className="text-xs text-slate-500">
                        vinculado a <span className="font-medium text-slate-700">{s.unidade.nome}</span>
                      </div>
                    </div>
                  ) : (
                    <span>{s.email || "—"}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {s.categorias.length > 0 ? (
                    <div>
                      <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-[#003366]">
                        {s.categorias.length} categoria(s)
                      </span>
                      <p className="mt-1 text-xs text-slate-500 max-w-md line-clamp-2">
                        {s.categorias.map((c) => c.nome).join(", ")}
                      </p>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 italic">Nenhuma categoria atribuída</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <AlternarStatusSetorBotao id={s.id} ativo={s.ativo} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <AtuarComoBotao tipo="SETOR_TECNICO" id={s.id} />
                    {!s.vinculado && <RedefinirSenhaSetorForm setorTecnicoId={s.id} />}
                    <BotaoExcluir
                      action={excluirSetorTecnicoAction}
                      id={s.id}
                      confirmMessage={`Tem certeza que deseja remover "${s.nome}" da lista de Setores Técnicos?`}
                    />
                  </div>
                </td>
              </tr>
            ))}
            {setores.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  Nenhum setor técnico cadastrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
