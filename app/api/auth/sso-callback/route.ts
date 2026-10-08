import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { criarSessao, PERMISSOES_TOTAL, type SessionPayload } from "@/lib/auth";

export const dynamic = "force-dynamic";

function getSecretKey() {
  const secret = process.env.AUTH_SECRET || "uern_portal_proad_sso_master_key_2026_super_seguro";
  return new TextEncoder().encode(secret);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.redirect(new URL("/login?error=token_ausente", request.url));
    }

    // 1. Valida o token JWT emitido pelo Portal Central PROAD
    const { payload } = await jwtVerify(token, getSecretKey());
    const { email, nome, matricula, role, targetSystem, unidadeSigla, permissoesPca } = payload as {
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
      return NextResponse.redirect(new URL("/login?error=destino_invalido", request.url));
    }

    const emailLimpo = email.toLowerCase().trim();
    const roleUpper = (role || "").toUpperCase();

    // 2. Fluxo ADMIN (Gestores da PROAD)
    if (roleUpper === "ADMIN" || roleUpper === "ADMIN_PROAD" || emailLimpo === "adj.proad@uern.br") {
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
      }

      await criarSessao({
        tipo: "ADMIN",
        id: usuarioDb.id,
        nome: usuarioDb.nome,
        email: usuarioDb.email,
        usuarioId: usuarioDb.id,
        senhaTemporaria: false,
      });

      return NextResponse.redirect(new URL("/admin", request.url));
    }

    // 3. Fluxo UNIDADE (Servidor operando em nome de sua Unidade Acadêmica/Administrativa)
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
      // Se a unidade não existir no banco do PCA ainda, inicializa
      unidadeDb = await prisma.unidade.create({
        data: {
          nome: siglaBusca,
          email: `${siglaBusca.toLowerCase()}@uern.br`,
          senhaHash: "SSO_CENTRAL_UERN_AUTHENTICATED",
          senhaTemporaria: false,
          ativa: true,
        },
      });
    }

    // Cria ou atualiza o usuário servidor vinculado a esta unidade
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

    await criarSessao({
      tipo: "UNIDADE",
      id: unidadeDb.id,
      nome: unidadeDb.nome,
      email: unidadeDb.email,
      usuarioId: usuarioVinculado.id,
      unidadeId: unidadeDb.id,
      unidadeNome: unidadeDb.nome,
      senhaTemporaria: false,
      permissoes: permissoesSessao,
    });

    return NextResponse.redirect(new URL("/dfd", request.url));
  } catch (err: any) {
    console.error("Erro no callback SSO do PCA:", err);
    return NextResponse.redirect(new URL("/login?error=falha_sso", request.url));
  }
}
