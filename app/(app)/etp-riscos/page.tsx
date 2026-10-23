import { obterSessao } from "@/lib/auth";
import { redirect } from "next/navigation";
import SetorTecnicoHomePage from "../SetorTecnicoHomePage";

export const dynamic = "force-dynamic";

export default async function EtpRiscosRoutePage() {
  const sessao = await obterSessao();
  if (!sessao) redirect("/login");

  const setorTecnicoId = sessao.tipo === "SETOR_TECNICO" ? sessao.id : null;
  return <SetorTecnicoHomePage setorTecnicoId={setorTecnicoId} />;
}
