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

export default async function HomePage() {
  const sessao = await obterSessao();
  if (!sessao) return null;

  if (sessao.tipo === "ADMIN") {
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
    return <AgenteContratacaoHomePage />;
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
  return <UnidadeDfdListPage unidadeId={sessao.id} />;
}
