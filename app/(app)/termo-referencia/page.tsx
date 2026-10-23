import { cookies } from "next/headers";
import { obterSessao } from "@/lib/auth";
import { redirect } from "next/navigation";
import PlanejamentoHomePage from "../PlanejamentoHomePage";

export const dynamic = "force-dynamic";

export default async function TermoReferenciaRoutePage() {
  const sessao = await obterSessao();
  if (!sessao) redirect("/login");

  // Assegura cookie de subsistema ativo
  const cookieStore = await cookies();
  cookieStore.set("proad_subsistema_ativo", "TERMO_REFERENCIA", {
    path: "/",
    maxAge: 60 * 60 * 8,
    sameSite: "lax",
  });

  return <PlanejamentoHomePage />;
}
