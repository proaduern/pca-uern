import { cookies } from "next/headers";
import { obterSessao } from "@/lib/auth";
import { redirect } from "next/navigation";
import PesquisaPrecosHomePage from "../PesquisaPrecosHomePage";

export const dynamic = "force-dynamic";

export default async function PesquisaPrecosRoutePage() {
  const sessao = await obterSessao();
  if (!sessao) redirect("/login");

  // Assegura cookie de subsistema ativo
  const cookieStore = await cookies();
  cookieStore.set("proad_subsistema_ativo", "PESQUISA_PRECOS", {
    path: "/",
    maxAge: 60 * 60 * 8,
    sameSite: "lax",
  });

  return <PesquisaPrecosHomePage />;
}
