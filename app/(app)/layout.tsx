import Link from "next/link";
import { redirect } from "next/navigation";
import { obterSessao } from "@/lib/auth";
import { logoutAction } from "@/lib/actions/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const sessao = await obterSessao();
  if (!sessao) redirect("/login");
  if (sessao.tipo !== "ADMIN" && sessao.senhaTemporaria) redirect("/trocar-senha");

  const linksAdmin = [
    { href: "/", label: "Aprovação de DFDs" },
    { href: "/admin/unidades", label: "Unidades" },
    { href: "/admin/setores-tecnicos", label: "Setores Técnicos" },
    { href: "/admin/pca", label: "PCA" },
    { href: "/admin/categorias", label: "Categorias" },
    { href: "/admin/catalogo", label: "Catálogo" },
    { href: "/admin/parametros", label: "Parâmetros" },
  ];

  const linksUnidade = [{ href: "/", label: "Minhas Demandas" }];
  const linksSetorTecnico = [{ href: "/", label: "Consolidação" }];

  const links =
    sessao.tipo === "ADMIN" ? linksAdmin : sessao.tipo === "UNIDADE" ? linksUnidade : linksSetorTecnico;

  const rotuloPerfil =
    sessao.tipo === "ADMIN" ? "PROAD" : sessao.tipo === "UNIDADE" ? "Unidade demandante" : "Setor técnico";

  return (
    <div className="flex min-h-screen flex-col">
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
