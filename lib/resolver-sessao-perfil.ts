import { prisma } from "@/lib/prisma";
import { type SessionPayload, PERMISSOES_TOTAL } from "@/lib/auth";

export interface OpcoesResolverSessaoPerfil {
  email: string;
  nome?: string;
  matricula?: string;
  perfilAlvo: string;
  perfisDisponiveis?: string[];
  subsistemaPreferido?: string;
  unidadeId?: string;
  unidadeSigla?: string;
  unidadeNome?: string;
  unidadeEmail?: string;
  permissoesPca?: any;
}

export function normalizarListaPerfisPca(raw?: string | string[] | null): string[] {
  if (!raw) return [];
  const lista = Array.isArray(raw) ? raw : raw.split(",");
  const normalizados: string[] = [];
  for (const item of lista) {
    const p = item.trim().toUpperCase();
    if (!p) continue;
    const canon =
      p === "DEMANDANTE" || p === "DIRETOR_UNIDADE" || p === "SERVIDOR_UNIDADE" || p === "PCA"
        ? "UNIDADE"
        : p === "ETP" || p === "ETP_RISCOS"
        ? "SETOR_TECNICO"
        : p === "PESQUISA"
        ? "PESQUISA_PRECOS"
        : p === "TERMO_REFERENCIA" || p === "TR"
        ? "PLANEJAMENTO"
        : p === "DIRETOR_DLC"
        ? "DIRETOR_LICITACOES"
        : p === "ADMIN_PROAD"
        ? "ADMIN"
        : p;
    if (!normalizados.includes(canon)) {
      normalizados.push(canon);
    }
  }
  return normalizados;
}

