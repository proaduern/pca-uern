import { prisma } from "@/lib/prisma";

export interface DadosPerfilHomologado {
  email: string;
  nome: string;
  matricula?: string | null;
  funcao?: string | null;
  perfilPca: string | null;
  unidadeSigla?: string | null;
  unidadeNome?: string | null;
  unidadeEmail?: string | null;
  ativo: boolean;
}

/**
 * Sincroniza um servidor homologado pelo Administrador (no Portal PROAD ou no Admin local)
 * diretamente nas tabelas de perfil operacional do PCA (`AgenteContratacao`, `Planejamento`,
 * `PesquisaPrecos`, `Licitacoes`), suportando múltiplos perfis separados por vírgula.
 */
export async function aplicarSincronizacaoPerfilPca(dados: DadosPerfilHomologado) {
  const emailLimpo = (dados.email || "").toLowerCase().trim();
  if (!emailLimpo) return;

  const nome = (dados.nome || emailLimpo.split("@")[0]).trim();
  const matricula = (dados.matricula || "S/M").trim();
  const perfis = (dados.perfilPca || "")
    .toUpperCase()
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  const ativo = Boolean(dados.ativo);

  for (const perfil of perfis) {
    if (perfil === "AGENTE_CONTRATACAO") {
      const existente = await prisma.agenteContratacao.findUnique({ where: { email: emailLimpo } });
      if (existente) {
        await prisma.agenteContratacao.update({
          where: { id: existente.id },
          data: {
            nome,
            matricula: matricula !== "S/M" ? matricula : existente.matricula,
            ativo,
          },
        });
      } else if (ativo) {
        await prisma.agenteContratacao.create({
          data: {
            nome,
            matricula,
            funcao: dados.funcao || "Agente de Contratação",
            email: emailLimpo,
            senhaHash: "SSO_CENTRAL_UERN_AUTHENTICATED",
            senhaTemporaria: false,
            ativo: true,
          },
        });
      }
    } else if (perfil === "PLANEJAMENTO") {
      const existente = await prisma.planejamento.findUnique({ where: { email: emailLimpo } });
      if (existente) {
        await prisma.planejamento.update({
          where: { id: existente.id },
          data: {
            nome,
            matricula: matricula !== "S/M" ? matricula : existente.matricula,
            ativo,
          },
        });
      } else if (ativo) {
        await prisma.planejamento.create({
          data: {
            nome,
            matricula,
            funcao: dados.funcao || "Planejamento (Termo de Referência)",
            email: emailLimpo,
            senhaHash: "SSO_CENTRAL_UERN_AUTHENTICATED",
            senhaTemporaria: false,
            ativo: true,
          },
        });
      }
    } else if (perfil === "PESQUISA_PRECOS") {
      const existente = await prisma.pesquisaPrecos.findUnique({ where: { email: emailLimpo } });
      if (existente) {
        await prisma.pesquisaPrecos.update({
          where: { id: existente.id },
          data: {
            nome,
            matricula: matricula !== "S/M" ? matricula : existente.matricula,
            ativo,
          },
        });
      } else if (ativo) {
        await prisma.pesquisaPrecos.create({
          data: {
            nome,
            matricula,
            funcao: dados.funcao || "Pesquisa de Preços",
            email: emailLimpo,
            senhaHash: "SSO_CENTRAL_UERN_AUTHENTICATED",
            senhaTemporaria: false,
            ativo: true,
          },
        });
      }
    } else if (perfil === "LICITACOES" || perfil === "DIRETOR_LICITACOES" || perfil === "DIRETOR_DLC") {
      const existente = await prisma.licitacoes.findUnique({ where: { email: emailLimpo } });
      if (existente) {
        await prisma.licitacoes.update({
          where: { id: existente.id },
          data: { nome, ativo },
        });
      } else if (ativo) {
        await prisma.licitacoes.create({
          data: {
            nome,
            email: emailLimpo,
            senhaHash: "SSO_CENTRAL_UERN_AUTHENTICATED",
            senhaTemporaria: false,
            ativo: true,
          },
        });
      }
    }
  }
}

/**
 * Sincroniza automaticamente a lista de Agentes de Contratação, Planejamento e Pesquisa de Preços
 * homologados no Portal PROAD (via tabela compartilhada `portal_usuarios` ou endpoint de integração).
 */
export async function sincronizarPerfisHomologadosDoPortal(): Promise<void> {
  try {
    // 1. Tenta ler diretamente da tabela `public.portal_usuarios` caso esteja no mesmo cluster Postgres
    const rows = await prisma.$queryRawUnsafe<
      Array<{
        email: string;
        nome: string;
        matricula: string | null;
        status: string;
        perfilPca: string | null;
      }>
    >(`
      SELECT "email", "nome", "matricula", "status"::text AS "status", "perfilPca"
      FROM public."portal_usuarios"
      WHERE "perfilPca" IS NOT NULL AND "perfilPca" <> ''
    `);

    if (Array.isArray(rows) && rows.length > 0) {
      for (const r of rows) {
        await aplicarSincronizacaoPerfilPca({
          email: r.email,
          nome: r.nome,
          matricula: r.matricula,
          perfilPca: r.perfilPca,
          ativo: r.status === "ATIVO",
        });
      }
      return;
    }
  } catch {
    // Se public.portal_usuarios estiver em outro banco, faz fallback para a API do Portal PROAD
  }

  try {
    const portalBaseUrl = process.env.PORTAL_PROAD_URL || "https://portal-proad.vercel.app";
    const res = await fetch(`${portalBaseUrl}/api/integracao/usuarios-pca`, {
      headers: {
        "x-proad-secret": process.env.PROAD_SSO_SECRET || "uern_portal_proad_sso_master_key_2026_super_seguro",
      },
      next: { revalidate: 15 },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.usuarios)) {
        for (const u of data.usuarios) {
          await aplicarSincronizacaoPerfilPca({
            email: u.email,
            nome: u.nome,
            matricula: u.matricula,
            perfilPca: u.perfilPca,
            ativo: u.status === "ATIVO",
          });
        }
      }
    }
  } catch {
    // Silencioso se offline
  }
}
