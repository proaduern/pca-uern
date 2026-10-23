import { obterSessao } from "@/lib/auth";
import { redirect } from "next/navigation";
import PlanejamentoHomePage from "../PlanejamentoHomePage";

export const dynamic = "force-dynamic";

export default async function TermoReferenciaRoutePage() {
  const sessao = await obterSessao();
  if (!sessao) redirect("/login");

  return <PlanejamentoHomePage />;
}
