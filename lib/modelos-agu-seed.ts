"use server";

import { prisma } from "@/lib/prisma";
import { obterSessao } from "@/lib/auth";
import type { ResultadoAcao } from "@/lib/actions/tipos";

export interface ModeloAguDef {
  tipo: "TR" | "EDITAL" | "CONTRATO" | "ATA_RP" | "LISTA_VERIFICACAO" | "TERMO_JUSTIFICATIVAS_ENG";
  objetoNatureza:
    | "COMPRAS"
    | "SERVICOS_SEM_MAO_DE_OBRA"
    | "SERVICOS_COM_MAO_DE_OBRA"
    | "OBRAS_ENGENHARIA"
    | "MENOR_PRECO_MAIOR_DESCONTO"
    | "TECNICA_E_PRECO"
    | "GERAL";
  titulo: string;
  descricao: string;
  versaoAgu: string;
  arquivoDocxNome: string;
}

const MODELOS_AGU_INICIAIS: ModeloAguDef[] = [
  // 1. TR COMPRAS
  {
    tipo: "TR",
    objetoNatureza: "COMPRAS",
    titulo: "Termo de Referência — Compras (Lei nº 14.133/2021)",
    descricao: "Modelo AGU padronizado para aquisição de bens e materiais de consumo e permanentes.",
    versaoAgu: "DEZ/2025",
    arquivoDocxNome: "modelo-de-termo-de-referencia-compras-lei-no-14-133-dez-25.docx",
  },
  // 2. CONTRATO COMPRAS
  {
    tipo: "CONTRATO",
    objetoNatureza: "COMPRAS",
    titulo: "Termo de Contrato — Compras (Lei nº 14.133/2021)",
    descricao: "Minuta padronizada de contrato para aquisição de bens e fornecimento.",
    versaoAgu: "DEZ/2025",
    arquivoDocxNome: "modelo-de-termo-de-contrato-compras-lei-no-14-133-dez-25.docx",
  },
  // 3. CHECKLIST COMPRAS E SERV SEM
  {
    tipo: "LISTA_VERIFICACAO",
    objetoNatureza: "COMPRAS",
    titulo: "Lista de Verificação — Compras e Serviços sem Dedicação Exclusiva",
    descricao: "Checklist AGU para instrução da fase preparatória e pré-editalícia.",
    versaoAgu: "SET/2024",
    arquivoDocxNome: "modelo-de-lista-de-verificacao-compras-e-servicos-sem-mao-de-obra-exclusiva-lei-no-14-133-set-24.docx",
  },
  // 4. TR SERVIÇOS E OBRAS
  {
    tipo: "TR",
    objetoNatureza: "SERVICOS_SEM_MAO_DE_OBRA",
    titulo: "Termo de Referência — Serviços em Geral e Obras (Lei nº 14.133/2021)",
    descricao: "Modelo AGU para contratação de serviços continuados ou não continuados e obras.",
    versaoAgu: "MAI/2026",
    arquivoDocxNome: "modelo-de-termo-de-referencia-servicos-e-obras-lei-no-14-133-mai-26.docx",
  },
  // 5. CONTRATO SERVIÇO COM MÃO DE OBRA
  {
    tipo: "CONTRATO",
    objetoNatureza: "SERVICOS_COM_MAO_DE_OBRA",
    titulo: "Termo de Contrato — Serviços com Regime de Dedicação Exclusiva de Mão de Obra",
    descricao: "Minuta de contrato com cláusulas específicas de terceirização, fiscalização de encargos trabalhistas e IMR.",
    versaoAgu: "DEZ/2025",
    arquivoDocxNome: "modelo-de-termo-de-contrato-servico-com-mao-de-obra-exclusiva-lei-no-14-133-dez-25.docx",
  },
  // 6. CHECKLIST SERVIÇO COM MÃO DE OBRA
  {
    tipo: "LISTA_VERIFICACAO",
    objetoNatureza: "SERVICOS_COM_MAO_DE_OBRA",
    titulo: "Lista de Verificação — Serviços com Mão de Obra Exclusiva",
    descricao: "Checklist AGU para processos licitatórios com dedicação exclusiva de mão de obra.",
    versaoAgu: "SET/2024",
    arquivoDocxNome: "modelo-de-lista-de-verificacao-servicos-com-mao-de-obra-exclusiva-lei-no-14-133-set-24.docx",
  },
  // 7. CONTRATO SERVIÇO SEM MÃO DE OBRA
  {
    tipo: "CONTRATO",
    objetoNatureza: "SERVICOS_SEM_MAO_DE_OBRA",
    titulo: "Termo de Contrato — Serviços sem Regime de Dedicação Exclusiva de Mão de Obra",
    descricao: "Minuta de contrato para serviços ordinários, manutenção, consultorias e técnicos.",
    versaoAgu: "DEZ/2025",
    arquivoDocxNome: "modelo-de-termo-de-contrato-servico-sem-mao-de-obra-exclusiva-lei-no-14-133-dez-25.docx",
  },
  // 8. CONTRATO ENGENHARIA
  {
    tipo: "CONTRATO",
    objetoNatureza: "OBRAS_ENGENHARIA",
    titulo: "Termo de Contrato — Obras e Serviços de Engenharia (Lei nº 14.133/2021)",
    descricao: "Minuta de contrato para obras públicas, reformas e serviços técnicos de engenharia.",
    versaoAgu: "DEZ/2025",
    arquivoDocxNome: "modelo-de-termo-de-contrato-obras-e-servicos-de-engenharia-lei-no-14-133-dez-25.docx",
  },
  // 9. CHECKLIST ENGENHARIA
  {
    tipo: "LISTA_VERIFICACAO",
    objetoNatureza: "OBRAS_ENGENHARIA",
    titulo: "Lista de Verificação — Obras e Serviços de Engenharia",
    descricao: "Checklist AGU para conformidade jurídica de projetos básicos e executivos de engenharia.",
    versaoAgu: "SET/2024",
    arquivoDocxNome: "modelo-de-lista-de-verificacao-obras-e-servicos-de-engenharia-lei-no-14-133-set-24.docx",
  },
  // 10. TERMO DE JUSTIFICATIVAS ENGENHARIA
  {
    tipo: "TERMO_JUSTIFICATIVAS_ENG",
    objetoNatureza: "OBRAS_ENGENHARIA",
    titulo: "Termo de Justificativas Técnicas Relevantes — Obras e Serviços de Engenharia",
    descricao: "Documento técnico prévio da equipe de engenharia da PROAD/UERN fundamentando soluções e parcelamento.",
    versaoAgu: "LEI 14.133/2021",
    arquivoDocxNome: "termo-de-justificativas-tecnicas-relevantes-obras-e-servicos-engenharia-lei-14-133.docx",
  },
  // 11. ATA DE REGISTRO DE PREÇOS (SRP)
  {
    tipo: "ATA_RP",
    objetoNatureza: "GERAL",
    titulo: "Ata de Registro de Preços — Lei nº 14.133/2021",
    descricao: "Modelo oficial AGU de Ata de Registro de Preços aplicável a compras e serviços.",
    versaoAgu: "NOV/2025",
    arquivoDocxNome: "modelo-de-ata-de-registro-de-precos-lei-ndeg-14-133-nov-25.docx",
  },
  // 12. EDITAL MENOR PREÇO / MAIOR DESCONTO
  {
    tipo: "EDITAL",
    objetoNatureza: "MENOR_PRECO_MAIOR_DESCONTO",
    titulo: "Edital — Pregão Eletrônico e Concorrência (Menor Preço ou Maior Desconto)",
    descricao: "Modelo unificado AGU para licitações com critério de menor preço por item/lote ou maior desconto.",
    versaoAgu: "NOV/2025",
    arquivoDocxNome: "modelo-de-edital-pregao-e-concorrencia-menor-preco-e-maior-desconto-lei-no-14-133-nov-25.docx",
  },
  // 13. EDITAL TÉCNICA E PREÇO
  {
    tipo: "EDITAL",
    objetoNatureza: "TECNICA_E_PRECO",
    titulo: "Edital — Concorrência (Critério de Julgamento: Técnica e Preço)",
    descricao: "Modelo AGU para contratações de serviços predominantemente intelectuais e projetos especiais.",
    versaoAgu: "ABR/2026",
    arquivoDocxNome: "modelo-de-edital-concorrencia-tecnica-e-preco-lei-no-14-133-abr-26.docx",
  },
];

