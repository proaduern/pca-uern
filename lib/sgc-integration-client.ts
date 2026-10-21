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

    const fornecedorPadrao = fornecedorInfo || {
      cnpj: consolidacao.itensDfd[0]?.fornecedorVencedorCnpj || consolidacao.itensTecnicos[0]?.fornecedorVencedorCnpj || "00000000000191",
      razaoSocial: consolidacao.itensDfd[0]?.fornecedorVencedorNome || consolidacao.itensTecnicos[0]?.fornecedorVencedorNome || "FORNECEDOR HOMOLOGADO CERTAME UERN",
      nomeFantasia: consolidacao.itensDfd[0]?.fornecedorVencedorNome || consolidacao.itensTecnicos[0]?.fornecedorVencedorNome || "FORNECEDOR HOMOLOGADO CERTAME UERN",
      email: consolidacao.itensDfd[0]?.fornecedorVencedorEmail || "licitacoes.fornecedor@uern.br",
      telefone: consolidacao.itensDfd[0]?.fornecedorVencedorTelefone || "(84) 3315-2000",
    };

    // IMPORTANTE: O preço enviado ao SGC é SEMPRE o PREÇO REAL DA HOMOLOGAÇÃO
    // (valorUnitarioHomologado e valorAdjudicado lançados pelo Agente de Contratação),
    // e NUNCA o preço inicial do DFD ou o preço estimado da pesquisa!
    const itensMapeados = [
      ...consolidacao.itensDfd.map((it, idx) => {
        const qtd = Number(it.quantidade || 1);
        const totalHomologado = Number(it.valorAdjudicado ?? 0);
        const unitHomologado =
          it.valorUnitarioHomologado != null
            ? Number(it.valorUnitarioHomologado)
            : qtd > 0
            ? Number((totalHomologado / qtd).toFixed(2))
            : totalHomologado;
        return {
          origemPcaItemId: it.id,
          numeroItem: idx + 1,
          descricao: it.itemCatalogoNome || it.itemNomeLivre || "Item Homologado",
          unidade: "UN",
          quantidade: qtd,
          valorUnitario: unitHomologado,
          valorTotal: totalHomologado > 0 ? totalHomologado : Number((unitHomologado * qtd).toFixed(2)),
          tipoCategoria: it.tipo as "MATERIAL" | "SERVICO",
          demandanteNome: it.dfd.unidade.nome,
          cidade: "Mossoró",
          fornecedorCnpj: it.fornecedorVencedorCnpj || fornecedorPadrao.cnpj,
          fornecedorRazaoSocial: it.fornecedorVencedorNome || fornecedorPadrao.razaoSocial,
          fornecedorEmail: it.fornecedorVencedorEmail || fornecedorPadrao.email,
          fornecedorTelefone: it.fornecedorVencedorTelefone || fornecedorPadrao.telefone,
        };
      }),
      ...consolidacao.itensTecnicos.map((it, idx) => {
        const qtd = Number(it.quantidade || 1);
        const totalHomologado = Number(it.valorAdjudicado ?? 0);
        const unitHomologado =
          it.valorUnitarioHomologado != null
            ? Number(it.valorUnitarioHomologado)
            : qtd > 0
            ? Number((totalHomologado / qtd).toFixed(2))
            : totalHomologado;
        return {
          origemPcaItemId: it.id,
          numeroItem: consolidacao.itensDfd.length + idx + 1,
          descricao: it.item || "Item Técnico Homologado",
          unidade: "UN",
          quantidade: qtd,
          valorUnitario: unitHomologado,
          valorTotal: totalHomologado > 0 ? totalHomologado : Number((unitHomologado * qtd).toFixed(2)),
          tipoCategoria: consolidacao.categoria.tipo as "MATERIAL" | "SERVICO",
          demandanteNome: "Setor Técnico",
          cidade: "Mossoró",
          fornecedorCnpj: it.fornecedorVencedorCnpj || fornecedorPadrao.cnpj,
          fornecedorRazaoSocial: it.fornecedorVencedorNome || fornecedorPadrao.razaoSocial,
          fornecedorEmail: it.fornecedorVencedorEmail || fornecedorPadrao.email,
          fornecedorTelefone: it.fornecedorVencedorTelefone || fornecedorPadrao.telefone,
        };
      }),
    ];

    // Agrupa pacotes por CNPJ de empresa vencedora (suporta 1 ou múltiplas empresas vencedoras por item/grupo)
    const pacotesMap = new Map<string, { fornecedor: DadosFornecedorVencedor; itens: typeof itensMapeados }>();
    for (const item of itensMapeados) {
      const chaveCnpj = (item.fornecedorCnpj || fornecedorPadrao.cnpj).replace(/\D/g, "") || "00000000000191";
      const atual = pacotesMap.get(chaveCnpj);
      if (atual) {
        atual.itens.push(item);
      } else {
        pacotesMap.set(chaveCnpj, {
          fornecedor: {
            cnpj: item.fornecedorCnpj || fornecedorPadrao.cnpj,
            razaoSocial: item.fornecedorRazaoSocial || fornecedorPadrao.razaoSocial,
            nomeFantasia: item.fornecedorRazaoSocial || fornecedorPadrao.razaoSocial,
            email: item.fornecedorEmail || fornecedorPadrao.email,
            telefone: item.fornecedorTelefone || fornecedorPadrao.telefone,
          },
          itens: [item],
        });
      }
    }
    const pacotesFornecedores = Array.from(pacotesMap.values());

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
      fornecedor: fornecedorPadrao,
      itens: itensMapeados,
      pacotesFornecedores,
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
      : "AGUARDANDO_EMPENHO";

    for (const it of consolidacao.itensDfd) {
      await prisma.itemDfd.update({
        where: { id: it.id },
        data: {
          sgcContratoId: resultadoSgc.tipo === "CONTRATO" ? resultadoSgc.id : null,
          sgcAtaId: resultadoSgc.tipo === "ATA" ? resultadoSgc.id : null,
          sgcNumeroAta: resultadoSgc.tipo === "ATA" ? resultadoSgc.numeroRegistro : null,
          sgcFornecedorNome: it.fornecedorVencedorNome || fornecedorPadrao.razaoSocial,
          sgcFornecedorCnpj: it.fornecedorVencedorCnpj || fornecedorPadrao.cnpj,
          sgcStatusExecucao: statusExecInicial,
        },
      });
    }

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
