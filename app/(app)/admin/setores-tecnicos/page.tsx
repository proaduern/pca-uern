import { prisma } from "@/lib/prisma";
import { criarSetorTecnicoAction, excluirSetorTecnicoAction } from "@/lib/actions/admin";
import FormularioSimples from "../FormularioSimples";
import BotaoExcluir from "../BotaoExcluir";
import RedefinirSenhaSetorForm from "./RedefinirSenhaSetorForm";

export default async function SetoresTecnicosPage() {
  const setores = await prisma.setorTecnico.findMany({
    orderBy: { nome: "asc" },
    include: { categorias: { select: { nome: true } } },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-slate-900">Setores Técnicos</h1>
      <p className="text-sm text-slate-500">
        Cada setor técnico consolida os itens dos DFDs aprovados nas categorias atribuídas a ele
        (atribuição feita na tela de Categorias). O email de acesso precisa ser do domínio
        @uern.br.
      </p>

      <FormularioSimples
        action={criarSetorTecnicoAction}
        titulo="Novo setor técnico"
        campos={[
          { name: "nome", label: "Nome", required: true },
          { name: "email", label: "Email", type: "email", required: true },
          { name: "senhaInicial", label: "Senha inicial (provisória)", type: "password", required: true },
        ]}
      />

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Nome</th>
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">Categorias</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {setores.map((s) => (
              <tr key={s.id} className={s.ativo ? "" : "opacity-50"}>
                <td className="px-4 py-2 text-slate-900">{s.nome}</td>
                <td className="px-4 py-2 text-slate-600">{s.email}</td>
                <td className="px-4 py-2 text-slate-600">
                  {s.categorias.map((c) => c.nome).join(", ") || "—"}
                </td>
                <td className="px-4 py-2 text-slate-600">{s.ativo ? "Ativo" : "Inativo"}</td>
                <td className="px-4 py-2 space-y-1">
                  <RedefinirSenhaSetorForm setorTecnicoId={s.id} />
                  <BotaoExcluir action={excluirSetorTecnicoAction} id={s.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
