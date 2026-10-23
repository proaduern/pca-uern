import { obterSessao } from "@/lib/auth";
import { redirect } from "next/navigation";
import PesquisaPrecosHomePage from "../PesquisaPrecosHomePage";

export const dynamic = "force-dynamic";

export default async function PesquisaPrecosRoutePage() {
  const sessao = await obterSessao();
  if (!sessao) redirect("/login");

  return <PesquisaPrecosHomePage />;
}
