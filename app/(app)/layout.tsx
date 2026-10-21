import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { obterSessao, obterSessaoReal } from "@/lib/auth";
import { resolverPcaEmAtuacao } from "@/lib/pca-contexto";
import VoltarParaAdminBotao from "./VoltarParaAdminBotao";
import Sidebar from "./Sidebar";
import Navbar, { type SubsistemaCodigo } from "./Navbar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessao = await obterSessao();
  if (!sessao) redirect("/login");
  const sessaoReal = await obterSessaoReal();
  const atuandoComo =
    sessaoReal?.tipo === "ADMIN" && sessao.tipo !== "ADMIN" ? sessaoReal : null;
  if (sessao.tipo !== "ADMIN" && sessao.senhaTemporaria && !atuandoComo)
    redirect("/trocar-senha");

  let contextoPca: Awaited<ReturnType<typeof resolverPcaEmAtuacao>> | null =
    null;
  if (
    sessao.tipo === "UNIDADE" ||
    sessao.tipo === "SETOR_INTERNO" ||
    sessao.tipo === "SETOR_TECNICO"
  ) {
    contextoPca = await resolverPcaEmAtuacao(sessao);
    if (contextoPca.status === "precisa_escolher") redirect("/selecionar-pca");
  }

  // Determina o subsistema ativo
  const cookieStore = await cookies();
  const cookieSub = cookieStore.get("proad_subsistema_ativo")?.value as SubsistemaCodigo | undefined;

  let subsistemaAtivo: SubsistemaCodigo = "PCA";
  if (sessao.tipo === "SETOR_TECNICO") subsistemaAtivo = "ETP_RISCOS";
  else if (sessao.tipo === "PESQUISA_PRECOS") subsistemaAtivo = "PESQUISA_PRECOS";
  else if (sessao.tipo === "PLANEJAMENTO") subsistemaAtivo = "TERMO_REFERENCIA";
  else if (
    sessao.tipo === "LICITACOES" ||
    sessao.tipo === "AGENTE_CONTRATACAO" ||
    sessao.tipo === "GESTOR_ATA"
  ) {
    subsistemaAtivo = "LICITACOES_MINUTAS";
  } else if (sessao.tipo === "ADMIN" && cookieSub) {
    subsistemaAtivo = cookieSub;
  }

  //Menus particionados da PROAD conforme o Subsistema ativo
  const linksAdminPorSubsistema: Record<SubsistemaCodigo, { href: string; label: string }[]> = {
    PCA: [
      { href: "/", label: "Aprovação de DFDs" },
      { href: "/admin/demandas", label: "Demandas" },
      { href: "/admin/pca", label: "PCA e Publicação PNCP" },
      { href: "/admin/unidades", label: "Unidades Demandantes" },
      { href: "/admin/usuarios", label: "Usuários das Unidades" },
      { href: "/admin/categorias", label: "Categorias e Competências" },
      { href: "/admin/catalogo", label: "Catálogo de Itens" },
      { href: "/admin/solicitacoes", label: "Solicitações de Catálogo" },
      { href: "/admin/solicitacoes-cota-geral", label: "Solicitações de Cota Geral (OP)" },
      { href: "/admin/contratos-sgc", label: "Contratos Vigentes (SGC)" },
      { href: "/admin/parametros", label: "Parâmetros do PCA" },
    ],
    ETP_RISCOS: [
      { href: "/admin/consolidacao", label: "Consolidação Técnica, ETP e Riscos" },
      { href: "/admin/setores-tecnicos", label: "Setores Técnicos (STI, Patrimônio, SOBE, DAS...)" },
      { href: "/admin/categorias", label: "Categorias por Competência" },
    ],
    PESQUISA_PRECOS: [
      { href: "/admin/pesquisa-precos", label: "Fila de Pesquisa de Preços" },
      { href: "/admin/consolidacao", label: "Processos e Itens Consolidados" },
    ],
    TERMO_REFERENCIA: [
      { href: "/admin/planejamento", label: "Fila de Termo de Referência (Planejamento)" },
      { href: "/admin/consolidacao", label: "Processos, ETPs e Pesquisas" },
    ],
    LICITACOES_MINUTAS: [
      { href: "/admin/licitacoes", label: "Minutas, Fase Jurídica (PGE) e Homologação" },
      { href: "/admin/agentes-contratacao", label: "Agentes de Contratação" },
      { href: "/admin/gestor-ata", label: "Minutas e Gestão de Atas (ARP)" },
      { href: "/admin/consolidacao", label: "Todos os Processos Licitatórios" },
    ],
  };

  const linksUnidade = [
    { href: "/", label: "Minhas Demandas" },
    ...(sessao.permissoes?.podeEditarDadosUnidade !== false
      ? [{ href: "/dados-unidade", label: "Dados da Unidade" }]
      : []),
  ];
  const linksSetorInterno = [{ href: "/", label: "Minhas Demandas" }];
  const linksSetorTecnico = [{ href: "/", label: "Consolidação, ETP e Mapa de Riscos" }];
  const linksLicitacoes = [{ href: "/", label: "Minutas, Fase Jurídica e Homologação" }];
  const linksPesquisaPrecos = [{ href: "/", label: "Fila de Pesquisa de Preços" }];
  const linksPlanejamento = [{ href: "/", label: "Fila de Termo de Referência (TR)" }];
  const linksAgenteContratacao = [{ href: "/", label: "Minuta de Edital e Homologação" }];
  const linksExecucao = [{ href: "/", label: "Execução" }];
  const linksEntrega = [{ href: "/", label: "Entrega de Bens" }];
  const linksGestorAta = [{ href: "/", label: "Minutas e Gestão de Atas (ARP)" }];

  const LINKS_POR_TIPO = {
    ADMIN: linksAdminPorSubsistema[subsistemaAtivo] ?? linksAdminPorSubsistema.PCA,
    UNIDADE: linksUnidade,
    SETOR_INTERNO: linksSetorInterno,
    SETOR_TECNICO: linksSetorTecnico,
    LICITACOES: linksLicitacoes,
    PESQUISA_PRECOS: linksPesquisaPrecos,
    PLANEJAMENTO: linksPlanejamento,
    AGENTE_CONTRATACAO: linksAgenteContratacao,
    EXECUCAO: linksExecucao,
    ENTREGA: linksEntrega,
    GESTOR_ATA: linksGestorAta,
  } as const;
  const links = LINKS_POR_TIPO[sessao.tipo];

  const ROTULO_POR_TIPO = {
    ADMIN: "PROAD",
    UNIDADE: "Unidade demandante",
    SETOR_INTERNO: "Setor interno",
    SETOR_TECNICO: "Setor técnico",
    LICITACOES: "Licitações",
    PESQUISA_PRECOS: "Pesquisa de Preços",
    PLANEJAMENTO: "Planejamento",
    AGENTE_CONTRATACAO: "Agente de Contratação",
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
            Atuando como: <b>{sessao.nome}</b> ({rotuloPerfil}) — sessão real:{" "}
            {atuandoComo.nome}
          </span>
          <VoltarParaAdminBotao />
        </div>
      )}
      <Navbar
        nome={sessao.nome}
        tipo={sessao.tipo}
        subtitulo={sessao.unidadeNome ?? null}
        subsistemaAtivo={subsistemaAtivo}
        pcaAtuacao={
          contextoPca?.status === "resolvido"
            ? {
                ano: contextoPca.pca.ano,
                podeTrocar: contextoPca.totalAtivos > 1,
              }
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
