import { prisma } from "@/lib/prisma";
import { criarSetorTecnicoAction, excluirSetorTecnicoAction } from "@/lib/actions/admin";
import AcessoVinculavelForm from "../AcessoVinculavelForm";
import BotaoExcluir from "../BotaoExcluir";
import RedefinirSenhaSetorForm from "./RedefinirSenhaSetorForm";
import AtuarComoBotao from "../AtuarComoBotao";
import { exigirAdminNaPagina } from "@/lib/auth";

export default async function SetoresTecnicosPage() {
  await exigirAdminNaPagina();
  const [setores, unidades] = await Promise.all([
    prisma.setorTecnico.findMany({
      orderBy: { nome: "asc" },
      include: { categorias: { select: { nome: true } }, unidade: true },
    }),
    prisma.unidade.findMany({ where: { ativa: true }, orderBy: { nome: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-slate-900">Setores Técnicos</h1>
      <p className="text-sm text-slate-500">
        Cada setor técnico consolida os itens dos DFDs aprovados nas categorias atribuídas a ele
        (atribuição feita na tela de Categorias, uma categoria por setor). O acesso pode ter email
        e senha próprios, ou ser vinculado ao login de uma unidade demandante já cadastrada — nesse
        caso, quem entrar com aquele email escolhe o perfil no login.
      </p>

      <AcessoVinculavelForm action={criarSetorTecnicoAction} titulo="Novo setor técnico" unidades={unidades} />

      <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Nome</th>
              <th className="px-4 py-2 font-medium">Login</th>
              <th className="px-4 py-2 font-medium">Categorias</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {setores.map((s) => (
              <tr key={s.id} className={s.ativo ? "" : "opacity-50"}>
                <td className="px-4 py-2 text-slate-900">{s.nome}</td>
                <td className="px-4 py-2 text-slate-600">
                  {s.vinculado ? (
                    <>
                      {s.unidade?.email}{" "}
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">
                        vinculado a {s.unidade?.nome}
                      </span>
                    </>
                  ) : (
                    s.email
                  )}
                </td>
                <td className="px-4 py-2 text-slate-600">
                  {s.categorias.map((c) => c.nome).join(", ") || "—"}
                </td>
                <td className="px-4 py-2 text-slate-600">{s.ativo ? "Ativo" : "Inativo"}</td>
                <td className="px-4 py-2 space-y-1">
                  {!s.vinculado && <RedefinirSenhaSetorForm setorTecnicoId={s.id} />}
                  <AtuarComoBotao tipo="SETOR_TECNICO" id={s.id} />
                  <BotaoExcluir action={excluirSetorTecnicoAction} id={s.id} />
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