/**
 * Garante que os 14 modelos AGU estejam catalogados no banco
 */
export async function garantirCargaModelosAgu() {
  const total = await prisma.modeloDocumentoAgu.count();
  if (total >= MODELOS_AGU_INICIAIS.length) return;

  for (const m of MODELOS_AGU_INICIAIS) {
    const existe = await prisma.modeloDocumentoAgu.findFirst({
      where: {
        tipo: m.tipo,
        objetoNatureza: m.objetoNatureza,
        versaoAgu: m.versaoAgu,
      },
    });

    if (!existe) {
      await prisma.modeloDocumentoAgu.create({
        data: {
          tipo: m.tipo,
          objetoNatureza: m.objetoNatureza,
          titulo: m.titulo,
          descricao: m.descricao,
          versaoAgu: m.versaoAgu,
          arquivoDocxNome: m.arquivoDocxNome,
          ativo: true,
          atualizadoPor: "Carga Inicial Padronizada AGU",
        },
      });
    }
  }
}

/**
 * Upload de novo modelo AGU pelo Diretor de Licitações
 */
export async function uploadNovoModeloAguAction(formData: FormData): Promise<ResultadoAcao> {
  const sessao = await obterSessao();
  if (!sessao || (sessao.tipo !== "LICITACOES" && sessao.tipo !== "ADMIN")) {
    return { erro: "Acesso restrito ao Diretor de Licitações e Administrador Geral." };
  }

  const tipo = String(formData.get("tipo") ?? "").trim();
  const objetoNatureza = String(formData.get("objetoNatureza") ?? "").trim();
  const titulo = String(formData.get("titulo") ?? "").trim();
  const versaoAgu = String(formData.get("versaoAgu") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim() || null;
  const arquivo = formData.get("arquivo") as File | null;

  if (!tipo || !objetoNatureza || !titulo || !versaoAgu) {
    return { erro: "Preencha todos os campos obrigatórios (tipo, objeto, título e versão AGU)." };
  }

  const arquivoDocxNome = arquivo ? arquivo.name : `modelo-${tipo.toLowerCase()}-${versaoAgu.toLowerCase().replace(/\//g, "-")}.docx`;

  // Desativa versão anterior do mesmo tipo e objeto
  await prisma.modeloDocumentoAgu.updateMany({
    where: { tipo, objetoNatureza },
    data: { ativo: false },
  });

  await prisma.modeloDocumentoAgu.create({
    data: {
      tipo,
      objetoNatureza,
      titulo,
      descricao,
      versaoAgu,
      arquivoDocxNome,
      ativo: true,
      atualizadoPor: `${sessao.nome} (${new Date().toLocaleDateString("pt-BR")})`,
    },
  });

  return {};
}

export async function listarModelosAguAction() {
  await garantirCargaModelosAgu();
  return prisma.modeloDocumentoAgu.findMany({
    orderBy: [{ tipo: "asc" }, { objetoNatureza: "asc" }, { createdAt: "desc" }],
  });
}
