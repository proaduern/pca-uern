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
  if (sessao.tipo === "EXECUCAO" || sessao.tipo === "ENTREGA") {
    return (
      <div className="mx-auto max-w-2xl mt-12 p-8 bg-white border border-blue-200 rounded-2xl shadow-sm text-center space-y-4">
        <div className="w-12 h-12 bg-blue-50 text-blue-700 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
          SGC
        </div>
        <h2 className="text-lg font-bold text-slate-800">
          Módulo de Execução e Entrega Migrado para o SGC
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          A emissão de ordens de compra, acompanhamento de prazos, remessa ao fornecedor e conferência/entrega de bens e materiais agora são operadas exclusivamente no <strong>Sistema de Gestão de Contratos e Execução (SGC)</strong>.
        </p>
        <div className="pt-2">
          <a
            href="https://sgc-uern.vercel.app/execucao"
            className="inline-flex items-center px-5 py-2.5 bg-[#003366] text-white text-xs font-bold rounded-xl hover:bg-[#002244] shadow transition"
          >
            Acessar Módulo de Execução no SGC &rarr;
          </a>
        </div>
      </div>
    );
  }
  if (sessao.tipo === "GESTOR_ATA") {
    return <GestorAtaHomePage />;
  }
  return <UnidadeDfdListPage unidadeId={sessao.id} permissoes={sessao.permissoes} />;
}
