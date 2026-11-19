/**
 * Regramento de Benefício às Microempresas e Empresas de Pequeno Porte (ME/EPP)
 * nas contratações públicas da UERN:
 * - Lei Complementar Federal nº 123/2006 (Art. 47 a 49)
 * - Lei Complementar Estadual nº 675, de 06 de novembro de 2020 - Rio Grande do Norte (Arts. 42 a 46)
 *
 * Art. 42 da LC 675/2020-RN: Exclusividade ME/EPP até R$ 200.000,00 por item ou lote.
 * Art. 44 da LC 675/2020-RN: Cota reservada de até 25% para ME/EPP em bens divisíveis acima de R$ 200.000,00.
 */

export interface ItemParaRegramentoMpe {
  ordem?: number;
  numeroItem?: number;
  item?: string;
  descricao?: string;
  quantidade: number;
  unidadeMedida?: string;
  valorUnitarioEstimado: number;
  valorTotalEstimado: number;
  divisivel?: boolean;
  unidadesDemandantes?: string | null;
  catmatOuCatser?: string | null;
}

export type TipoEnquadramentoMpe =
  | "EXCLUSIVO_MPE_80K"
  | "EXCLUSIVO_MPE_200K_ESTADUAL"
  | "DIVISIVEL_COTA_RESERVADA"
  | "AMPLA_CONCORRENCIA";

export interface ItemDesdobradoMpe {
  ordemExibicao: string; // Ex: "1", "2.1", "2.2"
  itemOriginal: string;
  descricaoExibicao: string;
  descricao: string; // alias para descricaoExibicao
  quantidade: number;
  unidadeMedida: string;
  valorUnitarioEstimado: number;
  valorTotalEstimado: number;
  tipoEnquadramento: TipoEnquadramentoMpe;
  cotaRotulo:
    | "Exclusivo ME/EPP"
    | "Cota Principal (Ampla Concorrência - 75%)"
    | "Cota Reservada (ME/EPP - até 25%)"
    | "Ampla Concorrência";
  enquadramentoTexto: string; // alias para cotaRotulo
  fundamentacaoLegal: string;
  unidadesDemandantes?: string | null;
  catmatOuCatser?: string | null;
  isCotaReservada: boolean;
}

export function analisarItemMpe(item: ItemParaRegramentoMpe): {
  tipo: TipoEnquadramentoMpe;
  cotaPrincipalQtd: number;
  cotaReservadaQtd: number;
  fundamentacao: string;
} {
  const valorTotal = item.valorTotalEstimado;
  const divisivel = item.divisivel !== false; // padrão divisível a menos que explicitado

  // 1. Até R$ 80.000,00: Exclusividade Federal (LC 123/2006 art. 48, I c/c LC 675/2020 art. 42)
  if (valorTotal <= 80000) {
    return {
      tipo: "EXCLUSIVO_MPE_80K",
      cotaPrincipalQtd: 0,
      cotaReservadaQtd: item.quantidade,
      fundamentacao:
        "Art. 48, I da Lei Complementar nº 123/2006 c/c Art. 42 da LC Estadual nº 675/2020-RN (Exclusividade ME/EPP até R$ 80.000,00)",
    };
  }

  // 2. Acima de R$ 80.000,00 até R$ 200.000,00: Exclusividade Estadual Ampliada (Art. 42, caput e § 6º da LC 675/2020-RN)
  if (valorTotal <= 200000) {
    return {
      tipo: "EXCLUSIVO_MPE_200K_ESTADUAL",
      cotaPrincipalQtd: 0,
      cotaReservadaQtd: item.quantidade,
      fundamentacao:
        "Art. 42 da Lei Complementar Estadual nº 675/2020-RN (Exclusividade ME/EPP no âmbito do Estado do Rio Grande do Norte até R$ 200.000,00)",
    };
  }

  // 3. Acima de R$ 200.000,00
  if (divisivel && item.quantidade > 1) {
    // Bem de natureza divisível: Cota Reservada de até 25% para ME/EPP (Art. 44 da LC 675/2020-RN)
    // Calcula 25% arredondado para baixo ou no mínimo 1 unidade se quantidade viabilizar
    let cotaReservada = Math.floor(item.quantidade * 0.25);
    if (cotaReservada === 0 && item.quantidade >= 4) {
      cotaReservada = 1;
    }
    const cotaPrincipal = item.quantidade - cotaReservada;

    return {
      tipo: "DIVISIVEL_COTA_RESERVADA",
      cotaPrincipalQtd: cotaPrincipal,
      cotaReservadaQtd: cotaReservada,
      fundamentacao:
        "Art. 44 da Lei Complementar Estadual nº 675/2020-RN e Art. 48, III da LC 123/2006 (Cota Principal 75% Ampla Concorrência e Cota Reservada de até 25% para ME/EPP)",
    };
  }

  // Objeto indivisível acima de R$ 200.000,00: Ampla concorrência com margem/empate ficto
  return {
    tipo: "AMPLA_CONCORRENCIA",
    cotaPrincipalQtd: item.quantidade,
    cotaReservadaQtd: 0,
    fundamentacao:
      "Art. 44, § 1º da LC Estadual nº 675/2020-RN (Objeto de natureza indivisível acima de R$ 200.000,00 - Ampla Concorrência)",
  };
}

