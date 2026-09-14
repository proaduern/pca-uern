import { cookies } from "next/headers";
import { prisma } from "./prisma";
import type { Pca } from "@prisma/client";
import type { SessionPayload } from "./auth";

const COOKIE_NAME = "pca_atuacao";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 90; // só guarda uma preferência de ano, sem dado sensível

function chaveSessao(sessao: Pick<SessionPayload, "tipo" | "id">) {
  return `${sessao.tipo}:${sessao.id}`;
}

async function lerEscolhas(): Promise<Record<string, number>> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  if (!raw) return {};
  try {
    const valor = JSON.parse(raw);
    return valor && typeof valor === "object" ? valor : {};
  } catch {
    return {};
  }
}

/** PCAs abertos para seleção — pode haver mais de um simultaneamente (ex.: o
 * PCA do ano corrente ainda em execução e o do ano seguinte já em coleta). */
export async function pcasAtivos(): Promise<Pca[]> {
  return prisma.pca.findMany({ where: { ativo: true }, orderBy: { ano: "asc" } });
}

export type ResultadoPcaAtuacao =
  | { status: "nenhum" }
  | { status: "resolvido"; pca: Pca; totalAtivos: number }
  | { status: "precisa_escolher"; opcoes: Pca[] };

/**
 * Em qual PCA a sessão (unidade/setor técnico) está atuando. Com um só PCA
 * ativo, resolve direto — sem exigir escolha. Com dois ou mais, depende da
 * preferência gravada em cookie por `definirPcaEmAtuacaoAction`; sem ela
 * (primeiro acesso, ou o PCA escolhido foi desativado), força nova escolha.
 */
export async function resolverPcaEmAtuacao(
  sessao: Pick<SessionPayload, "tipo" | "id">,
): Promise<ResultadoPcaAtuacao> {
  const ativos = await pcasAtivos();
  if (ativos.length === 0) return { status: "nenhum" };
  if (ativos.length === 1) return { status: "resolvido", pca: ativos[0], totalAtivos: 1 };

  const escolhas = await lerEscolhas();
  const anoEscolhido = escolhas[chaveSessao(sessao)];
  const escolhido = ativos.find((p) => p.ano === anoEscolhido);
  if (escolhido) return { status: "resolvido", pca: escolhido, totalAtivos: ativos.length };
  return { status: "precisa_escolher", opcoes: ativos };
}

export async function definirPcaEmAtuacao(sessao: Pick<SessionPayload, "tipo" | "id">, ano: number) {
  const cookieStore = await cookies();
  const escolhas = await lerEscolhas();
  escolhas[chaveSessao(sessao)] = ano;
  cookieStore.set(COOKIE_NAME, JSON.stringify(escolhas), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
}
