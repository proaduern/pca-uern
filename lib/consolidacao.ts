export function normalizarChave(nome: string): string {
  return nome.trim().toLowerCase().replace(/\s+/g, " ");
}

export interface ItemParaAgrupar {
  id: string;
  categoriaId: string;
  nome: string;
  quantidade: number;
  valorTotal: number;
}

export interface GrupoConsolidado {
  categoriaId: string;
  chaveAgrupamento: string;
  nomeItem: string;
  quantidadeTotal: number;
  valorTotal: number;
  itemDfdIds: string[];
}

/**
 * Agrupa itens de DFD por categoria + nome normalizado (ignorando origem:
 * unidade e enquadramento não entram na chave — a consolidação é só por
 * categoria+item, mas cada item de origem continua rastreável por fora
 * desta função, via itemDfdIds).
 */
export function agruparPorCategoriaEItem(itens: ItemParaAgrupar[]): GrupoConsolidado[] {
  const grupos = new Map<string, GrupoConsolidado>();

  for (const item of itens) {
    const chaveAgrupamento = normalizarChave(item.nome);
    const chave = `${item.categoriaId}::${chaveAgrupamento}`;
    const existente = grupos.get(chave);
    if (existente) {
      existente.quantidadeTotal += item.quantidade;
      existente.valorTotal += item.valorTotal;
      existente.itemDfdIds.push(item.id);
    } else {
      grupos.set(chave, {
        categoriaId: item.categoriaId,
        chaveAgrupamento,
        nomeItem: item.nome.trim(),
        quantidadeTotal: item.quantidade,
        valorTotal: item.valorTotal,
        itemDfdIds: [item.id],
      });
    }
  }

  return Array.from(grupos.values());
}
