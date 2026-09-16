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
