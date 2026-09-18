import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

const COOKIE_NAME = "pca_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 8; // 8 horas

const PRE_LOGIN_COOKIE_NAME = "pca_pre_login";
const PRE_LOGIN_DURATION_SECONDS = 60 * 5; // 5 minutos, só pra escolher o perfil

const ADMIN_IMPERSONACAO_COOKIE_NAME = "pca_admin_impersonacao";

function getSecretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET não configurado.");
  return new TextEncoder().encode(secret);
}

export type TipoSessao =
  | "ADMIN"
  | "UNIDADE"
  | "SETOR_INTERNO"
  | "SETOR_TECNICO"
  | "LICITACOES"
  | "PESQUISA_PRECOS"
  | "PLANEJAMENTO"
  | "AGENTE_CONTRATACAO"
  | "EXECUCAO"
  | "ENTREGA"
  | "GESTOR_ATA";

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

async function obterSessaoDoCookie(nomeCookie: string): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(nomeCookie)?.value;
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

/** A sessão realmente autenticada (login com email/senha) — ignora "Atuar Como". */
export async function obterSessaoReal(): Promise<SessionPayload | null> {
  return obterSessaoDoCookie(COOKIE_NAME);
}

/**
 * A sessão efetiva: se a PROAD estiver "atuando como" outra sessão, é essa
 * outra sessão que vale para toda checagem de permissão do sistema — igual
 * ao sistema original, que troca o SESSION global inteiro ao impersonar.
 */
