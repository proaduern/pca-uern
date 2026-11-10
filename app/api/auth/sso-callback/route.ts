import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import {
  COOKIE_NAME,
  SESSION_DURATION_SECONDS,
  gerarTokenSessao,
} from "@/lib/auth";
import {
  normalizarListaPerfisPca,
  resolverSessaoPorPerfilPca,
  obterDestinoPorSubsistema,
} from "@/lib/resolver-sessao-perfil";

export const dynamic = "force-dynamic";

export const SUBSISTEMA_COOKIE_NAME = "proad_subsistema_ativo";

const primarySecret =
  process.env.PROAD_SSO_SECRET?.trim() ||
  process.env.AUTH_SECRET?.trim() ||
  process.env.JWT_SECRET?.trim();

const SECRET_KEYS: Uint8Array[] = [
  primarySecret,
  process.env.PROAD_SSO_SECRET,
  process.env.AUTH_SECRET,
  process.env.JWT_SECRET,
  "uern_portal_proad_sso_master_key_2026_super_seguro",
]
  .filter((k): k is string => Boolean(k && k.trim()))
  .map((k) => new TextEncoder().encode(k.trim()));

async function verificarTokenComFallback(token: string) {
  let ultimoErro: any = null;
  for (const secretKey of SECRET_KEYS) {
    try {
      const { payload } = await jwtVerify(token, secretKey);
      return payload;
    } catch (err) {
      ultimoErro = err;
    }
  }
  throw ultimoErro || new Error("Falha ao verificar assinatura JWT do token SSO.");
}

const SUBSISTEMAS_VALIDOS = [
  "PCA",
  "ETP_RISCOS",
  "PESQUISA_PRECOS",
  "TERMO_REFERENCIA",
  "LICITACOES_MINUTAS",
] as const;

function escolherPerfilParaSubsistema(
  roleToken: string | undefined,
  perfisDisponiveis: string[],
  subsistemaAtivo: string
): string {
  const roleLimpo = (roleToken || "").toUpperCase().trim();
  if (roleLimpo && !roleLimpo.includes(",")) {
    return roleLimpo;
  }
  if (perfisDisponiveis.includes("ADMIN")) return "ADMIN";

  if (subsistemaAtivo === "ETP_RISCOS" && perfisDisponiveis.includes("SETOR_TECNICO")) {
    return "SETOR_TECNICO";
  }
  if (subsistemaAtivo === "PESQUISA_PRECOS") {
    if (perfisDisponiveis.includes("PESQUISA_PRECOS")) return "PESQUISA_PRECOS";
    if (perfisDisponiveis.includes("DIRETOR_LICITACOES") || perfisDisponiveis.includes("LICITACOES")) {
      return "DIRETOR_LICITACOES";
    }
  }
  if (subsistemaAtivo === "TERMO_REFERENCIA") {
    if (perfisDisponiveis.includes("PLANEJAMENTO")) return "PLANEJAMENTO";
    if (perfisDisponiveis.includes("DIRETOR_LICITACOES") || perfisDisponiveis.includes("LICITACOES")) {
      return "DIRETOR_LICITACOES";
    }
  }
  if (subsistemaAtivo === "LICITACOES_MINUTAS") {
    const match = perfisDisponiveis.find((p) =>
      ["DIRETOR_LICITACOES", "LICITACOES", "AGENTE_CONTRATACAO", "GESTOR_ATA"].includes(p)
    );
    if (match) return match;
  }
  if (subsistemaAtivo === "PCA") {
    const match = perfisDisponiveis.find((p) =>
      ["UNIDADE", "SETOR_INTERNO", "EXECUCAO", "ENTREGA"].includes(p)
    );
    if (match) return match;
  }

  return perfisDisponiveis[0] || "UNIDADE";
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    const subsistemaQuery = (searchParams.get("subsistema") || "").toUpperCase();

    if (!token) {
      console.warn("[SSO PCA] Token ausente na requisição");
      return NextResponse.redirect(new URL("/login?error=token_ausente", request.url));
    }

    // 1. Valida o token JWT emitido pelo Portal Central PROAD com fallback tolerante a falhas
    const payload = await verificarTokenComFallback(token);
    const {
      email,
      nome,
      matricula,
      role,
      perfisPca,
      targetSystem,
      unidadeSigla,
      unidadeNome,
      unidadeEmail,
      permissoesPca,
    } = payload as {
      userId?: string;
      email: string;
      nome: string;
      matricula?: string;
      role?: string;
      perfisPca?: string;
      targetSystem: string;
      unidadeSigla?: string;
      unidadeNome?: string;
      unidadeEmail?: string;
      permissoesPca?: any;
    };

    const targetUpper = (targetSystem || "").toUpperCase();
    if (!SUBSISTEMAS_VALIDOS.includes(targetUpper as any) || !email) {
      console.warn("[SSO PCA] Sistema de destino ou email inválido:", { targetSystem, email });
      return NextResponse.redirect(new URL("/login?error=destino_invalido", request.url));
    }

    const subsistemaAtivo = SUBSISTEMAS_VALIDOS.includes(subsistemaQuery as any)
      ? subsistemaQuery
      : targetUpper;

    const perfisDisponiveis = normalizarListaPerfisPca(perfisPca || role);
    const perfilAlvo = escolherPerfilParaSubsistema(role, perfisDisponiveis, subsistemaAtivo);

    const { sessionPayload } = await resolverSessaoPorPerfilPca({
      email,
      nome,
      matricula,
      perfilAlvo,
      perfisDisponiveis,
      subsistemaPreferido: subsistemaAtivo,
      unidadeSigla,
      unidadeNome,
      unidadeEmail,
      permissoesPca,
    });

    const destinoUrl = obterDestinoPorSubsistema(subsistemaAtivo);

    // Gera token de sessão assinado com a chave do PCA
    const sessionToken = await gerarTokenSessao(sessionPayload);

    // Constrói o redirecionamento com o cookie HTTP-Only explicitamente anexado + subsistema ativo
    const response = NextResponse.redirect(new URL(destinoUrl, request.url));
    response.cookies.set(COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_DURATION_SECONDS,
    });
    response.cookies.delete("pca_admin_impersonacao");
    response.cookies.set(SUBSISTEMA_COOKIE_NAME, subsistemaAtivo, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_DURATION_SECONDS,
    });

    console.log(
      `[SSO PCA] Autenticação concluída para ${email} (${perfilAlvo} / ${subsistemaAtivo}) -> ${destinoUrl}`
    );
    return response;
  } catch (err: any) {
    console.error("[SSO PCA] Erro no callback SSO do PCA:", err);
    return NextResponse.redirect(new URL("/login?error=falha_sso", request.url));
  }
}
