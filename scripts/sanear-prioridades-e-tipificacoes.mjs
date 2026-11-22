import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 1. As 5 frases oficiais sem viés
export const PRIORIDADES_OFICIAIS_SEM_VIES = [
  {
    frase: "O curso, setor ou atividade essencial pode parar em 2027 sem este item",
    nivel: "ALTISSIMA",
  },
  {
    frase: "Pode comprometer a infraestrutura básica do local, com risco à segurança ou à saúde das pessoas",
    nivel: "ALTISSIMA",
  },
  {
    frase: "O curso será avaliado em 2027 e a falta deste item foi apontada como fragilidade na avaliação do Conselho Estadual de Educação (CEE)",
    nivel: "ALTA",
  },
  {
    frase: "É uma melhoria necessária, mas que não impede o funcionamento nem causa risco à segurança das pessoas",
    nivel: "MEDIA",
  },
  {
    frase: "É uma implementação nova, de um espaço, ação ou projeto ainda não existente",
    nivel: "BAIXA",
  },
];

// 2. As 14 tipificações atômicas padronizadas
export const TIPIFICACOES_OFICIAIS = [
  "Necessidade acadêmica de rotina (nova contratação)",
  "Necessidade administrativa de rotina (nova contratação)",
  "Renovação de contrato de serviço ou fornecimento continuado",
  "Melhoria em sala de aula existente",
  "Melhoria em laboratório existente",
  "Melhoria de espaço administrativo existente",
  "Melhoria de espaço coletivo ou convivência existente",
  "Melhoria de auditório existente",
  "Implementação de novo espaço ou laboratório",
  "Necessidade apontada por comissão de avaliação de curso (CEE)",
  "Inovação ou modernização tecnológica",
  "Realização de evento institucional/acadêmico",
  "Necessidade acadêmica/administrativa de rotina (Fluxo Contínuo)",
  "Outras situações não especificadas",
];

