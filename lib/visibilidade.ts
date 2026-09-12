/**
 * Visibilidade de catálogo/categoria por unidade, extraída do sistema
 * original: cada categoria tem uma regra (modo "todas"/"somente"/"exceto" +
 * lista de unidades); um item de catálogo pode herdar a regra da sua
 * categoria (restricaoModo null) ou sobrescrevê-la individualmente.
 */

export type ModoRestricao = "TODAS" | "SOMENTE" | "EXCETO";

export function visivelPara(
  modo: ModoRestricao,
  idsRestritos: string[],
  unidadeId: string,
): boolean {
  if (modo === "TODAS") return true;
  if (modo === "SOMENTE") return idsRestritos.includes(unidadeId);
  return !idsRestritos.includes(unidadeId);
}

export interface CategoriaComRestricao {
  restricaoModo: ModoRestricao;
  unidadesRestritas: { id: string }[];
}

export function categoriaVisivelPara(
  categoria: CategoriaComRestricao,
  unidadeId: string,
): boolean {
  return visivelPara(
    categoria.restricaoModo,
    categoria.unidadesRestritas.map((u) => u.id),
    unidadeId,
  );
}

export interface ItemCatalogoComRestricao {
  restricaoModo: ModoRestricao | null;
  unidadesRestritas: { id: string }[];
}

export function itemCatalogoVisivelPara(
  item: ItemCatalogoComRestricao,
  categoria: CategoriaComRestricao,
  unidadeId: string,
): boolean {
  if (item.restricaoModo == null) return categoriaVisivelPara(categoria, unidadeId);
  return visivelPara(
    item.restricaoModo,
    item.unidadesRestritas.map((u) => u.id),
    unidadeId,
  );
}
