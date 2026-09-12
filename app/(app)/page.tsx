import { obterSessao } from "@/lib/auth";
import AdminAprovacaoPage from "./AdminAprovacaoPage";
import UnidadeDfdListPage from "./UnidadeDfdListPage";

export default async function HomePage() {
  const sessao = await obterSessao();
  if (!sessao) return null;

  if (sessao.tipo === "ADMIN") {
    return <AdminAprovacaoPage />;
  }
  return <UnidadeDfdListPage unidadeId={sessao.id} />;
}