export async function sanearPrioridadesETipificacoes() {
  console.log("[Sanear] Iniciando saneamento de Prioridades e Tipificações...");

  // A) Garantir as 5 Prioridades oficiais
  const prioMap = new Map();
  for (const p of PRIORIDADES_OFICIAIS_SEM_VIES) {
    const criadaOuAtualizada = await prisma.prioridade.upsert({
      where: { frase: p.frase },
      update: { nivel: p.nivel },
      create: { frase: p.frase, nivel: p.nivel },
    });
    prioMap.set(p.nivel, criadaOuAtualizada.id);
    prioMap.set(p.frase, criadaOuAtualizada.id);
  }

  // B) Garantir as 14 Tipificações oficiais
  const tipMap = new Map();
  for (const nome of TIPIFICACOES_OFICIAIS) {
    const criada = await prisma.tipificacao.upsert({
      where: { nome },
      update: {},
      create: { nome },
    });
    tipMap.set(nome.toLowerCase(), criada.id);
  }

  // C) Função de normalização para mapear prioridades antigas para as novas sem viés
  function resolverNovaPrioridade(fraseAntiga, nivelAntigo) {
    const fLow = String(fraseAntiga || "").toLowerCase();
    if (fLow.includes("atividade essencial pode parar") || fLow.includes("setor pode parar") || fLow.includes("curso pode parar")) {
      return prioMap.get("O curso, setor ou atividade essencial pode parar em 2027 sem este item");
    }
    if (fLow.includes("segurança e à saúde") || fLow.includes("segurança ou à saúde") || fLow.includes("infraestrutura básica")) {
      return prioMap.get("Pode comprometer a infraestrutura básica do local, com risco à segurança ou à saúde das pessoas");
    }
    if (fLow.includes("avaliado em 2027") || fLow.includes("conselho estadual de educação") || fLow.includes("cee")) {
      return prioMap.get("O curso será avaliado em 2027 e a falta deste item foi apontada como fragilidade na avaliação do Conselho Estadual de Educação (CEE)");
    }
    if (fLow.includes("implementação nova") || fLow.includes("projeto ainda não existente")) {
      return prioMap.get("É uma implementação nova, de um espaço, ação ou projeto ainda não existente");
    }
    if (fLow.includes("melhoria, mas que não impede") || fLow.includes("não impede funcionamento")) {
      return prioMap.get("É uma melhoria necessária, mas que não impede o funcionamento nem causa risco à segurança das pessoas");
    }
    if (nivelAntigo === "ALTISSIMA") return prioMap.get("O curso, setor ou atividade essencial pode parar em 2027 sem este item");
    if (nivelAntigo === "ALTA") return prioMap.get("O curso será avaliado em 2027 e a falta deste item foi apontada como fragilidade na avaliação do Conselho Estadual de Educação (CEE)");
    if (nivelAntigo === "BAIXA") return prioMap.get("É uma implementação nova, de um espaço, ação ou projeto ainda não existente");
    return prioMap.get("É uma melhoria necessária, mas que não impede o funcionamento nem causa risco à segurança das pessoas");
  }

  // D) Função de normalização para mapear tipificações compostas antigas para as novas atômicas
  function resolverNovaTipificacao(nomeAntigo, tipoDemanda) {
    if (tipoDemanda === "FLUXO_CONTINUO") {
      return tipMap.get("necessidade acadêmica/administrativa de rotina (fluxo contínuo)");
    }
    const nLow = String(nomeAntigo || "").toLowerCase();
    if (nLow.includes("conselho estadual de educação") || nLow.includes("avaliação de curso")) {
      return tipMap.get("necessidade apontada por comissão de avaliação de curso (cee)");
    }
    if (nLow.includes("renovação de contrato")) {
      return tipMap.get("renovação de contrato de serviço ou fornecimento continuado");
    }
    if (nLow.includes("laboratório")) {
      if (nLow.includes("implementação") || nLow.includes("implantação")) return tipMap.get("implementação de novo espaço ou laboratório");
      return tipMap.get("melhoria em laboratório existente");
    }
    if (nLow.includes("sala de aula")) {
      if (nLow.includes("implementação") || nLow.includes("implantação")) return tipMap.get("implementação de novo espaço ou laboratório");
      return tipMap.get("melhoria em sala de aula existente");
    }
    if (nLow.includes("auditório")) {
      if (nLow.includes("implementação") || nLow.includes("implantação")) return tipMap.get("implementação de novo espaço ou laboratório");
      return tipMap.get("melhoria de auditório existente");
    }
    if (nLow.includes("espaço administrativo")) {
      if (nLow.includes("implementação") || nLow.includes("implantação")) return tipMap.get("implementação de novo espaço ou laboratório");
      return tipMap.get("melhoria de espaço administrativo existente");
    }
    if (nLow.includes("espaço coletivo") || nLow.includes("convivência")) {
      if (nLow.includes("implementação") || nLow.includes("implantação")) return tipMap.get("implementação de novo espaço ou laboratório");
      return tipMap.get("melhoria de espaço coletivo ou convivência existente");
    }
    if (nLow.includes("evento")) {
      return tipMap.get("realização de evento institucional/acadêmico");
    }
    if (nLow.includes("inovação") || nLow.includes("atualização tecnológica")) {
      return tipMap.get("inovação ou modernização tecnológica");
    }
    if (nLow.includes("manutenção")) {
      return tipMap.get("necessidade administrativa de rotina (nova contratação)");
    }
    if (nLow.includes("acadêmica de rotina")) {
      return tipMap.get("necessidade acadêmica de rotina (nova contratação)");
    }
    if (nLow.includes("administrativa de rotina")) {
      return tipMap.get("necessidade administrativa de rotina (nova contratação)");
    }
    if (nLow.includes("fluxo contínuo")) {
      return tipMap.get("necessidade acadêmica/administrativa de rotina (fluxo contínuo)");
    }
    return tipMap.get("outras situações não especificadas");
  }

  // E) Atualizar todos os DFDs
  const todasTipificacoesDb = await prisma.tipificacao.findMany();
  const tipNomeById = new Map(todasTipificacoesDb.map((t) => [t.id, t.nome]));

  const todosDfds = await prisma.dfd.findMany({
    include: { prioridade: true },
  });
  console.log(`[Sanear] Atualizando prioridade e tipificação de ${todosDfds.length} DFDs...`);

  for (const dfd of todosDfds) {
    const nomeTipAntiga = dfd.tipificacaoId ? tipNomeById.get(dfd.tipificacaoId) : null;
    const novoPrioId = resolverNovaPrioridade(dfd.prioridade?.frase, dfd.prioridade?.nivel);
    const novoTipId = resolverNovaTipificacao(nomeTipAntiga, dfd.tipoDemanda);
    await prisma.dfd.update({
      where: { id: dfd.id },
      data: {
        prioridadeId: novoPrioId,
        tipificacaoId: novoTipId,
      },
    });
  }

  // F) Limpar registros órfãos antigos de Prioridade e Tipificacao
  const idsPrioridadesOficiais = new Set(
    (await prisma.prioridade.findMany({
      where: { frase: { in: PRIORIDADES_OFICIAIS_SEM_VIES.map((p) => p.frase) } },
    })).map((p) => p.id)
  );

  const idsTipificacoesOficiais = new Set(
    (await prisma.tipificacao.findMany({
      where: { nome: { in: TIPIFICACOES_OFICIAIS } },
    })).map((t) => t.id)
  );

  const deletadasPrio = await prisma.prioridade.deleteMany({
    where: { id: { notIn: Array.from(idsPrioridadesOficiais) } },
  });
  console.log(`[Sanear] ${deletadasPrio.count} prioridades antigas com viés ou legadas foram removidas.`);

  const deletadasTip = await prisma.tipificacao.deleteMany({
    where: { id: { notIn: Array.from(idsTipificacoesOficiais) } },
  });
  console.log(`[Sanear] ${deletadasTip.count} tipificações compostas foram removidas.`);

  console.log("[Sanear] Saneamento concluído com sucesso!");
}

if (process.argv[1] && process.argv[1].endsWith("sanear-prioridades-e-tipificacoes.mjs")) {
  sanearPrioridadesETipificacoes()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
}
