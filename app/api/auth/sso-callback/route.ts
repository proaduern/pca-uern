import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import {
  COOKIE_NAME,
  SESSION_DURATION_SECONDS,
  gerarTokenSessao,
  criarSessao,
  PERMISSOES_TOTAL,
  type SessionPayload,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

function getSsoSecretKey() {
  const secret =
    process.env.PROAD_SSO_SECRET || "uern_portal_proad_sso_master_key_2026_super_seguro";
  return new TextEncoder().encode(secret);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      console.warn("[SSO PCA] Token ausente na requisição");
      return NextResponse.redirect(new URL("/login?error=token_ausente", request.url));
    }

    // 1. Valida o token JWT emitido pelo Portal Central PROAD usando a chave mestra de SSO
    const { payload } = await jwtVerify(token, getSsoSecretKey());
    const { email, nome, matricula, role, targetSystem, unidadeSigla, permissoesPca } =
      payload as {
        userId?: string;
        email: string;
        nome: string;
        matricula?: string;
        role?: string;
        targetSystem: string;
        unidadeSigla?: string;
        permissoesPca?: any;
      };

    if (targetSystem !== "PCA" || !email) {
      console.warn("[SSO PCA] Sistema de destino ou email inválido:", { targetSystem, email });
      return NextResponse.redirect(new URL("/login?error=destino_invalido", request.url));
    }

    const emailLimpo = email.toLowerCase().trim();
    const roleUpper = (role || "").toUpperCase();

    let sessionPayload: SessionPayload;
    let destinoUrl = "/dfd";

    // 2. Fluxo ADMIN (Gestores da PROAD)
    if (
      roleUpper === "ADMIN" ||
      roleUpper === "ADMIN_PROAD" ||
      emailLimpo === "adj.proad@uern.br"
    ) {
      let usuarioDb = await prisma.usuario.findUnique({
        where: { email: emailLimpo },
      });

      if (!usuarioDb) {
        usuarioDb = await prisma.usuario.create({
          data: {
            nome: nome || "Administrador PROAD",
            email: emailLimpo,
            senhaHash: "SSO_CENTRAL_UERN_AUTHENTICATED",
            senhaTemporaria: false,
            role: "ADMIN",
            ativo: true,
          },
        });
      } else if (usuarioDb.role !== "ADMIN") {
        usuarioDb = await prisma.usuario.update({
          where: { id: usuarioDb.id },
          data: { role: "ADMIN", ativo: true },
        });
      }

      sessionPayload = {
        tipo: "ADMIN",
        id: usuarioDb.id,
        nome: usuarioDb.nome,
        email: usuarioDb.email,
        usuarioId: usuarioDb.id,
        senhaTemporaria: false,
      };

      destinoUrl = "/";
    } else {
      // 3. Fluxo UNIDADE (Servidor operando em nome de sua Unidade)
      const siglaBusca = unidadeSigla || "PROAD";
      let unidadeDb = await prisma.unidade.findFirst({
        where: {
          OR: [
            { email: emailLimpo },
            { nome: { contains: siglaBusca, mode: "insensitive" } },
          ],
        },
      });

      if (!unidadeDb) {
        const emailUnidade = `${siglaBusca.toLowerCase()}_uern@uern.br`;
        const unidadeExistenteEmail = await prisma.unidade.findUnique({
          where: { email: emailUnidade },
        });

        if (unidadeExistenteEmail) {
          unidadeDb = unidadeExistenteEmail;
        } else {
          unidadeDb = await prisma.unidade.create({
            data: {
              nome: siglaBusca,
              email: emailUnidade,
              senhaHash: "SSO_CENTRAL_UERN_AUTHENTICATED",
              senhaTemporaria: false,
              ativa: true,
            },
          });
        }
      }

      let usuarioVinculado = await prisma.usuario.findUnique({
        where: { email: emailLimpo },
      });

      if (!usuarioVinculado) {
        usuarioVinculado = await prisma.usuario.create({
          data: {
            nome: nome || emailLimpo.split("@")[0],
            email: emailLimpo,
            matricula: matricula || null,
            senhaHash: "SSO_CENTRAL_UERN_AUTHENTICATED",
            senhaTemporaria: false,
            role: "UNIDADE",
            unidadeId: unidadeDb.id,
            podeCriarDfd: permissoesPca?.podeCriarDfd ?? true,
            podeEditarDfd: permissoesPca?.podeEditarDfd ?? true,
            podeEnviarDfd: permissoesPca?.podeEnviarDfd ?? true,
            podeExcluirDfd: permissoesPca?.podeExcluirDfd ?? false,
            podeSolicitarCatalogo: permissoesPca?.podeSolicitarCatalogo ?? true,
            podeSolicitarCotaGeral: permissoesPca?.podeSolicitarCotaGeral ?? false,
            podeConfirmarEntrega: permissoesPca?.podeConfirmarEntrega ?? true,
          },
        });
      }

      const permissoesSessao = {
        podeCriarDfd: usuarioVinculado.podeCriarDfd,
        podeEditarDfd: usuarioVinculado.podeEditarDfd,
        podeEnviarDfd: usuarioVinculado.podeEnviarDfd,
        podeExcluirDfd: usuarioVinculado.podeExcluirDfd,
        podeSolicitarCatalogo: usuarioVinculado.podeSolicitarCatalogo,
        podeSolicitarCotaGeral: usuarioVinculado.podeSolicitarCotaGeral,
        podeConfirmarEntrega: usuarioVinculado.podeConfirmarEntrega,
        podeGerenciarSetores: usuarioVinculado.podeGerenciarSetores,
        podeEditarDadosUnidade: usuarioVinculado.podeEditarDadosUnidade,
      };

      sessionPayload = {
        tipo: "UNIDADE",
        id: unidadeDb.id,
        nome: unidadeDb.nome,
        email: unidadeDb.email,
        usuarioId: usuarioVinculado.id,
        unidadeId: unidadeDb.id,
        unidadeNome: unidadeDb.nome,
        senhaTemporaria: false,
        permissoes: permissoesSessao,
      };

      destinoUrl = "/";
    }

    // 4. Gera token de sessão assinado com a chave do PCA
    const sessionToken = await gerarTokenSessao(sessionPayload);

    // Também registra no cookieStore do Next.js
    await criarSessao(sessionPayload);

    // 5. Constrói o redirecionamento com o cookie HTTP-Only explicitamente anexado
    const response = NextResponse.redirect(new URL(destinoUrl, request.url));
    response.cookies.set(COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_DURATION_SECONDS,
    });

    console.log(`[SSO PCA] Autenticação concluída para ${emailLimpo} -> ${destinoUrl}`);
    return response;
  } catch (err: any) {
    console.error("[SSO PCA] Erro no callback SSO do PCA:", err);
    return NextResponse.redirect(new URL("/login?error=falha_sso", request.url));
  }
}
