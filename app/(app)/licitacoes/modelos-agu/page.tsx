import { redirect } from "next/navigation";
import { obterSessao } from "@/lib/auth";
import { garantirCargaModelosAgu, listarModelosAguAction } from "@/lib/modelos-agu-seed";
import ModelosAguGerenciador from "./ModelosAguGerenciador";

export const dynamic = "force-dynamic";

export default async function ModelosAguPage() {
  const sessao = await obterSessao();
  if (!sessao) redirect("/login");

  if (
    sessao.tipo !== "ADMIN" &&
    sessao.tipo !== "LICITACOES" &&
    sessao.tipo !== "AGENTE_CONTRATACAO"
  ) {
    redirect("/");
  }

  // Garante que os modelos padrão estejam semeados no banco
  await garantirCargaModelosAgu();
  const modelos = await listarModelosAguAction();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">
          Gestão de Modelos AGU (Lei nº 14.133/2021)
        </h1>
        <p className="text-sm text-slate-500">
          Painel exclusivo da Diretoria de Licitações e Contratos (DLC/PROAD) para controle e atualização de minutas-padrão
        </p>
      </div>

      <ModelosAguGerenciador modelosIniciais={modelos as any} />
    </div>
  );
}
