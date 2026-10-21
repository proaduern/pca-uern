import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import {
  COOKIE_NAME,
  SESSION_DURATION_SECONDS,
  gerarTokenSessao,
  criarSessao,
  type SessionPayload,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

export const SUBSISTEMA_COOKIE_NAME = "proad_subsistema_ativo";

function getSsoSecretKey() {
  const secret =
    process.env.PROAD_SSO_SECRET || "uern_portal_proad_sso_master_key_2026_super_seguro";
  return new TextEncoder().encode(secret);
}

const SUBSISTEMAS_VALIDOS = [
  "PCA",
  "ETP_RISCOS",
  "PESQUISA_PRECOS",
  "TERMO_REFERENCIA",
  "LICITACOES_MINUTAS",
] as const;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    const subsistemaQuery = (searchParams.get("subsistema") || "").toUpperCase();

    if (!token) {
      console.warn("[SSO PCA] Token ausente na requisição");
      return NextResponse.redirect(new URL("/login?error=token_ausente", request.url));
    }

    // 1. Valida o token JWT emitido pelo Portal Central PROAD usando a chave mestra de SSO
    const { payload } = await jwtVerify(token, getSsoSecretKey());
    const { email, nome, matricula, role, targetSystem, unidadeSigla, unidadeNome, unidadeEmail, permissoesPca } =
      payload as {
        userId?: string;
        email: string;
        nome: string;
        matricula?: string;
        role?: string;
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

    const emailLimpo = email.toLowerCase().trim();
    const roleUpper = (role || "").toUpperCase();

    let sessionPayload: SessionPayload;
    let destinoUrl = "/";

    // 2. Fluxo ADMIN (Gestores da PROAD)
    if (
      roleUpper === "ADMIN" ||
      roleUpper === "ADMIN_PROAD" ||
      emailLimpo === "adj.proad@uern.br" ||
      emailLimpo === "pedroreboucas@uern.br"
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

      // Redireciona diretamente para a tela principal do Subsistema clicado no Portal PROAD
      if (subsistemaAtivo === "ETP_RISCOS") destinoUrl = "/admin/consolidacao";
      else if (subsistemaAtivo === "PESQUISA_PRECOS") destinoUrl = "/admin/pesquisa-precos";
      else if (subsistemaAtivo === "TERMO_REFERENCIA") destinoUrl = "/admin/planejamento";
      else if (subsistemaAtivo === "LICITACOES_MINUTAS") destinoUrl = "/admin/licitacoes";
      else destinoUrl = "/";
    } else if (subsistemaAtivo === "ETP_RISCOS" || roleUpper.includes("SETOR_TECNICO")) {
      // Subsistema 2: ETP e Mapa de Riscos (Setores Técnicos: STI, Patrimônio, SOBE, DAS, Almoxarifado, Transportes, Comitês)
      let setorTec = await prisma.setorTecnico.findFirst({
        where: {
          OR: [
            { email: emailLimpo },
            ...(unidadeSigla ? [{ nome: { contains: unidadeSigla, mode: "insensitive" as const } }] : []),
          ],
          ativo: true,
        },
      });
      if (!setorTec) {
        setorTec = await prisma.setorTecnico.findFirst({ where: { ativo: true } });
      }
      if (!setorTec) {
        setorTec = await prisma.setorTecnico.create({
          data: {
            nome: unidadeSigla || nome || "Setor Técnico",
            email: emailLimpo,
            senhaHash: "SSO_CENTRAL_UERN_AUTHENTICATED",
            senhaTemporaria: false,
            ativo: true,
          },
        });
      }
      sessionPayload = {
        tipo: "SETOR_TECNICO",
        id: setorTec.id,
        nome: setorTec.nome,
        email: setorTec.email ?? emailLimpo,
        senhaTemporaria: false,
      };
      destinoUrl = "/";
    } else if (subsistemaAtivo === "PESQUISA_PRECOS" || roleUpper.includes("PESQUISA_PRECOS")) {
      // Subsistema 3: Pesquisa de Preços
      let pesq = await prisma.pesquisaPrecos.findFirst({
        where: { OR: [{ email: emailLimpo }, { ativo: true }] },
      });
      if (!pesq) {
        pesq = await prisma.pesquisaPrecos.create({
          data: {
            nome: nome || "Servidor Pesquisa de Preços",
            matricula: matricula || "00000",
            funcao: "Pesquisa de Preços",
            email: emailLimpo,
            senhaHash: "SSO_CENTRAL_UERN_AUTHENTICATED",
            senhaTemporaria: false,
            ativo: true,
          },
        });
      }
      sessionPayload = {
        tipo: "PESQUISA_PRECOS",
        id: pesq.id,
        nome: pesq.nome,
        email: pesq.email ?? emailLimpo,
        senhaTemporaria: false,
      };
      destinoUrl = "/";
    } else if (subsistemaAtivo === "TERMO_REFERENCIA" || roleUpper.includes("PLANEJAMENTO")) {
      // Subsistema 4: Termo de Referência (Setor de Planejamento)
      let plan = await prisma.planejamento.findFirst({
        where: { OR: [{ email: emailLimpo }, { ativo: true }] },
      });
      if (!plan) {
        plan = await prisma.planejamento.create({
          data: {
            nome: nome || "Servidor Planejamento (TR)",
            matricula: matricula || "00000",
            funcao: "Planejamento",
            email: emailLimpo,
            senhaHash: "SSO_CENTRAL_UERN_AUTHENTICATED",
            senhaTemporaria: false,
            ativo: true,
          },
        });
      }
      sessionPayload = {
        tipo: "PLANEJAMENTO",
        id: plan.id,
        nome: plan.nome,
        email: plan.email ?? emailLimpo,
        senhaTemporaria: false,
      };
      destinoUrl = "/";
    } else if (subsistemaAtivo === "LICITACOES_MINUTAS" || roleUpper.includes("LICITACOES") || roleUpper.includes("AGENTE_CONTRATACAO") || roleUpper.includes("GESTOR_ATA")) {
      // Subsistema 5: Minutas, Fase Jurídica e Licitações
      if (roleUpper.includes("AGENTE_CONTRATACAO")) {
        let ag = await prisma.agenteContratacao.findFirst({
          where: { OR: [{ email: emailLimpo }, { ativo: true }] },
        });
        if (!ag) {
          ag = await prisma.agenteContratacao.create({
            data: {
              nome: nome || "Agente de Contratação",
              matricula: matricula || "00000",
              funcao: "Agente de Contratação / Pregoeiro",
              email: emailLimpo,
              senhaHash: "SSO_CENTRAL_UERN_AUTHENTICATED",
              senhaTemporaria: false,
              ativo: true,
            },
          });
        }
        sessionPayload = {
          tipo: "AGENTE_CONTRATACAO",
          id: ag.id,
          nome: ag.nome,
          email: ag.email ?? emailLimpo,
          senhaTemporaria: false,
        };
      } else if (roleUpper.includes("GESTOR_ATA")) {
        let ga = await prisma.acessoGestorAta.findFirst({
          where: { OR: [{ email: emailLimpo }, { ativo: true }] },
        });
        if (!ga) {
          ga = await prisma.acessoGestorAta.create({
            data: {
              nome: nome || "Setor de Gestão de Atas",
              email: emailLimpo,
              senhaHash: "SSO_CENTRAL_UERN_AUTHENTICATED",
              senhaTemporaria: false,
              ativo: true,
            },
          });
        }
        sessionPayload = {
          tipo: "GESTOR_ATA",
          id: ga.id,
          nome: ga.nome,
          email: ga.email ?? emailLimpo,
          senhaTemporaria: false,
        };
      } else {
        let lic = await prisma.licitacoes.findFirst({
          where: { OR: [{ email: emailLimpo }, { ativo: true }] },
        });
        if (!lic) {
          lic = await prisma.licitacoes.create({
            data: {
              nome: nome || "Diretoria de Licitações e Contratos",
              email: emailLimpo,
              senhaHash: "SSO_CENTRAL_UERN_AUTHENTICATED",
              senhaTemporaria: false,
              ativo: true,
            },
          });
        }
        sessionPayload = {
          tipo: "LICITACOES",
          id: lic.id,
          nome: lic.nome,
          email: lic.email ?? emailLimpo,
          senhaTemporaria: false,
        };
      }
      destinoUrl = "/";
    } else {
      // 3. Verifica primeiro se o e-mail pertence a um Subsetor Interno (SetorInterno) cadastrado pelo Diretor da Unidade
      const setorInternoDb = await prisma.setorInterno.findUnique({
        where: { email: emailLimpo },
        include: { unidade: true },
      });

      if (setorInternoDb && setorInternoDb.ativo) {
        sessionPayload = {
          tipo: "SETOR_INTERNO",
          id: setorInternoDb.id,
          nome: setorInternoDb.nome,
          email: setorInternoDb.email,
          unidadeId: setorInternoDb.unidadeId,
          unidadeNome: setorInternoDb.unidade.nome,
          senhaTemporaria: false,
        };
        destinoUrl = "/";
      } else {
        // 4. Fluxo UNIDADE (Diretor ou Servidor operando em nome de sua Unidade)
        const siglaBusca = unidadeSigla || "PROAD";
        const emailUnidadeOficial = unidadeEmail ? unidadeEmail.toLowerCase().trim() : null;
        let unidadeDb = await prisma.unidade.findFirst({
          where: {
            OR: [
              ...(emailUnidadeOficial ? [{ email: emailUnidadeOficial }] : []),
              { email: emailLimpo },
              { nome: { equals: siglaBusca, mode: "insensitive" as const } },
              ...(unidadeNome ? [{ nome: { equals: unidadeNome, mode: "insensitive" as const } }] : []),
              { nome: { contains: siglaBusca, mode: "insensitive" as const } },
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

        const isDiretorOuEnvia = permissoesPca?.podeEnviarDfd ?? true;

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
              podeEnviarDfd: isDiretorOuEnvia,
              podeExcluirDfd: permissoesPca?.podeExcluirDfd ?? isDiretorOuEnvia,
              podeSolicitarCatalogo: permissoesPca?.podeSolicitarCatalogo ?? true,
              podeSolicitarCotaGeral: permissoesPca?.podeSolicitarCotaGeral ?? false,
              podeConfirmarEntrega: permissoesPca?.podeConfirmarEntrega ?? true,
              podeGerenciarSetores: permissoesPca?.podeGerenciarSetores ?? isDiretorOuEnvia,
              podeEditarDadosUnidade: permissoesPca?.podeEditarDadosUnidade ?? isDiretorOuEnvia,
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
          podeGerenciarSetores: usuarioVinculado.podeGerenciarSetores || usuarioVinculado.podeEnviarDfd,
          podeEditarDadosUnidade: usuarioVinculado.podeEditarDadosUnidade || usuarioVinculado.podeEnviarDfd,
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
    }

    // 4. Gera token de sessão assinado com a chave do PCA
    const sessionToken = await gerarTokenSessao(sessionPayload);

    // Também registra no cookieStore do Next.js
    await criarSessao(sessionPayload);

    // 5. Constrói o redirecionamento com o cookie HTTP-Only explicitamente anexado + subsistema ativo
    const response = NextResponse.redirect(new URL(destinoUrl, request.url));
    response.cookies.set(COOKIE_NAME, sessionToken, {
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

    console.log(`[SSO PCA] Autenticação concluída para ${emailLimpo} (${subsistemaAtivo}) -> ${destinoUrl}`);
    return response;
  } catch (err: any) {
    console.error("[SSO PCA] Erro no callback SSO do PCA:", err);
    return NextResponse.redirect(new URL("/login?error=falha_sso", request.url));
  }
}
