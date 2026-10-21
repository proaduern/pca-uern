import { cookies } from "next/headers";
import { obterSessao } from "@/lib/auth";
import AdminAprovacaoPage from "./AdminAprovacaoPage";
import UnidadeDfdListPage from "./UnidadeDfdListPage";
import SetorInternoHomePage from "./SetorInternoHomePage";
import SetorTecnicoHomePage from "./SetorTecnicoHomePage";
import LicitacoesHomePage from "./LicitacoesHomePage";
import PesquisaPrecosHomePage from "./PesquisaPrecosHomePage";
import PlanejamentoHomePage from "./PlanejamentoHomePage";
import AgenteContratacaoHomePage from "./AgenteContratacaoHomePage";
import ExecucaoHomePage from "./ExecucaoHomePage";
import EntregaHomePage from "./EntregaHomePage";
import GestorAtaHomePage from "./GestorAtaHomePage";
import type { SubsistemaCodigo } from "./Navbar";

export default async function HomePage() {
  const sessao = await obterSessao();
  if (!sessao) return null;

  if (sessao.tipo === "ADMIN") {
    const cookieStore = await cookies();
    const subsistemaAtivo =
      (cookieStore.get("proad_subsistema_ativo")?.value as SubsistemaCodigo | undefined) ?? "PCA";

    if (subsistemaAtivo === "ETP_RISCOS") {
      return <SetorTecnicoHomePage setorTecnicoId={null} />;
    }
    if (subsistemaAtivo === "PESQUISA_PRECOS") {
      return <PesquisaPrecosHomePage />;
    }
    if (subsistemaAtivo === "TERMO_REFERENCIA") {
      return <PlanejamentoHomePage />;
    }
    if (subsistemaAtivo === "LICITACOES_MINUTAS") {
      return <LicitacoesHomePage />;
    }
    return <AdminAprovacaoPage />;
  }
  if (sessao.tipo === "SETOR_INTERNO") {
    return <SetorInternoHomePage setorInternoId={sessao.id} />;
  }
  if (sessao.tipo === "SETOR_TECNICO") {
    return <SetorTecnicoHomePage setorTecnicoId={sessao.id} />;
  }
  if (sessao.tipo === "LICITACOES") {
    return <LicitacoesHomePage />;
  }
  if (sessao.tipo === "PESQUISA_PRECOS") {
    return <PesquisaPrecosHomePage />;
  }
  if (sessao.tipo === "PLANEJAMENTO") {
    return <PlanejamentoHomePage />;
  }
  if (sessao.tipo === "AGENTE_CONTRATACAO") {
    return <AgenteContratacaoHomePage agenteContratacaoId={sessao.id} />;
  }
  if (sessao.tipo === "EXECUCAO") {
    return <ExecucaoHomePage acessoExecucaoId={sessao.id} />;
  }
  if (sessao.tipo === "ENTREGA") {
    return <EntregaHomePage acessoEntregaId={sessao.id} />;
  }
  if (sessao.tipo === "GESTOR_ATA") {
    return <GestorAtaHomePage />;
  }
  return <UnidadeDfdListPage unidadeId={sessao.id} permissoes={sessao.permissoes} />;
}
