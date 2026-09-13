import { prisma } from "@/lib/prisma";
import { criarUnidadeAction, excluirUnidadeAction } from "@/lib/actions/admin";
import { importarUnidadesAction } from "@/lib/actions/importacao";
import { brl } from "@/lib/formato";
import FormularioSimples from "../FormularioSimples";
import ImportarPlanilhaForm from "../ImportarPlanilhaForm";
import BotaoExcluir from "../BotaoExcluir";
import RedefinirSenhaForm from "./RedefinirSenhaForm";
import AtuarComoBotao from "../AtuarComoBotao";
import { exigirAdminNaPagina } from "@/lib/auth";

export default async function UnidadesPage() {
  await exigirAdminNaPagina();
  const unidades = await prisma.unidade.findMany({ orderBy: { nome: "asc" } });

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-slate-900">Unidades</h1>
      <p className="text-sm text-slate-500">O email de acesso precisa ser do domínio @uern.br.</p>

      <FormularioSimples
        action={criarUnidadeAction}
        titulo="Nova unidade"
        campos={[
          { name: "nome", label: "Nome", required: true },
          { name: "email", label: "Email", type: "email", required: true },
          { name: "senhaInicial", label: "Senha inicial (provisória)", type: "password", required: true },
          { name: "elegivelCotaOP", label: "Elegível para cota OP", checkbox: true },
          { name: "cotaOP", label: "Cota OP (R$)", type: "number" },
          { name: "cotaGeral", label: "Cota Geral (R$)", type: "number" },
          {
            name: "cotaTipo",
            label: "Tipo de cota geral",
            options: [
              { value: "FECHADA", label: "Fechada (valor fixo)" },
              { value: "ABERTA", label: "Aberta (usa saldo do PCA)" },
            ],
          },
          { name: "verCotaGeralPCA", label: "Unidade vê a cota geral do PCA", checkbox: true },
        ]}
      />

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

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Nome</th>
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">OP</th>
              <th className="px-4 py-2 font-medium">Cota Geral</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {unidades.map((u) => (
              <tr key={u.id} className={u.ativa ? "" : "opacity-50"}>
                <td className="px-4 py-2 text-slate-900">{u.nome}</td>
                <td className="px-4 py-2 text-slate-600">{u.email}</td>
                <td className="px-4 py-2 text-slate-600">
                  {u.elegivelCotaOP ? brl(u.cotaOP) : "—"}
                </td>
                <td className="px-4 py-2 text-slate-600">{brl(u.cotaGeral)}</td>
                <td className="px-4 py-2 text-slate-600">{u.ativa ? "Ativa" : "Inativa"}</td>
                <td className="px-4 py-2 space-y-1">
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
