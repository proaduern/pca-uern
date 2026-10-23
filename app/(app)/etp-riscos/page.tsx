import { cookies } from "next/headers";
import { obterSessao } from "@/lib/auth";
import { redirect } from "next/navigation";
import SetorTecnicoHomePage from "../SetorTecnicoHomePage";

export const dynamic = "force-dynamic";

export default async function EtpRiscosRoutePage() {
  const sessao = await obterSessao();
  if (!sessao) redirect("/login");

  // Assegura cookie de subsistema ativo
  const cookieStore = await cookies();
  cookieStore.set("proad_subsistema_ativo", "ETP_RISCOS", {
    path: "/",
    maxAge: 60 * 60 * 8,
    sameSite: "lax",
  });

  const setorTecnicoId = sessao.tipo === "SETOR_TECNICO" ? sessao.id : null;
  return <SetorTecnicoHomePage setorTecnicoId={setorTecnicoId} />;
}
