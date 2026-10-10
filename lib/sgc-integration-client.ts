import { prisma } from "@/lib/prisma";

export interface DadosFornecedorVencedor {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia?: string;
  email?: string;
  telefone?: string;
}

export interface ResultadoDespachoSgc {
  sucesso: boolean;
  mensagem: string;
  tipo?: "ATA" | "CONTRATO";
  id?: string;
  numeroRegistro?: string;
  destinoRoteamento?: string;
}

/**
 * Despacha os dados homologados da licitação no PCA diretamente para o SGC
 * Cria automaticamente Ata de Registro de Preços (SRP) ou Contrato/Empenho no SGC
 */
export async function despacharHomologacaoParaSgc(
  consolidacaoId: string,
  fornecedorInfo?: DadosFornecedorVencedor,
  empenhoSubstituiContrato: boolean = false,
): Promise<ResultadoDespachoSgc> {
  try {
    const consolidacao = await prisma.consolidacaoTecnica.findUnique({
      where: { id: consolidacaoId },
      include: {
        categoria: true,
        itensDfd: {
          where: { resultadoHomologacao: "SUCESSO" },
          include: { dfd: { include: { unidade: true } } },
        },
        itensTecnicos: {
          where: { resultadoHomologacao: "SUCESSO" },
        },
      },
    });

    if (!consolidacao) {
      return { sucesso: false, mensagem: "Consolidação técnica não encontrada." };
    }

    const totalItens = consolidacao.itensDfd.length + consolidacao.itensTecnicos.length;
    if (totalItens === 0) {
      return { sucesso: false, mensagem: "Não há itens homologados com êxito (SUCESSO) nesta consolidação." };
    }

    const fornecedor = fornecedorInfo || {
      cnpj: "00000000000191",
      razaoSocial: "FORNECEDOR HOMOLOGADO CERTAME UERN",
      nomeFantasia: "FORNECEDOR HOMOLOGADO CERTAME UERN",
      email: "licitacoes.fornecedor@uern.br",
      telefone: "(84) 3315-2000",
    };

    const itensMapeados = [
      ...consolidacao.itensDfd.map((it, idx) => ({
        origemPcaItemId: it.id,
        numeroItem: idx + 1,
        descricao: it.itemCatalogoNome || it.itemNomeLivre || "Item Homologado",
        unidade: "UN",
        quantidade: Number(it.quantidade || 1),
        valorUnitario: it.valorUnit ? Number(it.valorUnit) : (Number(it.valorAdjudicado || 0) / Number(it.quantidade || 1)),
        valorTotal: Number(it.valorAdjudicado || it.valorTotal || 0),
        tipoCategoria: it.tipo as "MATERIAL" | "SERVICO",
        demandanteNome: it.dfd.unidade.nome,
        cidade: "Mossoró",
      })),
      ...consolidacao.itensTecnicos.map((it, idx) => ({
        origemPcaItemId: it.id,
        numeroItem: consolidacao.itensDfd.length + idx + 1,
        descricao: it.item || "Item Técnico Homologado",
        unidade: "UN",
        quantidade: Number(it.quantidade || 1),
        valorUnitario: Number(it.valorUnit || 0),
        valorTotal: Number(it.valorAdjudicado || it.valorTotal || 0),
        tipoCategoria: consolidacao.categoria.tipo as "MATERIAL" | "SERVICO",
        demandanteNome: "Setor Técnico",
        cidade: "Mossoró",
      })),
    ];

    const valorGlobal = itensMapeados.reduce((acc, it) => acc + it.valorTotal, 0);
    const sgcBaseUrl = process.env.SGC_API_URL || "http://localhost:3001";
    const serviceKey = process.env.PROAD_SERVICE_KEY || "proad_interop_internal_service_key_2026_uern";

    const payload = {
      consolidacaoId: consolidacao.id,
      processoSei: consolidacao.processoSEI,
      objeto: `Contratação de ${consolidacao.categoria.nome} - Processo SEI ${consolidacao.processoSEI}`,
      tipoContratacao: consolidacao.tipoContratacao, // "ATA" ou "NORMAL"
      empenhoSubstituiContrato,
      vigenciaInicio: new Date().toISOString(),
      vigenciaFim: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      fornecedor,
      itens: itensMapeados,
      valorGlobal,
      ano: consolidacao.pcaAno,
    };

    const response = await fetch(`${sgcBaseUrl}/api/integracao/pca/receber-homologacao`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { sucesso: false, mensagem: err.error || `Erro HTTP ${response.status} ao comunicar com SGC` };
    }

    const resultadoSgc = await response.json();

    // Atualiza os itens do PCA com as referências criadas no SGC
    const statusExecInicial = consolidacao.tipoContratacao === "ATA"
      ? "REGISTRADO_EM_ATA"
      : empenhoSubstituiContrato
      ? "EMPENHO_DIRETO"
      : "EM_FORMALIZACAO";

    await prisma.itemDfd.updateMany({
      where: { consolidacaoTecnicaId: consolidacaoId, resultadoHomologacao: "SUCESSO" },
      data: {
        sgcContratoId: resultadoSgc.tipo === "CONTRATO" ? resultadoSgc.id : null,
        sgcAtaId: resultadoSgc.tipo === "ATA" ? resultadoSgc.id : null,
        sgcNumeroAta: resultadoSgc.tipo === "ATA" ? resultadoSgc.numeroRegistro : null,
        sgcFornecedorNome: fornecedor.razaoSocial,
        sgcFornecedorCnpj: fornecedor.cnpj,
        sgcStatusExecucao: statusExecInicial,
      },
    });

    return {
      sucesso: true,
      mensagem: resultadoSgc.mensagem,
      tipo: resultadoSgc.tipo,
      id: resultadoSgc.id,
      numeroRegistro: resultadoSgc.numeroRegistro,
      destinoRoteamento: resultadoSgc.destinoRoteamento,
    };
  } catch (err: any) {
    console.error("Erro ao despachar homologação para o SGC:", err);
    return { sucesso: false, mensagem: `Erro de comunicação: ${err.message}` };
  }
}