export async function resolverSessaoPorPerfilPca(
  opcoes: OpcoesResolverSessaoPerfil
): Promise<{
  sessionPayload: SessionPayload;
  subsistemaAtivo: string;
  destinoUrl: string;
}> {
  const emailLimpo = opcoes.email.toLowerCase().trim();
  const nome = (opcoes.nome || emailLimpo.split("@")[0]).trim();
  const matricula = opcoes.matricula || undefined;
  const roleUpper = (opcoes.perfilAlvo || "UNIDADE").toUpperCase().trim();
  const perfisDisponiveis = normalizarListaPerfisPca(
    opcoes.perfisDisponiveis && opcoes.perfisDisponiveis.length > 0
      ? opcoes.perfisDisponiveis
      : roleUpper
  );

  // Tenta localizar usuário e unidade já vinculados no banco para preservar contexto entre trocas de perfil
  const usuarioExistente = await prisma.usuario.findUnique({
    where: { email: emailLimpo },
    include: { unidade: true },
  });

  const siglaBusca = opcoes.unidadeSigla || usuarioExistente?.unidade?.nome || undefined;
  const nomeUnidadeBusca = opcoes.unidadeNome || usuarioExistente?.unidade?.nome || undefined;
  const emailUnidadeOficial = opcoes.unidadeEmail
    ? opcoes.unidadeEmail.toLowerCase().trim()
    : undefined;

  let unidadeDb = opcoes.unidadeId
    ? await prisma.unidade.findUnique({ where: { id: opcoes.unidadeId } })
    : usuarioExistente?.unidade || null;

  if (!unidadeDb && (siglaBusca || nomeUnidadeBusca || emailUnidadeOficial)) {
    unidadeDb = await prisma.unidade.findFirst({
      where: {
        OR: [
          ...(emailUnidadeOficial ? [{ email: emailUnidadeOficial }] : []),
          { email: emailLimpo },
          ...(siglaBusca ? [{ nome: { equals: siglaBusca, mode: "insensitive" as const } }] : []),
          ...(nomeUnidadeBusca
            ? [{ nome: { equals: nomeUnidadeBusca, mode: "insensitive" as const } }]
            : []),
          ...(siglaBusca ? [{ nome: { contains: siglaBusca, mode: "insensitive" as const } }] : []),
        ],
      },
    });
  }

  const baseUnidadeMeta = {
    usuarioId: usuarioExistente?.id,
    unidadeId: unidadeDb?.id,
    unidadeNome: unidadeDb?.nome || nomeUnidadeBusca,
    unidadeSigla: opcoes.unidadeSigla || unidadeDb?.nome,
    perfisDisponiveis,
  };

  // 1. ADMIN
  if (
    roleUpper === "ADMIN" ||
    roleUpper === "ADMIN_PROAD" ||
    emailLimpo === "adj.proad@uern.br" ||
    emailLimpo === "pedroreboucas@uern.br"
  ) {
    let usuarioDb = usuarioExistente;
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
        include: { unidade: true },
      });
    } else if (usuarioDb.role !== "ADMIN") {
      usuarioDb = await prisma.usuario.update({
        where: { id: usuarioDb.id },
        data: { role: "ADMIN", ativo: true },
        include: { unidade: true },
      });
    }

    const subsistemaAtivo = opcoes.subsistemaPreferido || "PCA";
    return {
      sessionPayload: {
        tipo: "ADMIN",
        id: usuarioDb.id,
        nome: usuarioDb.nome,
        email: usuarioDb.email,
        usuarioId: usuarioDb.id,
        unidadeId: unidadeDb?.id,
        unidadeNome: unidadeDb?.nome,
        unidadeSigla: opcoes.unidadeSigla || unidadeDb?.nome,
        perfisDisponiveis,
        senhaTemporaria: false,
      },
      subsistemaAtivo,
      destinoUrl: obterDestinoPorSubsistema(subsistemaAtivo),
    };
  }

  // 2. DIRETOR_LICITACOES / LICITACOES
  if (
    roleUpper === "DIRETOR_LICITACOES" ||
    roleUpper === "DIRETOR_DLC" ||
    roleUpper === "LICITACOES"
  ) {
    let lic = await prisma.licitacoes.findUnique({
      where: { email: emailLimpo },
    });
    if (!lic) {
      lic = await prisma.licitacoes.create({
        data: {
          nome: nome || "Diretor de Licitações (DLC)",
          email: emailLimpo,
          unidadeId: unidadeDb?.id || null,
          senhaHash: "SSO_CENTRAL_UERN_AUTHENTICATED",
          senhaTemporaria: false,
          ativo: true,
        },
      });
    }
    const subsistemaAtivo = opcoes.subsistemaPreferido || "LICITACOES_MINUTAS";
    return {
      sessionPayload: {
        tipo: "LICITACOES",
        id: lic.id,
        nome: lic.nome,
        email: lic.email ?? emailLimpo,
        ...baseUnidadeMeta,
        senhaTemporaria: false,
      },
      subsistemaAtivo,
      destinoUrl: obterDestinoPorSubsistema(subsistemaAtivo),
    };
  }

  // 3. SETOR_TECNICO (ETP e Mapa de Riscos — STI, Patrimônio, SOBE, DAS, Almoxarifado, etc.)
  if (
    roleUpper === "SETOR_TECNICO" ||
    roleUpper === "ETP" ||
    roleUpper === "ETP_RISCOS"
  ) {
    let setorTec = await prisma.setorTecnico.findFirst({
      where: { email: emailLimpo, ativo: true },
    });

    if (!setorTec && unidadeDb) {
      setorTec = await prisma.setorTecnico.findFirst({
        where: { unidadeId: unidadeDb.id, ativo: true },
      });
    }

    if (!setorTec && (siglaBusca || nomeUnidadeBusca)) {
      setorTec = await prisma.setorTecnico.findFirst({
        where: {
          ativo: true,
          OR: [
            ...(siglaBusca ? [{ nome: { contains: siglaBusca, mode: "insensitive" as const } }] : []),
            ...(nomeUnidadeBusca
              ? [{ nome: { contains: nomeUnidadeBusca, mode: "insensitive" as const } }]
              : []),
            ...(siglaBusca
              ? [{ unidade: { nome: { contains: siglaBusca, mode: "insensitive" as const } } }]
              : []),
          ],
        },
      });
    }

    if (!setorTec) {
      const emailConflito = await prisma.setorTecnico.findUnique({
        where: { email: emailLimpo },
      });
      if (emailConflito) {
        setorTec = await prisma.setorTecnico.update({
          where: { id: emailConflito.id },
          data: { ativo: true, unidadeId: emailConflito.unidadeId || unidadeDb?.id || null },
        });
      } else {
        setorTec = await prisma.setorTecnico.create({
          data: {
            nome: siglaBusca || nomeUnidadeBusca || nome || "Setor Técnico",
            vinculado: Boolean(unidadeDb),
            unidadeId: unidadeDb?.id || null,
            email: emailLimpo,
            senhaHash: "SSO_CENTRAL_UERN_AUTHENTICATED",
            senhaTemporaria: false,
            ativo: true,
          },
        });
      }
    }

    return {
      sessionPayload: {
        tipo: "SETOR_TECNICO",
        id: setorTec.id,
        nome: setorTec.nome,
        email: setorTec.email ?? emailLimpo,
        ...baseUnidadeMeta,
        unidadeId: setorTec.unidadeId || baseUnidadeMeta.unidadeId,
        senhaTemporaria: false,
      },
      subsistemaAtivo: "ETP_RISCOS",
      destinoUrl: "/etp-riscos",
    };
  }

  // 4. PESQUISA_PRECOS
  if (roleUpper === "PESQUISA_PRECOS" || roleUpper === "PESQUISA") {
    let pesq = await prisma.pesquisaPrecos.findUnique({
      where: { email: emailLimpo },
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
    return {
      sessionPayload: {
        tipo: "PESQUISA_PRECOS",
        id: pesq.id,
        nome: pesq.nome,
        email: pesq.email ?? emailLimpo,
        ...baseUnidadeMeta,
        senhaTemporaria: false,
      },
      subsistemaAtivo: "PESQUISA_PRECOS",
      destinoUrl: "/pesquisa-precos",
    };
  }

  // 5. PLANEJAMENTO (Termo de Referência)
  if (
    roleUpper === "PLANEJAMENTO" ||
    roleUpper === "TERMO_REFERENCIA" ||
    roleUpper === "TR"
  ) {
    let plan = await prisma.planejamento.findUnique({
      where: { email: emailLimpo },
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
    return {
      sessionPayload: {
        tipo: "PLANEJAMENTO",
        id: plan.id,
        nome: plan.nome,
        email: plan.email ?? emailLimpo,
        ...baseUnidadeMeta,
        senhaTemporaria: false,
      },
      subsistemaAtivo: "TERMO_REFERENCIA",
      destinoUrl: "/termo-referencia",
    };
  }

  // 6. AGENTE_CONTRATACAO
  if (roleUpper === "AGENTE_CONTRATACAO") {
    let ag = await prisma.agenteContratacao.findUnique({
      where: { email: emailLimpo },
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
    return {
      sessionPayload: {
        tipo: "AGENTE_CONTRATACAO",
        id: ag.id,
        nome: ag.nome,
        email: ag.email ?? emailLimpo,
        ...baseUnidadeMeta,
        senhaTemporaria: false,
      },
      subsistemaAtivo: "LICITACOES_MINUTAS",
      destinoUrl: "/licitacoes",
    };
  }

  // 7. GESTOR_ATA
  if (roleUpper === "GESTOR_ATA") {
    let ga = await prisma.acessoGestorAta.findUnique({
      where: { email: emailLimpo },
    });
    if (!ga && unidadeDb) {
      ga = await prisma.acessoGestorAta.findFirst({
        where: { unidadeId: unidadeDb.id, ativo: true },
      });
    }
    if (!ga) {
      ga = await prisma.acessoGestorAta.create({
        data: {
          nome: siglaBusca || nome || "Setor de Gestão de Atas",
          vinculado: Boolean(unidadeDb),
          unidadeId: unidadeDb?.id || null,
          email: emailLimpo,
          senhaHash: "SSO_CENTRAL_UERN_AUTHENTICATED",
          senhaTemporaria: false,
          ativo: true,
        },
      });
    }
    return {
      sessionPayload: {
        tipo: "GESTOR_ATA",
        id: ga.id,
        nome: ga.nome,
        email: ga.email ?? emailLimpo,
        ...baseUnidadeMeta,
        senhaTemporaria: false,
      },
      subsistemaAtivo: "LICITACOES_MINUTAS",
      destinoUrl: "/",
    };
  }

  // 8. ENTREGA (Patrimônio / Almoxarifado)
  if (roleUpper === "ENTREGA") {
    let ent = await prisma.acessoEntrega.findUnique({
      where: { email: emailLimpo },
    });
    if (!ent && unidadeDb) {
      ent = await prisma.acessoEntrega.findFirst({
        where: { unidadeId: unidadeDb.id, ativo: true },
      });
    }
    const textoRef = `${siglaBusca || ""} ${nomeUnidadeBusca || ""} ${nome}`.toUpperCase();
    const subperfil = textoRef.includes("ALMOX") ? "ALMOXARIFADO" : "PATRIMONIO";
    if (!ent) {
      ent = await prisma.acessoEntrega.findFirst({
        where: { subperfil, ativo: true },
      });
    }
    if (!ent) {
      ent = await prisma.acessoEntrega.create({
        data: {
          nome: siglaBusca || nome || `Entrega (${subperfil})`,
          subperfil,
          vinculado: Boolean(unidadeDb),
          unidadeId: unidadeDb?.id || null,
          email: emailLimpo,
          senhaHash: "SSO_CENTRAL_UERN_AUTHENTICATED",
          senhaTemporaria: false,
          ativo: true,
        },
      });
    }
    return {
      sessionPayload: {
        tipo: "ENTREGA",
        id: ent.id,
        nome: ent.nome,
        email: ent.email ?? emailLimpo,
        ...baseUnidadeMeta,
        senhaTemporaria: false,
      },
      subsistemaAtivo: "PCA",
      destinoUrl: "/",
    };
  }

  // 9. EXECUCAO
  if (roleUpper === "EXECUCAO") {
    let exec = await prisma.acessoExecucao.findUnique({
      where: { email: emailLimpo },
    });
    if (!exec && unidadeDb) {
      exec = await prisma.acessoExecucao.findFirst({
        where: { unidadeId: unidadeDb.id, ativo: true },
      });
    }
    if (!exec) {
      exec = await prisma.acessoExecucao.findFirst({
        where: { ativo: true },
      });
    }
    if (!exec) {
      exec = await prisma.acessoExecucao.create({
        data: {
          nome: siglaBusca || nome || "Execução de Compras e Contratações",
          subperfil: "MATERIAIS_PATRIMONIO",
          vinculado: Boolean(unidadeDb),
          unidadeId: unidadeDb?.id || null,
          email: emailLimpo,
          senhaHash: "SSO_CENTRAL_UERN_AUTHENTICATED",
          senhaTemporaria: false,
          ativo: true,
        },
      });
    }
    return {
      sessionPayload: {
        tipo: "EXECUCAO",
        id: exec.id,
        nome: exec.nome,
        email: exec.email ?? emailLimpo,
        ...baseUnidadeMeta,
        senhaTemporaria: false,
      },
      subsistemaAtivo: "PCA",
      destinoUrl: "/",
    };
  }

  // 10. SETOR_INTERNO ou UNIDADE (Demandante)
  const setorInternoDb = await prisma.setorInterno.findUnique({
    where: { email: emailLimpo },
    include: { unidade: true },
  });

  if (setorInternoDb && setorInternoDb.ativo && (roleUpper === "SETOR_INTERNO" || !unidadeDb)) {
    return {
      sessionPayload: {
        tipo: "SETOR_INTERNO",
        id: setorInternoDb.id,
        nome: setorInternoDb.nome,
        email: setorInternoDb.email,
        unidadeId: setorInternoDb.unidadeId,
        unidadeNome: setorInternoDb.unidade.nome,
        unidadeSigla: opcoes.unidadeSigla || setorInternoDb.unidade.nome,
        perfisDisponiveis,
        senhaTemporaria: false,
      },
      subsistemaAtivo: "PCA",
      destinoUrl: "/",
    };
  }

  // Garante Unidade existente para o perfil UNIDADE
  const siglaFinal = siglaBusca || "PROAD";
  if (!unidadeDb) {
    const emailUnidade = `${siglaFinal.toLowerCase()}_uern@uern.br`;
    const unidadeExistenteEmail = await prisma.unidade.findUnique({
      where: { email: emailUnidade },
    });
    if (unidadeExistenteEmail) {
      unidadeDb = unidadeExistenteEmail;
    } else {
      unidadeDb = await prisma.unidade.create({
        data: {
          nome: siglaFinal,
          email: emailUnidade,
          senhaHash: "SSO_CENTRAL_UERN_AUTHENTICATED",
          senhaTemporaria: false,
          ativa: true,
        },
      });
    }
  }

  const isDiretorOuEnvia = opcoes.permissoesPca?.podeEnviarDfd ?? true;
  let usuarioVinculado = usuarioExistente;

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
        podeCriarDfd: opcoes.permissoesPca?.podeCriarDfd ?? true,
        podeEditarDfd: opcoes.permissoesPca?.podeEditarDfd ?? true,
        podeEnviarDfd: isDiretorOuEnvia,
        podeExcluirDfd: opcoes.permissoesPca?.podeExcluirDfd ?? isDiretorOuEnvia,
        podeSolicitarCatalogo: opcoes.permissoesPca?.podeSolicitarCatalogo ?? true,
        podeSolicitarCotaGeral: opcoes.permissoesPca?.podeSolicitarCotaGeral ?? false,
        podeConfirmarEntrega: opcoes.permissoesPca?.podeConfirmarEntrega ?? true,
        podeGerenciarSetores: opcoes.permissoesPca?.podeGerenciarSetores ?? isDiretorOuEnvia,
        podeEditarDadosUnidade: opcoes.permissoesPca?.podeEditarDadosUnidade ?? isDiretorOuEnvia,
      },
      include: { unidade: true },
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
    podeEditarDadosUnidade:
      usuarioVinculado.podeEditarDadosUnidade || usuarioVinculado.podeEnviarDfd,
  };

  return {
    sessionPayload: {
      tipo: "UNIDADE",
      id: unidadeDb.id,
      nome: unidadeDb.nome,
      email: unidadeDb.email,
      usuarioId: usuarioVinculado.id,
      unidadeId: unidadeDb.id,
      unidadeNome: unidadeDb.nome,
      unidadeSigla: opcoes.unidadeSigla || unidadeDb.nome,
      perfisDisponiveis,
      senhaTemporaria: false,
      permissoes: permissoesSessao,
    },
    subsistemaAtivo: "PCA",
    destinoUrl: "/",
  };
}

export function obterDestinoPorSubsistema(subsistemaAtivo: string): string {
  if (subsistemaAtivo === "PESQUISA_PRECOS") return "/pesquisa-precos";
  if (subsistemaAtivo === "ETP_RISCOS") return "/etp-riscos";
  if (subsistemaAtivo === "TERMO_REFERENCIA") return "/termo-referencia";
  if (subsistemaAtivo === "LICITACOES_MINUTAS") return "/licitacoes";
  return "/";
}
