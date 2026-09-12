import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

const COOKIE_NAME = "pca_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 8; // 8 horas

const PRE_LOGIN_COOKIE_NAME = "pca_pre_login";
const PRE_LOGIN_DURATION_SECONDS = 60 * 5; // 5 minutos, só pra escolher o perfil

function getSecretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET não configurado.");
  return new TextEncoder().encode(secret);
}

export type TipoSessao = "ADMIN" | "UNIDADE" | "SETOR_TECNICO" | "LICITACOES";

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

export async function exigirLicitacoes(): Promise<SessionPayload> {
  const sessao = await exigirSessao();
  if (sessao.tipo !== "LICITACOES") throw new Error("Acesso restrito à unidade de licitações.");
  return sessao;
}

// ---------------------------------------------------------------------------
// Login com múltiplos perfis (setor técnico / licitações "vinculados" ao
// mesmo login de uma unidade demandante — quem loga escolhe o perfil)
// ---------------------------------------------------------------------------

export interface OpcaoPerfil {
  tipo: "UNIDADE" | "SETOR_TECNICO" | "LICITACOES";
  id: string;
  nome: string;
}

export type ResultadoAutenticacao =
  | { resultado: "sessao"; sessao: SessionPayload }
  | { resultado: "escolher_perfil"; opcoes: OpcaoPerfil[] }
  | null;

interface PreLoginPayload {
  opcoes: OpcaoPerfil[];
}

async function criarPreLogin(opcoes: OpcaoPerfil[]) {
  const token = await new SignJWT({ opcoes })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${PRE_LOGIN_DURATION_SECONDS}s`)
    .sign(getSecretKey());

  const cookieStore = await cookies();
  cookieStore.set(PRE_LOGIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: PRE_LOGIN_DURATION_SECONDS,
  });
}

export async function obterPreLogin(): Promise<PreLoginPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(PRE_LOGIN_COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return { opcoes: payload.opcoes as OpcaoPerfil[] };
  } catch {
    return null;
  }
}

export async function destruirPreLogin() {
  const cookieStore = await cookies();
  cookieStore.delete(PRE_LOGIN_COOKIE_NAME);
}

export async function confirmarPerfil(tipo: string, id: string): Promise<SessionPayload> {
  const pre = await obterPreLogin();
  if (!pre) throw new Error("Sessão de login expirada. Faça login novamente.");
  const opcao = pre.opcoes.find((o) => o.tipo === tipo && o.id === id);
  if (!opcao) throw new Error("Perfil inválido.");

  let sessao: SessionPayload;
  if (opcao.tipo === "UNIDADE") {
    const unidade = await prisma.unidade.findUniqueOrThrow({ where: { id: opcao.id } });
    sessao = {
      tipo: "UNIDADE",
      id: unidade.id,
      nome: unidade.nome,
      email: unidade.email,
      senhaTemporaria: unidade.senhaTemporaria,
    };
  } else if (opcao.tipo === "SETOR_TECNICO") {
    const setor = await prisma.setorTecnico.findUniqueOrThrow({ where: { id: opcao.id } });
    const unidade = await prisma.unidade.findUniqueOrThrow({ where: { id: setor.unidadeId! } });
    sessao = {
      tipo: "SETOR_TECNICO",
      id: setor.id,
      nome: setor.nome,
      email: unidade.email,
      senhaTemporaria: unidade.senhaTemporaria,
    };
  } else {
    const lic = await prisma.licitacoes.findUniqueOrThrow({ where: { id: opcao.id } });
    const unidade = await prisma.unidade.findUniqueOrThrow({ where: { id: lic.unidadeId! } });
    sessao = {
      tipo: "LICITACOES",
      id: lic.id,
      nome: lic.nome,
      email: unidade.email,
      senhaTemporaria: unidade.senhaTemporaria,
    };
  }

  await destruirPreLogin();
  return sessao;
}

// Hash de um valor que nunca vai bater, só para gastar o mesmo tempo de um
// bcrypt.compare real quando o email não existe — evita que o tempo de
// resposta do login denuncie quais emails estão cadastrados.
const HASH_FANTASMA = "$2b$12$Wy4LLRXQi4YTb.p/xAWyreawLe5HR1ZI.4ssLmxJtbSDVwgqbt02e";

export async function autenticar(email: string, senha: string): Promise<ResultadoAutenticacao> {
  const emailNorm = email.trim().toLowerCase();

  const admin = await prisma.usuario.findUnique({ where: { email: emailNorm } });
  if (admin) {
    const ok = await bcrypt.compare(senha, admin.senhaHash);
    if (!ok) return null;
    return {
      resultado: "sessao",
      sessao: { tipo: "ADMIN", id: admin.id, nome: admin.nome, email: admin.email },
    };
  }

  const setorProprio = await prisma.setorTecnico.findUnique({ where: { email: emailNorm } });
  if (setorProprio && !setorProprio.vinculado) {
    const ok = await bcrypt.compare(senha, setorProprio.senhaHash ?? "");
    if (!ok || !setorProprio.ativo) return null;
    return {
      resultado: "sessao",
      sessao: {
        tipo: "SETOR_TECNICO",
        id: setorProprio.id,
        nome: setorProprio.nome,
        email: setorProprio.email!,
        senhaTemporaria: setorProprio.senhaTemporaria,
      },
    };
  }

  const licitacoesProprio = await prisma.licitacoes.findUnique({ where: { email: emailNorm } });
  if (licitacoesProprio && !licitacoesProprio.vinculado) {
    const ok = await bcrypt.compare(senha, licitacoesProprio.senhaHash ?? "");
    if (!ok || !licitacoesProprio.ativo) return null;
    return {
      resultado: "sessao",
      sessao: {
        tipo: "LICITACOES",
        id: licitacoesProprio.id,
        nome: licitacoesProprio.nome,
        email: licitacoesProprio.email!,
        senhaTemporaria: licitacoesProprio.senhaTemporaria,
      },
    };
  }

  const unidade = await prisma.unidade.findUnique({ where: { email: emailNorm } });
  if (unidade) {
    const ok = await bcrypt.compare(senha, unidade.senhaHash);
    if (!ok || !unidade.ativa) return null;

    const [setoresVinculados, licitacoesVinculadas] = await Promise.all([
      prisma.setorTecnico.findMany({ where: { vinculado: true, unidadeId: unidade.id, ativo: true } }),
      prisma.licitacoes.findMany({ where: { vinculado: true, unidadeId: unidade.id, ativo: true } }),
    ]);

    if (setoresVinculados.length === 0 && licitacoesVinculadas.length === 0) {
      return {
        resultado: "sessao",
        sessao: {
          tipo: "UNIDADE",
          id: unidade.id,
          nome: unidade.nome,
          email: unidade.email,
          senhaTemporaria: unidade.senhaTemporaria,
        },
      };
    }

    const opcoes: OpcaoPerfil[] = [
      { tipo: "UNIDADE", id: unidade.id, nome: unidade.nome },
      ...setoresVinculados.map((s) => ({ tipo: "SETOR_TECNICO" as const, id: s.id, nome: s.nome })),
      ...licitacoesVinculadas.map((l) => ({ tipo: "LICITACOES" as const, id: l.id, nome: l.nome })),
    ];
    await criarPreLogin(opcoes);
    return { resultado: "escolher_perfil", opcoes };
  }

  await bcrypt.compare(senha, HASH_FANTASMA);
  return null;
}

export async function gerarHashSenha(senha: string): Promise<string> {
  return bcrypt.hash(senha, 12);
}