export async function obterSessao(): Promise<SessionPayload | null> {
  const impersonada = await obterSessaoDoCookie(ADMIN_IMPERSONACAO_COOKIE_NAME);
  if (impersonada) return impersonada;
  return obterSessaoReal();
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

/** Igual a exigirAdmin, mas para uso em Server Components de página: redireciona
 *  em vez de lançar erro, para páginas /admin/* acessadas diretamente por
 *  uma sessão sem esse papel. */
export async function exigirAdminNaPagina(): Promise<SessionPayload> {
  const sessao = await obterSessao();
  if (!sessao || sessao.tipo !== "ADMIN") redirect("/");
  return sessao;
}

export async function exigirUnidade(): Promise<SessionPayload> {
  const sessao = await exigirSessao();
  if (sessao.tipo !== "UNIDADE") throw new Error("Acesso restrito a unidades demandantes.");
  return sessao;
}

export async function exigirSetorInterno(): Promise<SessionPayload> {
  const sessao = await exigirSessao();
  if (sessao.tipo !== "SETOR_INTERNO") throw new Error("Acesso restrito a setores internos.");
  return sessao;
}

/** DFD é sempre da Unidade, mas quem preenche pode ser a própria Unidade ou
 * um dos seus setores internos — ver lib/actions/dfd.ts. */
export async function exigirUnidadeOuSetorInterno(): Promise<SessionPayload> {
  const sessao = await exigirSessao();
  if (sessao.tipo !== "UNIDADE" && sessao.tipo !== "SETOR_INTERNO") {
    throw new Error("Acesso restrito a unidades demandantes ou setores internos.");
  }
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

export async function exigirPesquisaPrecos(): Promise<SessionPayload> {
  const sessao = await exigirSessao();
  if (sessao.tipo !== "PESQUISA_PRECOS") throw new Error("Acesso restrito ao subsetor de Pesquisa de Preços.");
  return sessao;
}

export async function exigirPlanejamento(): Promise<SessionPayload> {
  const sessao = await exigirSessao();
  if (sessao.tipo !== "PLANEJAMENTO") throw new Error("Acesso restrito ao subsetor de Planejamento.");
  return sessao;
}

export async function exigirAgenteContratacao(): Promise<SessionPayload> {
  const sessao = await exigirSessao();
  if (sessao.tipo !== "AGENTE_CONTRATACAO") throw new Error("Acesso restrito ao Agente de Contratação.");
  return sessao;
}

export async function exigirExecucao(): Promise<SessionPayload> {
  const sessao = await exigirSessao();
  if (sessao.tipo !== "EXECUCAO") throw new Error("Acesso restrito à unidade de execução.");
  return sessao;
}

export async function exigirEntrega(): Promise<SessionPayload> {
  const sessao = await exigirSessao();
  if (sessao.tipo !== "ENTREGA") throw new Error("Acesso restrito à unidade de entrega de bens.");
  return sessao;
}

export async function exigirGestorAta(): Promise<SessionPayload> {
  const sessao = await exigirSessao();
  if (sessao.tipo !== "GESTOR_ATA") throw new Error("Acesso restrito à unidade gestora de ata.");
  return sessao;
}

// ---------------------------------------------------------------------------
// Login com múltiplos perfis (setor técnico / licitações "vinculados" ao
// mesmo login de uma unidade demandante — quem loga escolhe o perfil)
// ---------------------------------------------------------------------------

export interface OpcaoPerfil {
  tipo:
    | "UNIDADE"
    | "SETOR_TECNICO"
    | "LICITACOES"
    | "PESQUISA_PRECOS"
    | "PLANEJAMENTO"
    | "AGENTE_CONTRATACAO"
    | "EXECUCAO"
    | "ENTREGA"
    | "GESTOR_ATA";
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

/** Email/senhaTemporaria efetivos de um registro de Licitações — o próprio,
 * ou (se ele mesmo for vinculado) os da Unidade dona do login. Usado tanto
 * pela própria Licitacoes quanto pelos subsetores (PesquisaPrecos/
 * Planejamento/AgenteContratacao) vinculados a ela, que assim seguem a
 * cadeia de vínculo até a credencial real usada no login. */
async function credenciaisEfetivasLicitacoes(lic: {
  vinculado: boolean;
  unidadeId: string | null;
  email: string | null;
  senhaTemporaria: boolean;
}): Promise<{ email: string; senhaTemporaria: boolean }> {
  if (lic.vinculado && lic.unidadeId) {
    const unidade = await prisma.unidade.findUniqueOrThrow({ where: { id: lic.unidadeId } });
    return { email: unidade.email, senhaTemporaria: unidade.senhaTemporaria };
  }
  return { email: lic.email ?? "", senhaTemporaria: lic.senhaTemporaria };
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
  } else if (opcao.tipo === "LICITACOES") {
    const lic = await prisma.licitacoes.findUniqueOrThrow({ where: { id: opcao.id } });
    const cred = await credenciaisEfetivasLicitacoes(lic);
    sessao = { tipo: "LICITACOES", id: lic.id, nome: lic.nome, ...cred };
  } else if (opcao.tipo === "PESQUISA_PRECOS") {
    const pp = await prisma.pesquisaPrecos.findUniqueOrThrow({ where: { id: opcao.id } });
    const lic = await prisma.licitacoes.findUniqueOrThrow({ where: { id: pp.licitacoesId! } });
    const cred = await credenciaisEfetivasLicitacoes(lic);
    sessao = { tipo: "PESQUISA_PRECOS", id: pp.id, nome: pp.nome, ...cred };
  } else if (opcao.tipo === "PLANEJAMENTO") {
    const pl = await prisma.planejamento.findUniqueOrThrow({ where: { id: opcao.id } });
    const lic = await prisma.licitacoes.findUniqueOrThrow({ where: { id: pl.licitacoesId! } });
    const cred = await credenciaisEfetivasLicitacoes(lic);
    sessao = { tipo: "PLANEJAMENTO", id: pl.id, nome: pl.nome, ...cred };
  } else if (opcao.tipo === "AGENTE_CONTRATACAO") {
    const ac = await prisma.agenteContratacao.findUniqueOrThrow({ where: { id: opcao.id } });
    const lic = await prisma.licitacoes.findUniqueOrThrow({ where: { id: ac.licitacoesId! } });
    const cred = await credenciaisEfetivasLicitacoes(lic);
    sessao = { tipo: "AGENTE_CONTRATACAO", id: ac.id, nome: ac.nome, ...cred };
  } else if (opcao.tipo === "EXECUCAO") {
    const exec = await prisma.acessoExecucao.findUniqueOrThrow({ where: { id: opcao.id } });
    const unidade = await prisma.unidade.findUniqueOrThrow({ where: { id: exec.unidadeId! } });
    sessao = {
      tipo: "EXECUCAO",
      id: exec.id,
      nome: exec.nome,
      email: unidade.email,
      senhaTemporaria: unidade.senhaTemporaria,
    };
  } else if (opcao.tipo === "ENTREGA") {
    const ent = await prisma.acessoEntrega.findUniqueOrThrow({ where: { id: opcao.id } });
    const unidade = await prisma.unidade.findUniqueOrThrow({ where: { id: ent.unidadeId! } });
    sessao = {
      tipo: "ENTREGA",
      id: ent.id,
      nome: ent.nome,
      email: unidade.email,
      senhaTemporaria: unidade.senhaTemporaria,
    };
  } else {
    const ata = await prisma.acessoGestorAta.findUniqueOrThrow({ where: { id: opcao.id } });
    const unidade = await prisma.unidade.findUniqueOrThrow({ where: { id: ata.unidadeId! } });
    sessao = {
      tipo: "GESTOR_ATA",
      id: ata.id,
      nome: ata.nome,
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

    // Licitações pode ter subsetores (Pesquisa de Preços/Planejamento/Agente
    // de Contratação) vinculados ao seu login — se houver algum, quem loga
    // escolhe o perfil, igual ao que acontece com uma Unidade que tem
    // setores/licitações vinculados a ela.
    const [pesquisasPrecosVinculadas, planejamentosVinculados, agentesContratacaoVinculados] = await Promise.all([
      prisma.pesquisaPrecos.findMany({ where: { vinculado: true, licitacoesId: licitacoesProprio.id, ativo: true } }),
      prisma.planejamento.findMany({ where: { vinculado: true, licitacoesId: licitacoesProprio.id, ativo: true } }),
      prisma.agenteContratacao.findMany({ where: { vinculado: true, licitacoesId: licitacoesProprio.id, ativo: true } }),
    ]);

    if (
      pesquisasPrecosVinculadas.length === 0 &&
      planejamentosVinculados.length === 0 &&
      agentesContratacaoVinculados.length === 0
    ) {
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

    const opcoes: OpcaoPerfil[] = [
      { tipo: "LICITACOES", id: licitacoesProprio.id, nome: licitacoesProprio.nome },
      ...pesquisasPrecosVinculadas.map((p) => ({ tipo: "PESQUISA_PRECOS" as const, id: p.id, nome: p.nome })),
      ...planejamentosVinculados.map((p) => ({ tipo: "PLANEJAMENTO" as const, id: p.id, nome: p.nome })),
      ...agentesContratacaoVinculados.map((a) => ({ tipo: "AGENTE_CONTRATACAO" as const, id: a.id, nome: a.nome })),
    ];
    await criarPreLogin(opcoes);
    return { resultado: "escolher_perfil", opcoes };
  }

  const pesquisaPrecosProprio = await prisma.pesquisaPrecos.findUnique({ where: { email: emailNorm } });
  if (pesquisaPrecosProprio && !pesquisaPrecosProprio.vinculado) {
    const ok = await bcrypt.compare(senha, pesquisaPrecosProprio.senhaHash ?? "");
    if (!ok || !pesquisaPrecosProprio.ativo) return null;
    return {
      resultado: "sessao",
      sessao: {
        tipo: "PESQUISA_PRECOS",
        id: pesquisaPrecosProprio.id,
        nome: pesquisaPrecosProprio.nome,
        email: pesquisaPrecosProprio.email!,
        senhaTemporaria: pesquisaPrecosProprio.senhaTemporaria,
      },
    };
  }

  const planejamentoProprio = await prisma.planejamento.findUnique({ where: { email: emailNorm } });
  if (planejamentoProprio && !planejamentoProprio.vinculado) {
    const ok = await bcrypt.compare(senha, planejamentoProprio.senhaHash ?? "");
    if (!ok || !planejamentoProprio.ativo) return null;
    return {
      resultado: "sessao",
      sessao: {
        tipo: "PLANEJAMENTO",
        id: planejamentoProprio.id,
        nome: planejamentoProprio.nome,
        email: planejamentoProprio.email!,
        senhaTemporaria: planejamentoProprio.senhaTemporaria,
      },
    };
  }

  const agenteContratacaoProprio = await prisma.agenteContratacao.findUnique({ where: { email: emailNorm } });
  if (agenteContratacaoProprio && !agenteContratacaoProprio.vinculado) {
    const ok = await bcrypt.compare(senha, agenteContratacaoProprio.senhaHash ?? "");
    if (!ok || !agenteContratacaoProprio.ativo) return null;
    return {
      resultado: "sessao",
      sessao: {
        tipo: "AGENTE_CONTRATACAO",
        id: agenteContratacaoProprio.id,
        nome: agenteContratacaoProprio.nome,
        email: agenteContratacaoProprio.email!,
        senhaTemporaria: agenteContratacaoProprio.senhaTemporaria,
      },
    };
  }

  const execucaoProprio = await prisma.acessoExecucao.findUnique({ where: { email: emailNorm } });
  if (execucaoProprio && !execucaoProprio.vinculado) {
    const ok = await bcrypt.compare(senha, execucaoProprio.senhaHash ?? "");
    if (!ok || !execucaoProprio.ativo) return null;
    return {
      resultado: "sessao",
      sessao: {
        tipo: "EXECUCAO",
        id: execucaoProprio.id,
        nome: execucaoProprio.nome,
        email: execucaoProprio.email!,
        senhaTemporaria: execucaoProprio.senhaTemporaria,
      },
    };
  }

  const entregaProprio = await prisma.acessoEntrega.findUnique({ where: { email: emailNorm } });
  if (entregaProprio && !entregaProprio.vinculado) {
    const ok = await bcrypt.compare(senha, entregaProprio.senhaHash ?? "");
    if (!ok || !entregaProprio.ativo) return null;
    return {
      resultado: "sessao",
      sessao: {
        tipo: "ENTREGA",
        id: entregaProprio.id,
        nome: entregaProprio.nome,
        email: entregaProprio.email!,
        senhaTemporaria: entregaProprio.senhaTemporaria,
      },
    };
  }

  const gestorAtaProprio = await prisma.acessoGestorAta.findUnique({ where: { email: emailNorm } });
  if (gestorAtaProprio && !gestorAtaProprio.vinculado) {
    const ok = await bcrypt.compare(senha, gestorAtaProprio.senhaHash ?? "");
    if (!ok || !gestorAtaProprio.ativo) return null;
    return {
      resultado: "sessao",
      sessao: {
        tipo: "GESTOR_ATA",
        id: gestorAtaProprio.id,
        nome: gestorAtaProprio.nome,
        email: gestorAtaProprio.email!,
        senhaTemporaria: gestorAtaProprio.senhaTemporaria,
      },
    };
  }

  // Setor interno sempre tem login próprio (nunca "vinculado" como os
  // demais acima) — checa antes de Unidade porque o email é sempre distinto
  // do da unidade-mãe, então não há ambiguidade a resolver.
  const setorInterno = await prisma.setorInterno.findUnique({ where: { email: emailNorm } });
  if (setorInterno) {
    const ok = await bcrypt.compare(senha, setorInterno.senhaHash);
    if (!ok || !setorInterno.ativo) return null;
    return {
      resultado: "sessao",
      sessao: {
        tipo: "SETOR_INTERNO",
        id: setorInterno.id,
        nome: setorInterno.nome,
        email: setorInterno.email,
        senhaTemporaria: setorInterno.senhaTemporaria,
      },
    };
  }

  const unidade = await prisma.unidade.findUnique({ where: { email: emailNorm } });
  if (unidade) {
    const ok = await bcrypt.compare(senha, unidade.senhaHash);
    if (!ok || !unidade.ativa) return null;

    const [setoresVinculados, licitacoesVinculadas, execucoesVinculadas, entregasVinculadas, gestorAtaVinculadas] = await Promise.all([
      prisma.setorTecnico.findMany({ where: { vinculado: true, unidadeId: unidade.id, ativo: true } }),
      prisma.licitacoes.findMany({ where: { vinculado: true, unidadeId: unidade.id, ativo: true } }),
      prisma.acessoExecucao.findMany({ where: { vinculado: true, unidadeId: unidade.id, ativo: true } }),
      prisma.acessoEntrega.findMany({ where: { vinculado: true, unidadeId: unidade.id, ativo: true } }),
      prisma.acessoGestorAta.findMany({ where: { vinculado: true, unidadeId: unidade.id, ativo: true } }),
    ]);

    if (
      setoresVinculados.length === 0 &&
      licitacoesVinculadas.length === 0 &&
      execucoesVinculadas.length === 0 &&
      entregasVinculadas.length === 0 &&
      gestorAtaVinculadas.length === 0
    ) {
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
      ...execucoesVinculadas.map((e) => ({ tipo: "EXECUCAO" as const, id: e.id, nome: e.nome })),
      ...entregasVinculadas.map((e) => ({ tipo: "ENTREGA" as const, id: e.id, nome: e.nome })),
      ...gestorAtaVinculadas.map((a) => ({ tipo: "GESTOR_ATA" as const, id: a.id, nome: a.nome })),
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

// ---------------------------------------------------------------------------
// "Atuar Como" — a PROAD assume temporariamente a sessão de uma unidade,
// setor técnico ou licitações, para ver o sistema do ponto de vista delas,
// podendo voltar para a própria sessão de admin a qualquer momento.
// Equivalente ao adminAtuarComo/adminVoltarParaAdmin do sistema original.
// ---------------------------------------------------------------------------

async function salvarCookieSessao(nome: string, payload: SessionPayload) {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSecretKey());
  const cookieStore = await cookies();
  cookieStore.set(nome, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

async function construirPayloadAtuarComo(
  tipo:
    | "UNIDADE"
    | "SETOR_TECNICO"
    | "LICITACOES"
    | "PESQUISA_PRECOS"
    | "PLANEJAMENTO"
    | "AGENTE_CONTRATACAO"
    | "EXECUCAO"
    | "ENTREGA"
    | "GESTOR_ATA",
  id: string,
): Promise<SessionPayload> {
  if (tipo === "UNIDADE") {
    const u = await prisma.unidade.findUniqueOrThrow({ where: { id } });
    return { tipo: "UNIDADE", id: u.id, nome: u.nome, email: u.email, senhaTemporaria: u.senhaTemporaria };
  }
  if (tipo === "SETOR_TECNICO") {
    const t = await prisma.setorTecnico.findUniqueOrThrow({ where: { id } });
    if (t.vinculado && t.unidadeId) {
      const u = await prisma.unidade.findUniqueOrThrow({ where: { id: t.unidadeId } });
      return { tipo: "SETOR_TECNICO", id: t.id, nome: t.nome, email: u.email, senhaTemporaria: u.senhaTemporaria };
    }
    return {
      tipo: "SETOR_TECNICO",
      id: t.id,
      nome: t.nome,
      email: t.email ?? "",
      senhaTemporaria: t.senhaTemporaria,
    };
  }
  if (tipo === "LICITACOES") {
    const l = await prisma.licitacoes.findUniqueOrThrow({ where: { id } });
    const cred = await credenciaisEfetivasLicitacoes(l);
    return { tipo: "LICITACOES", id: l.id, nome: l.nome, ...cred };
  }
  if (tipo === "PESQUISA_PRECOS") {
    const p = await prisma.pesquisaPrecos.findUniqueOrThrow({ where: { id } });
    if (p.vinculado && p.licitacoesId) {
      const l = await prisma.licitacoes.findUniqueOrThrow({ where: { id: p.licitacoesId } });
      const cred = await credenciaisEfetivasLicitacoes(l);
      return { tipo: "PESQUISA_PRECOS", id: p.id, nome: p.nome, ...cred };
    }
    return { tipo: "PESQUISA_PRECOS", id: p.id, nome: p.nome, email: p.email ?? "", senhaTemporaria: p.senhaTemporaria };
  }
  if (tipo === "PLANEJAMENTO") {
    const p = await prisma.planejamento.findUniqueOrThrow({ where: { id } });
    if (p.vinculado && p.licitacoesId) {
      const l = await prisma.licitacoes.findUniqueOrThrow({ where: { id: p.licitacoesId } });
      const cred = await credenciaisEfetivasLicitacoes(l);
      return { tipo: "PLANEJAMENTO", id: p.id, nome: p.nome, ...cred };
    }
    return { tipo: "PLANEJAMENTO", id: p.id, nome: p.nome, email: p.email ?? "", senhaTemporaria: p.senhaTemporaria };
  }
  if (tipo === "AGENTE_CONTRATACAO") {
    const a = await prisma.agenteContratacao.findUniqueOrThrow({ where: { id } });
    if (a.vinculado && a.licitacoesId) {
      const l = await prisma.licitacoes.findUniqueOrThrow({ where: { id: a.licitacoesId } });
      const cred = await credenciaisEfetivasLicitacoes(l);
      return { tipo: "AGENTE_CONTRATACAO", id: a.id, nome: a.nome, ...cred };
    }
    return {
      tipo: "AGENTE_CONTRATACAO",
      id: a.id,
      nome: a.nome,
      email: a.email ?? "",
      senhaTemporaria: a.senhaTemporaria,
    };
  }
  if (tipo === "EXECUCAO") {
    const e = await prisma.acessoExecucao.findUniqueOrThrow({ where: { id } });
    if (e.vinculado && e.unidadeId) {
      const u = await prisma.unidade.findUniqueOrThrow({ where: { id: e.unidadeId } });
      return { tipo: "EXECUCAO", id: e.id, nome: e.nome, email: u.email, senhaTemporaria: u.senhaTemporaria };
    }
    return { tipo: "EXECUCAO", id: e.id, nome: e.nome, email: e.email ?? "", senhaTemporaria: e.senhaTemporaria };
  }
  if (tipo === "ENTREGA") {
    const e = await prisma.acessoEntrega.findUniqueOrThrow({ where: { id } });
    if (e.vinculado && e.unidadeId) {
      const u = await prisma.unidade.findUniqueOrThrow({ where: { id: e.unidadeId } });
      return { tipo: "ENTREGA", id: e.id, nome: e.nome, email: u.email, senhaTemporaria: u.senhaTemporaria };
    }
    return { tipo: "ENTREGA", id: e.id, nome: e.nome, email: e.email ?? "", senhaTemporaria: e.senhaTemporaria };
  }
  const a = await prisma.acessoGestorAta.findUniqueOrThrow({ where: { id } });
  if (a.vinculado && a.unidadeId) {
    const u = await prisma.unidade.findUniqueOrThrow({ where: { id: a.unidadeId } });
    return { tipo: "GESTOR_ATA", id: a.id, nome: a.nome, email: u.email, senhaTemporaria: u.senhaTemporaria };
  }
  return { tipo: "GESTOR_ATA", id: a.id, nome: a.nome, email: a.email ?? "", senhaTemporaria: a.senhaTemporaria };
}

/**
 * A sessão principal (pca_session) nunca é tocada aqui — ela continua sendo
 * o login real da PROAD o tempo todo. "Atuar como" é só um segundo cookie
 * (pca_admin_impersonacao) que, quando presente, é o que obterSessao()
 * passa a devolver; "voltar para admin" é simplesmente apagar esse cookie.
 * Só precisar mexer num cookie por vez evita qualquer disputa entre duas
 * mutações de cookie na mesma resposta.
 */
export async function iniciarAtuarComo(
  tipo:
    | "UNIDADE"
    | "SETOR_TECNICO"
    | "LICITACOES"
    | "PESQUISA_PRECOS"
    | "PLANEJAMENTO"
    | "AGENTE_CONTRATACAO"
    | "EXECUCAO"
    | "ENTREGA"
    | "GESTOR_ATA",
  id: string,
) {
  const real = await obterSessaoReal();
  if (!real || real.tipo !== "ADMIN") {
    throw new Error('Só a PROAD pode usar "Atuar Como".');
  }
  const payload = await construirPayloadAtuarComo(tipo, id);
  await salvarCookieSessao(ADMIN_IMPERSONACAO_COOKIE_NAME, payload);
}

export async function encerrarAtuarComo() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_IMPERSONACAO_COOKIE_NAME);
}
