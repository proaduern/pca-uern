import Link from "next/link";
import { redirect } from "next/navigation";
import { obterSessao, obterSessaoReal } from "@/lib/auth";
import { logoutAction } from "@/lib/actions/auth";
import VoltarParaAdminBotao from "./VoltarParaAdminBotao";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const sessao = await obterSessao();
  if (!sessao) redirect("/login");
  const sessaoReal = await obterSessaoReal();
  // "Atuando como": a sessão real é da PROAD, mas a sessão efetiva (a que
  // vale pra tudo) é outra — ver obterSessao()/iniciarAtuarComo em lib/auth.
  const atuandoComo = sessaoReal?.tipo === "ADMIN" && sessao.tipo !== "ADMIN" ? sessaoReal : null;
  // Enquanto a PROAD está "atuando como" outra sessão, não força a troca de
  // senha temporária dessa sessão — evita alterar sem querer a senha de uma
  // unidade/setor/licitação real só por estar navegando como ela.
  if (sessao.tipo !== "ADMIN" && sessao.senhaTemporaria && !atuandoComo) redirect("/trocar-senha");

  const linksAdmin = [
    { href: "/", label: "Aprovação de DFDs" },
    { href: "/admin/demandas", label: "Demandas" },
    { href: "/admin/consolidacao", label: "Consolidação Geral" },
    { href: "/admin/unidades", label: "Unidades" },
    { href: "/admin/setores-tecnicos", label: "Setores Técnicos" },
    { href: "/admin/licitacoes", label: "Licitações" },
    { href: "/admin/pca", label: "PCA" },
    { href: "/admin/categorias", label: "Categorias" },
    { href: "/admin/catalogo", label: "Catálogo" },
    { href: "/admin/solicitacoes", label: "Solicitações de Catálogo" },
    { href: "/admin/parametros", label: "Parâmetros" },
  ];

  const linksUnidade = [{ href: "/", label: "Minhas Demandas" }];
  const linksSetorTecnico = [{ href: "/", label: "Consolidação" }];
  const linksLicitacoes = [{ href: "/", label: "Processos Consolidados" }];

  const LINKS_POR_TIPO = {
    ADMIN: linksAdmin,
    UNIDADE: linksUnidade,
    SETOR_TECNICO: linksSetorTecnico,
    LICITACOES: linksLicitacoes,
  } as const;
  const links = LINKS_POR_TIPO[sessao.tipo];

  const ROTULO_POR_TIPO = {
    ADMIN: "PROAD",
    UNIDADE: "Unidade demandante",
    SETOR_TECNICO: "Setor técnico",
    LICITACOES: "Licitações",
  } as const;
  const rotuloPerfil = ROTULO_POR_TIPO[sessao.tipo];

  return (
    <div className="flex min-h-screen flex-col">
      {atuandoComo && (
        <div className="flex flex-wrap items-center justify-between gap-2 bg-amber-500 px-4 py-2 text-sm text-white">
          <span>
            Atuando como: <b>{sessao.nome}</b> ({rotuloPerfil}) — sessão real: {atuandoComo.nome}
          </span>
          <VoltarParaAdminBotao />
        </div>
      )}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm font-semibold text-slate-900">
              Coleta de Demandas — UERN
            </span>
            <nav className="flex flex-wrap gap-3 text-sm text-slate-600">
              {links.map((l) => (
                <Link key={l.href} href={l.href} className="hover:text-slate-900">
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <span>
              {sessao.nome} · {rotuloPerfil}
            </span>
            <form action={logoutAction}>
              <button className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100">
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
