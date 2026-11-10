import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  COOKIE_NAME,
  SESSION_DURATION_SECONDS,
  gerarTokenSessao,
  obterSessao,
  obterSessaoReal,
} from "@/lib/auth";
import {
  normalizarListaPerfisPca,
  resolverSessaoPorPerfilPca,
} from "@/lib/resolver-sessao-perfil";
import { SUBSISTEMA_COOKIE_NAME } from "@/app/api/auth/sso-callback/route";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const sessao = await obterSessao();
    const sessaoReal = await obterSessaoReal();

    if (!sessao) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const body = await request.json();
    const perfilAlvo = (body?.perfilAlvo || "").toUpperCase().trim();
    if (!perfilAlvo) {
      return NextResponse.json({ error: "Perfil alvo não informado." }, { status: 400 });
    }

    const perfisDisponiveis = normalizarListaPerfisPca(sessao.perfisDisponiveis);
    const isAdmin = sessao.tipo === "ADMIN" || sessaoReal?.tipo === "ADMIN";

    if (!isAdmin && !perfisDisponiveis.includes(perfilAlvo)) {
      return NextResponse.json(
        { error: "Você não possui permissão para alternar para este perfil." },
        { status: 403 }
      );
    }

    // Recupera o e-mail pessoal do servidor caso esteja operando como UNIDADE (onde sessao.email é o e-mail da Unidade)
    let emailServidor = sessao.email;
    let nomeServidor = sessao.nome;
    if (sessao.usuarioId) {
      const u = await prisma.usuario.findUnique({ where: { id: sessao.usuarioId } });
      if (u) {
        emailServidor = u.email;
        nomeServidor = u.nome;
      }
    }

    const { sessionPayload, subsistemaAtivo, destinoUrl } = await resolverSessaoPorPerfilPca({
      email: emailServidor,
      nome: nomeServidor,
      perfilAlvo,
      perfisDisponiveis:
        perfisDisponiveis.length > 0 ? perfisDisponiveis : [sessao.tipo, perfilAlvo],
      unidadeId: sessao.unidadeId,
      unidadeSigla: sessao.unidadeSigla,
      unidadeNome: sessao.unidadeNome,
      permissoesPca: sessao.permissoes,
    });

    const novoToken = await gerarTokenSessao(sessionPayload);
    const cookieStore = await cookies();
    const temImpersonacaoLocal = Boolean(cookieStore.get("pca_admin_impersonacao")?.value);

    const response = NextResponse.json({
      ok: true,
      redirectUrl: destinoUrl,
      tipo: sessionPayload.tipo,
      subsistemaAtivo,
    });

    const cookieAlvo = temImpersonacaoLocal ? "pca_admin_impersonacao" : COOKIE_NAME;
    response.cookies.set(cookieAlvo, novoToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_DURATION_SECONDS,
    });

    response.cookies.set(SUBSISTEMA_COOKIE_NAME, subsistemaAtivo, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_DURATION_SECONDS,
    });

    return response;
  } catch (err: any) {
    console.error("[Alternar Perfil PCA] Erro:", err);
    return NextResponse.json(
      { error: err.message || "Falha ao alternar perfil." },
      { status: 500 }
    );
  }
}
