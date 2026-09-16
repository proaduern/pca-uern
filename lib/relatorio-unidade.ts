import { arredondarCentavos } from "./cota";

export interface ItemParaRelatorio {
  categoriaNome: string;
  nome: string;
  quantidade: number | null;
  valorUnit: number | null;
  valorTotal: number;
}

export function totalDosItens(itens: { valorTotal: number }[]): number {
  return arredondarCentavos(itens.reduce((s, it) => s + it.valorTotal, 0));
}

export interface TotalPorCategoria {
  categoria: string;
  total: number;
}

/** Soma o valor dos itens por categoria, do maior para o menor — ajuda o
 * demandante a ver de cara quais categorias mais pesam no orçamento. */
export function computarPorCategoria(itens: { categoriaNome: string; valorTotal: number }[]): TotalPorCategoria[] {
  const mapa = new Map<string, number>();
  for (const it of itens) {
    mapa.set(it.categoriaNome, (mapa.get(it.categoriaNome) ?? 0) + it.valorTotal);
  }
  return [...mapa.entries()]
    .map(([categoria, total]) => ({ categoria, total: arredondarCentavos(total) }))
    .sort((a, b) => b.total - a.total);
}

export interface GrupoPorCategoria {
  categoriaNome: string;
  itens: ItemParaRelatorio[];
  subtotal: number;
}

/** Agrupa os itens por categoria, em ordem alfabética, com subtotal por
 * grupo — usado no relatório geral de itens, que deve vir "separado por
 * categoria" em vez de listado corrido. */
export function agruparPorCategoria(itens: ItemParaRelatorio[]): GrupoPorCategoria[] {
  const mapa = new Map<string, ItemParaRelatorio[]>();
  for (const it of itens) {
    const lista = mapa.get(it.categoriaNome) ?? [];
    lista.push(it);
    mapa.set(it.categoriaNome, lista);
  }
  return [...mapa.entries()]
    .map(([categoriaNome, itensDaCategoria]) => ({
      categoriaNome,
      itens: itensDaCategoria,
      subtotal: totalDosItens(itensDaCategoria),
    }))
    .sort((a, b) => a.categoriaNome.localeCompare(b.categoriaNome, "pt-BR"));
}
