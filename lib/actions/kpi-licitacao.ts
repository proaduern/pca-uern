"use server";

import { revalidatePath } from "next/cache";
import { exigirAdmin, obterSessao } from "@/lib/auth";
import {
  salvarParametrosKpiLicitacao,
  restaurarParametrosKpiLicitacaoPadrao,
  type MetasSlaDias,
  type LimiaresRating,
} from "@/lib/services/kpi-licitacao";

export async function salvarParametrosKpiAction(formData: FormData): Promise<void> {
  await exigirAdmin();
  const sessao = await obterSessao();

  const metas: MetasSlaDias = {
    demandanteEtp: parseInt(formData.get("demandanteEtp") as string, 10) || 15,
    pesquisaPrecos: parseInt(formData.get("pesquisaPrecos") as string, 10) || 14,
    termoReferencia: parseInt(formData.get("termoReferencia") as string, 10) || 14,
    minutasDlc: parseInt(formData.get("minutasDlc") as string, 10) || 10,
    pgeReferencial: parseInt(formData.get("pgeReferencial") as string, 10) || 20,
    agenteFaseExterna: parseInt(formData.get("agenteFaseExterna") as string, 10) || 35,
    conferenciaDefinitivoBens: parseInt(formData.get("conferenciaDefinitivoBens") as string, 10) || 10,
    entregaDestinatarioBens: parseInt(formData.get("entregaDestinatarioBens") as string, 10) || 5,
  };

  const limiares: LimiaresRating = {
    diamante: parseInt(formData.get("limiarDiamante") as string, 10) || 90,
    ouro: parseInt(formData.get("limiarOuro") as string, 10) || 75,
    prata: parseInt(formData.get("limiarPrata") as string, 10) || 50,
  };

  await salvarParametrosKpiLicitacao(
    { metas, limiares },
    sessao?.nome || "Administrador PROAD"
  );

  revalidatePath("/admin/kpis-licitacao");
  revalidatePath("/admin/kpis-licitacao/parametros");
}

export async function restaurarParametrosKpiAction(): Promise<void> {
  await exigirAdmin();
  const sessao = await obterSessao();

  await restaurarParametrosKpiLicitacaoPadrao(sessao?.nome || "Administrador PROAD");

  revalidatePath("/admin/kpis-licitacao");
  revalidatePath("/admin/kpis-licitacao/parametros");
}