/**
 * Desdobra a lista consolidada de itens aplicando as cotas e exclusividades da LC 675/2020-RN.
 * Se o item for divisível acima de R$ 200k, gera 2 itens na lista (.1 Ampla Concorrência e .2 Cota Reservada ME/EPP).
 */
export function desdobrarItensComRegramentoMpe(
  itens: ItemParaRegramentoMpe[],
): ItemDesdobradoMpe[] {
  const resultado: ItemDesdobradoMpe[] = [];

  for (let i = 0; i < itens.length; i++) {
    const it = itens[i];
    const numItem = it.ordem ?? it.numeroItem ?? i + 1;
    const nomeItem = it.item || it.descricao || "Item sem descrição";
    const unidadeMedida = it.unidadeMedida || "un";
    const analise = analisarItemMpe(it);

    if (
      analise.tipo === "EXCLUSIVO_MPE_80K" ||
      analise.tipo === "EXCLUSIVO_MPE_200K_ESTADUAL"
    ) {
      const rotulo = "Exclusivo ME/EPP";
      resultado.push({
        ordemExibicao: String(numItem),
        itemOriginal: nomeItem,
        descricaoExibicao: `${nomeItem} [PARTICIPAÇÃO EXCLUSIVA ME/EPP/MEI]`,
        descricao: `${nomeItem} [PARTICIPAÇÃO EXCLUSIVA ME/EPP/MEI]`,
        quantidade: it.quantidade,
        unidadeMedida,
        valorUnitarioEstimado: it.valorUnitarioEstimado,
        valorTotalEstimado: it.valorTotalEstimado,
        tipoEnquadramento: analise.tipo,
        cotaRotulo: rotulo,
        enquadramentoTexto: rotulo,
        fundamentacaoLegal: analise.fundamentacao,
        unidadesDemandantes: it.unidadesDemandantes,
        catmatOuCatser: it.catmatOuCatser,
        isCotaReservada: false,
      });
    } else if (analise.tipo === "DIVISIVEL_COTA_RESERVADA") {
      // Cota Principal (Ampla Concorrência - 75%)
      const rotuloPrinc = "Cota Principal (Ampla Concorrência - 75%)";
      resultado.push({
        ordemExibicao: `${numItem}.1`,
        itemOriginal: nomeItem,
        descricaoExibicao: `${nomeItem} [COTA PRINCIPAL - AMPLA CONCORRÊNCIA]`,
        descricao: `${nomeItem} [COTA PRINCIPAL - AMPLA CONCORRÊNCIA]`,
        quantidade: analise.cotaPrincipalQtd,
        unidadeMedida,
        valorUnitarioEstimado: it.valorUnitarioEstimado,
        valorTotalEstimado: Number((analise.cotaPrincipalQtd * it.valorUnitarioEstimado).toFixed(2)),
        tipoEnquadramento: "DIVISIVEL_COTA_RESERVADA",
        cotaRotulo: rotuloPrinc,
        enquadramentoTexto: rotuloPrinc,
        fundamentacaoLegal: analise.fundamentacao,
        unidadesDemandantes: it.unidadesDemandantes,
        catmatOuCatser: it.catmatOuCatser,
        isCotaReservada: false,
      });

      // Cota Reservada (ME/EPP - 25%)
      const rotuloRes = "Cota Reservada (ME/EPP - até 25%)";
      resultado.push({
        ordemExibicao: `${numItem}.2`,
        itemOriginal: nomeItem,
        descricaoExibicao: `${nomeItem} [COTA RESERVADA ME/EPP/MEI - ATÉ 25%]`,
        descricao: `${nomeItem} [COTA RESERVADA ME/EPP/MEI - ATÉ 25%]`,
        quantidade: analise.cotaReservadaQtd,
        unidadeMedida,
        valorUnitarioEstimado: it.valorUnitarioEstimado,
        valorTotalEstimado: Number((analise.cotaReservadaQtd * it.valorUnitarioEstimado).toFixed(2)),
        tipoEnquadramento: "DIVISIVEL_COTA_RESERVADA",
        cotaRotulo: rotuloRes,
        enquadramentoTexto: rotuloRes,
        fundamentacaoLegal: analise.fundamentacao,
        unidadesDemandantes: it.unidadesDemandantes,
        catmatOuCatser: it.catmatOuCatser,
        isCotaReservada: true,
      });
    } else {
      // Ampla Concorrência
      const rotuloAmpla = "Ampla Concorrência";
      resultado.push({
        ordemExibicao: String(numItem),
        itemOriginal: nomeItem,
        descricaoExibicao: nomeItem,
        descricao: nomeItem,
        quantidade: it.quantidade,
        unidadeMedida,
        valorUnitarioEstimado: it.valorUnitarioEstimado,
        valorTotalEstimado: Number((it.quantidade * it.valorUnitarioEstimado).toFixed(2)),
        tipoEnquadramento: "AMPLA_CONCORRENCIA",
        cotaRotulo: rotuloAmpla,
        enquadramentoTexto: rotuloAmpla,
        fundamentacaoLegal: analise.fundamentacao,
        unidadesDemandantes: it.unidadesDemandantes,
        catmatOuCatser: it.catmatOuCatser,
        isCotaReservada: false,
      });
    }
  }

  return resultado;
}
