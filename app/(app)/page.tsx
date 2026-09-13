import { obterSessao } from "@/lib/auth";
import AdminAprovacaoPage from "./AdminAprovacaoPage";
import UnidadeDfdListPage from "./UnidadeDfdListPage";
import SetorTecnicoHomePage from "./SetorTecnicoHomePage";
import LicitacoesHomePage from "./LicitacoesHomePage";
import ExecucaoHomePage from "./ExecucaoHomePage";
import EntregaHomePage from "./EntregaHomePage";

export default async function HomePage() {
  const sessao = await obterSessao();
  if (!sessao) return null;

  if (sessao.tipo === "ADMIN") {
    return <AdminAprovacaoPage />;
  }
  if (sessao.tipo === "SETOR_TECNICO") {
    return <SetorTecnicoHomePage setorTecnicoId={sessao.id} />;
  }
  if (sessao.tipo === "LICITACOES") {
    return <LicitacoesHomePage />;
  }
  if (sessao.tipo === "EXECUCAO") {
    return <ExecucaoHomePage acessoExecucaoId={sessao.id} />;
  }
  if (sessao.tipo === "ENTREGA") {
    return <EntregaHomePage acessoEntregaId={sessao.id} />;
  }
  return <UnidadeDfdListPage unidadeId={sessao.id} />;
}
