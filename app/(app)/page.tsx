import { obterSessao } from "@/lib/auth";
import AdminAprovacaoPage from "./AdminAprovacaoPage";
import UnidadeDfdListPage from "./UnidadeDfdListPage";
import SetorTecnicoHomePage from "./SetorTecnicoHomePage";
import LicitacoesHomePage from "./LicitacoesHomePage";

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
  return <UnidadeDfdListPage unidadeId={sessao.id} />;
}
