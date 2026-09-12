import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

const COOKIE_NAME = "pca_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 8; // 8 horas

function getSecretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET não configurado.");
  return new TextEncoder().encode(secret);
}

export type TipoSessao = "ADMIN" | "UNIDADE" | "SETOR_TECNICO";

export interface SessionPayload {
  tipo: TipoSessao;
  id: string;
  nome: string;
  email: string;
  senhaTemporaria?: boolean;
}

export async function criarSessao(payload: SessionPayload) {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSecretKey());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function destruirSessao() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function obterSessao(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return {
      tipo: payload.tipo as TipoSessao,
      id: payload.id as string,
      nome: payload.nome as string,
      email: payload.email as string,
      senhaTemporaria: payload.senhaTemporaria as boolean | undefined,
    };
  } catch {
    return null;
  }
}

export async function exigirSessao(): Promise<SessionPayload> {
  const sessao = await obterSessao();
  if (!sessao) throw new Error("Não autenticado.");
  return sessao;
}

export async function exigirAdmin(): Promise<SessionPayload> {
  const sessao = await exigirSessao();
  if (sessao.tipo !== "ADMIN") throw new Error("Acesso restrito à PROAD.");
  return sessao;
}

export async function exigirUnidade(): Promise<SessionPayload> {
  const sessao = await exigirSessao();
  if (sessao.tipo !== "UNIDADE") throw new Error("Acesso restrito a unidades demandantes.");
  return sessao;
}

export async function exigirSetorTecnico(): Promise<SessionPayload> {
  const sessao = await exigirSessao();
  if (sessao.tipo !== "SETOR_TECNICO") throw new Error("Acesso restrito a setores técnicos.");
  return sessao;
}

// Hash de um valor que nunca vai bater, só para gastar o mesmo tempo de um
// bcrypt.compare real quando o email não existe — evita que o tempo de
// resposta do login denuncie quais emails estão cadastrados.
const HASH_FANTASMA = "$2b$12$Wy4LLRXQi4YTb.p/xAWyreawLe5HR1ZI.4ssLmxJtbSDVwgqbt02e";

export async function autenticar(
  email: string,
  senha: string,
): Promise<SessionPayload | null> {
  const emailNorm = email.trim().toLowerCase();

  const admin = await prisma.usuario.findUnique({ where: { email: emailNorm } });
  if (admin) {
    const ok = await bcrypt.compare(senha, admin.senhaHash);
    if (!ok) return null;
    return { tipo: "ADMIN", id: admin.id, nome: admin.nome, email: admin.email };
  }

  const unidade = await prisma.unidade.findUnique({ where: { email: emailNorm } });
  if (unidade) {
    const ok = await bcrypt.compare(senha, unidade.senhaHash);
    if (!ok || !unidade.ativa) return null;
    return {
      tipo: "UNIDADE",
      id: unidade.id,
      nome: unidade.nome,
      email: unidade.email,
      senhaTemporaria: unidade.senhaTemporaria,
    };
  }

  const setorTecnico = await prisma.setorTecnico.findUnique({ where: { email: emailNorm } });
  if (setorTecnico) {
    const ok = await bcrypt.compare(senha, setorTecnico.senhaHash);
    if (!ok || !setorTecnico.ativo) return null;
    return {
      tipo: "SETOR_TECNICO",
      id: setorTecnico.id,
      nome: setorTecnico.nome,
      email: setorTecnico.email,
      senhaTemporaria: setorTecnico.senhaTemporaria,
    };
  }

  await bcrypt.compare(senha, HASH_FANTASMA);
  return null;
}

export async function gerarHashSenha(senha: string): Promise<string> {
  return bcrypt.hash(senha, 12);
}
