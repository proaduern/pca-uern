import { redirect } from "next/navigation";
import { obterSessao } from "@/lib/auth";
import TrocarSenhaForm from "./TrocarSenhaForm";

export default async function TrocarSenhaPage() {
  const sessao = await obterSessao();
  if (!sessao) redirect("/login");

  return <TrocarSenhaForm />;
}
