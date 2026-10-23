import { obterSessao } from "@/lib/auth";
import { redirect } from "next/navigation";
import LicitacoesHomePage from "../LicitacoesHomePage";

export const dynamic = "force-dynamic";

export default async function LicitacoesRoutePage() {
  const sessao = await obterSessao();
  if (!sessao) redirect("/login");

  return <LicitacoesHomePage />;
}
