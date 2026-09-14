import { redirect } from "next/navigation";
import { obterSessao, obterSessaoReal } from "@/lib/auth";
import { resolverPcaEmAtuacao } from "@/lib/pca-contexto";
import VoltarParaAdminBotao from "./VoltarParaAdminBotao";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

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

  // Com mais de um PCA ativo ao mesmo tempo (ex.: o do ano corrente ainda em
  // execução e o do ano seguinte já em coleta), a unidade/setor técnico
  // precisa dizer em qual está atuando antes de ver demandas ou lançar novas.
  let contextoPca: Awaited<ReturnType<typeof resolverPcaEmAtuacao>> | null = null;
  if (sessao.tipo === "UNIDADE" || sessao.tipo === "SETOR_TECNICO") {
    contextoPca = await resolverPcaEmAtuacao(sessao);
    if (contextoPca.status === "precisa_escolher") redirect("/selecionar-pca");
  }

  const linksAdmin = [
    { href: "/", label: "Aprovação de DFDs" },
    { href: "/admin/demandas", label: "Demandas" },
    { href: "/admin/consolidacao", label: "Consolidação Geral" },
    { href: "/admin/unidades", label: "Unidades" },
    { href: "/admin/setores-tecnicos", label: "Setores Técnicos" },
    { href: "/admin/licitacoes", label: "Licitações" },
    { href: "/admin/execucao", label: "Execução" },
    { href: "/admin/entrega", label: "Entrega de Bens" },
    { href: "/admin/gestor-ata", label: "Gestão de Ata" },
    { href: "/admin/pca", label: "PCA" },
    { href: "/admin/categorias", label: "Categorias" },
    { href: "/admin/catalogo", label: "Catálogo" },
    { href: "/admin/solicitacoes", label: "Solicitações de Catálogo" },
    { href: "/admin/parametros", label: "Parâmetros" },
  ];

  const linksUnidade = [{ href: "/", label: "Minhas Demandas" }];
  const linksSetorTecnico = [{ href: "/", label: "Consolidação" }];
  const linksLicitacoes = [{ href: "/", label: "Processos Consolidados" }];
  const linksExecucao = [{ href: "/", label: "Execução" }];
  const linksEntrega = [{ href: "/", label: "Entrega de Bens" }];
  const linksGestorAta = [{ href: "/", label: "Gestão de Ata" }];

  const LINKS_POR_TIPO = {
    ADMIN: linksAdmin,
    UNIDADE: linksUnidade,
    SETOR_TECNICO: linksSetorTecnico,
    LICITACOES: linksLicitacoes,
    EXECUCAO: linksExecucao,
    ENTREGA: linksEntrega,
    GESTOR_ATA: linksGestorAta,
  } as const;
  const links = LINKS_POR_TIPO[sessao.tipo];

  const ROTULO_POR_TIPO = {
    ADMIN: "PROAD",
    UNIDADE: "Unidade demandante",
    SETOR_TECNICO: "Setor técnico",
    LICITACOES: "Licitações",
    EXECUCAO: "Execução",
    ENTREGA: "Entrega de Bens",
    GESTOR_ATA: "Gestão de Ata",
  } as const;
  const rotuloPerfil = ROTULO_POR_TIPO[sessao.tipo];

  return (
    <div className="min-h-screen bg-slate-50">
      {atuandoComo && (
        <div className="flex flex-wrap items-center justify-between gap-2 bg-amber-500 px-4 py-2 text-sm text-white">
          <span>
            Atuando como: <b>{sessao.nome}</b> ({rotuloPerfil}) — sessão real: {atuandoComo.nome}
          </span>
          <VoltarParaAdminBotao />
        </div>
      )}
      <Navbar
        nome={sessao.nome}
        tipo={sessao.tipo}
        pcaAtuacao={
          contextoPca?.status === "resolvido"
            ? { ano: contextoPca.pca.ano, podeTrocar: contextoPca.totalAtivos > 1 }
            : null
        }
      />
      <div className="flex">
        <Sidebar links={links} tipo={sessao.tipo} />
        <main className="min-w-0 flex-1 px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
