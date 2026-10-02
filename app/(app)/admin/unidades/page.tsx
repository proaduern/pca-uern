import { prisma } from "@/lib/prisma";
import { excluirUnidadeAction } from "@/lib/actions/admin";
import { importarUnidadesAction } from "@/lib/actions/importacao";
import { brl } from "@/lib/formato";
import NovaUnidadeForm from "./NovaUnidadeForm";
import EditarUnidadeForm from "./EditarUnidadeForm";
import ImportarPlanilhaForm from "../ImportarPlanilhaForm";
import BotaoExcluir from "../BotaoExcluir";
import RedefinirSenhaForm from "./RedefinirSenhaForm";
import AtuarComoBotao from "../AtuarComoBotao";
import { exigirAdminNaPagina } from "@/lib/auth";

import Link from "next/link";
import { Users } from "lucide-react";

export default async function UnidadesPage() {
  await exigirAdminNaPagina();
  const unidades = await prisma.unidade.findMany({
    orderBy: { nome: "asc" },
    include: {
      _count: {
        select: { usuarios: true },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Unidades</h1>
          <p className="text-sm text-slate-500">
            Unidades gestoras e demandantes cadastradas no sistema.
          </p>
        </div>
        <Link
          href="/admin/usuarios"
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-[#003366] shadow-xs hover:bg-slate-50 transition"
        >
          <Users className="h-4 w-4" />
          <span>Ver Usuários das Unidades</span>
        </Link>
      </div>

      <NovaUnidadeForm />

      <ImportarPlanilhaForm
        action={importarUnidadesAction}
        titulo="Importar unidades em lote (planilha)"
        colunas={[
          "nome",
          "email",
          "senhaInicial",
          "elegivelCotaOP (sim/não)",
          "cotaOP",
          "cotaGeral",
          "cotaTipo (FECHADA/ABERTA)",
          "verCotaGeralPCA (sim/não)",
        ]}
        modeloHref="/modelos/unidades.csv"
      />

      <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Nome</th>
              <th className="px-4 py-2 font-medium">Usuários</th>
              <th className="px-4 py-2 font-medium">Email da Unidade</th>
              <th className="px-4 py-2 font-medium">OP</th>
              <th className="px-4 py-2 font-medium">Cota Geral</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {unidades.map((u) => (
              <tr key={u.id} className={u.ativa ? "" : "opacity-50"}>
                <td className="px-4 py-2 font-medium text-slate-900">{u.nome}</td>
                <td className="px-4 py-2">
                  <Link
                    href={`/admin/usuarios?unidadeId=${u.id}`}
                    className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-[#003366] hover:bg-blue-100 transition"
                    title={`Ver ${u._count.usuarios} usuário(s) desta unidade`}
                  >
                    <Users className="h-3 w-3" />
                    <span>{u._count.usuarios} usuário(s)</span>
                  </Link>
                </td>
                <td className="px-4 py-2 text-slate-600">{u.email}</td>
                <td className="px-4 py-2 text-slate-600">
                  {u.elegivelCotaOP ? brl(u.cotaOP) : "—"}
                </td>
                <td className="px-4 py-2 text-slate-600">{brl(u.cotaGeral)}</td>
                <td className="px-4 py-2 text-slate-600">{u.ativa ? "Ativa" : "Inativa"}</td>
                <td className="px-4 py-2 space-y-1">
                  <EditarUnidadeForm
                    unidade={{
                      id: u.id,
                      nome: u.nome,
                      email: u.email,
                      elegivelCotaOP: u.elegivelCotaOP,
                      cotaOP: Number(u.cotaOP),
                      cotaGeral: Number(u.cotaGeral),
                      cotaTipo: u.cotaTipo,
                      verCotaGeralPCA: u.verCotaGeralPCA,
                      responsavelNome: u.responsavelNome,
                      responsavelMatricula: u.responsavelMatricula,
                      responsavelTelefone: u.responsavelTelefone,
                    }}
                  />
                  <RedefinirSenhaForm unidadeId={u.id} />
                  <AtuarComoBotao tipo="UNIDADE" id={u.id} />
                  <BotaoExcluir action={excluirUnidadeAction} id={u.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
