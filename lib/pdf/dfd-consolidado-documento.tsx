import React from "react";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { brl, formatarData } from "../formato";
import type { DfdConsolidadoParaPdf, ItemConsolidadoPdf } from "./dfd-consolidado-dados";

const BLUE = "#0000FF";
const BORDER_COLOR = "#0000FF";
const BLACK = "#000000";
const WHITE = "#FFFFFF";

const styles = StyleSheet.create({
  page: {
    padding: 24,
    fontSize: 8,
    fontFamily: "Helvetica",
    color: "#111827",
  },
  // Cabeçalho Principal
  dfdHeaderBanner: {
    backgroundColor: BLUE,
    paddingVertical: 5,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  dfdHeaderTitle1: {
    color: WHITE,
    fontSize: 9.5,
    fontWeight: "bold",
    textAlign: "center",
  },
  dfdHeaderTitle2: {
    color: WHITE,
    fontSize: 9,
    fontWeight: "bold",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 2,
  },
  // Quadro de Identificação
  dfdIdBox: {
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderTopWidth: 0,
    marginBottom: 8,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  tableRowLast: {
    flexDirection: "row",
  },
  cellCol: {
    paddingVertical: 3.5,
    paddingHorizontal: 5,
  },
  cellBorderRight: {
    borderRightWidth: 1,
    borderRightColor: BORDER_COLOR,
  },
  labelBold: {
    fontWeight: "bold",
  },
  // Seções Enquadradas
  sectionContainer: {
    marginBottom: 8,
  },
  sectionHeaderBar: {
    backgroundColor: BLUE,
    paddingVertical: 3.5,
    paddingHorizontal: 6,
  },
  sectionHeaderText: {
    color: WHITE,
    fontWeight: "bold",
    fontSize: 8.5,
  },
  sectionContentBox: {
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderTopWidth: 0,
    padding: 6,
    minHeight: 24,
  },
  sectionParagraph: {
    fontSize: 8.5,
    textAlign: "justify",
    lineHeight: 1.25,
  },
  // Tabela Consolidada
  itemsTableContainer: {
    borderWidth: 1,
    borderColor: BLACK,
    marginTop: 4,
    marginBottom: 6,
  },
  itemsTableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: BLACK,
    backgroundColor: "#FFFFFF",
  },
  itemsTableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: BLACK,
  },
  thCell: {
    paddingVertical: 3,
    paddingHorizontal: 3,
    fontWeight: "bold",
    fontSize: 7.5,
    borderRightWidth: 1,
    borderRightColor: BLACK,
  },
  tdCell: {
    paddingVertical: 2.5,
    paddingHorizontal: 3,
    fontSize: 7.5,
    borderRightWidth: 1,
    borderRightColor: BLACK,
  },
  noBorderRight: {
    borderRightWidth: 0,
  },
  textRight: {
    textAlign: "right",
  },
  textCenter: {
    textAlign: "center",
  },
  subTotalRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: BLACK,
    backgroundColor: "#FFFFFF",
  },
  fonteRecursosTitle: {
    fontWeight: "bold",
    fontSize: 8.5,
    marginTop: 4,
    marginBottom: 2,
  },
  // Assinatura
  dfdSignatureBlock: {
    marginTop: 16,
    alignItems: "center",
    textAlign: "center",
  },
  dfdSignatureLine: {
    fontSize: 8.5,
    marginBottom: 2,
    textAlign: "center",
  },
  // Estilos do Anexo
  anexoCard: {
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    marginBottom: 6,
  },
  anexoCardHeader: {
    backgroundColor: "#EFF6FF",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
    paddingHorizontal: 5,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  anexoCardBody: {
    padding: 5,
  },
  anexoGridRow: {
    flexDirection: "row",
    marginBottom: 3,
  },
  anexoJustificativaBox: {
    marginTop: 3,
    padding: 4,
    backgroundColor: "#F9FAFB",
    borderLeftWidth: 2,
    borderLeftColor: BLUE,
  },
  anexoJustificativaText: {
    fontSize: 7.5,
    fontStyle: "italic",
    color: "#374151",
    lineHeight: 1.25,
  },
});

const ENQUADRAMENTO_LABEL: Record<string, string> = {
  GERAL: "Recursos Ordinários – Uern Geral (Consolidado)",
  RECURSOS_EXTRA: "Recursos Arrecadados pela Unidade (Recursos Extra – Consolidado)",
  OP: "Recursos Ordinários – Orçamento Participativo (Consolidado)",
  CONVENIO: "Recursos de Convênio (Consolidado)",
};

function renderTabelaConsolidada(itens: ItemConsolidadoPdf[], startIdx = 1) {
  const subtotal = itens.reduce((acc, it) => acc + it.valorTotal, 0);

  return (
    <View style={styles.itemsTableContainer}>
      <View style={styles.itemsTableHeader}>
        <Text style={[styles.thCell, { width: "8%" }, styles.textCenter]}>Item</Text>
        <Text style={[styles.thCell, { width: "42%" }]}>Categoria / Descrição do Item Consolidado</Text>
        <Text style={[styles.thCell, { width: "8%" }, styles.textCenter]}>Und</Text>
        <Text style={[styles.thCell, { width: "14%" }, styles.textRight]}>Valor unit. est.</Text>
        <Text style={[styles.thCell, { width: "12%" }, styles.textCenter]}>Qtde Total</Text>
        <Text style={[styles.thCell, { width: "16%" }, styles.textRight, styles.noBorderRight]}>
          Valor total
        </Text>
      </View>
      {itens.map((it, idx) => (
        <View key={idx} style={styles.itemsTableRow}>
          <Text style={[styles.tdCell, { width: "8%" }, styles.textCenter]}>{startIdx + idx}</Text>
          <Text style={[styles.tdCell, { width: "42%" }]}>
            {it.categoriaNome ? `${it.categoriaNome} — ` : ""}
            {it.nome}
          </Text>
          <Text style={[styles.tdCell, { width: "8%" }, styles.textCenter]}>{it.und}</Text>
          <Text style={[styles.tdCell, { width: "14%" }, styles.textRight]}>
            {it.valorUnit != null ? brl(it.valorUnit) : "—"}
          </Text>
          <Text style={[styles.tdCell, { width: "12%" }, styles.textCenter, styles.labelBold]}>
            {it.quantidadeTotal}
          </Text>
          <Text style={[styles.tdCell, { width: "16%" }, styles.textRight, styles.noBorderRight]}>
            {brl(it.valorTotal)}
          </Text>
        </View>
      ))}
      <View style={styles.subTotalRow}>
        <Text style={[styles.tdCell, { width: "84%" }, styles.labelBold, styles.textRight]}>
          Subtotal Consolidado:
        </Text>
        <Text
          style={[
            styles.tdCell,
            { width: "16%" },
            styles.labelBold,
            styles.textRight,
            styles.noBorderRight,
          ]}
        >
          {brl(subtotal)}
        </Text>
      </View>
    </View>
  );
}

export function DfdConsolidadoDocumento({ dados }: { dados: DfdConsolidadoParaPdf }) {
  const ordensEnquadramento: ("GERAL" | "RECURSOS_EXTRA" | "OP" | "CONVENIO")[] = [
    "GERAL",
    "RECURSOS_EXTRA",
    "OP",
    "CONVENIO",
  ];

  const gruposPorFonte = ordensEnquadramento
    .map((enq) => ({
      enquadramento: enq,
      label: ENQUADRAMENTO_LABEL[enq],
      itens: dados.itensConsolidados.filter((i) => i.enquadramento === enq),
    }))
    .filter((g) => g.itens.length > 0);

  return (
    <Document>
      {/* PÁGINA 1: DFD CONSOLIDADO PRINCIPAL */}
      <Page size="A4" style={styles.page}>
        {/* Banner Superior Azul */}
        <View style={styles.dfdHeaderBanner}>
          <Text style={styles.dfdHeaderTitle1}>
            DOCUMENTO DE FORMALIZAÇÃO DA DEMANDA CONSOLIDADO – DFD nº {dados.numeroConsolidacao}
          </Text>
          <Text style={styles.dfdHeaderTitle2}>
            {dados.setorTecnicoNome.toUpperCase()} – {dados.categoriaNome.toUpperCase()}
          </Text>
        </View>

        {/* Quadro de Contatos e Identificação do Setor Técnico */}
        <View style={styles.dfdIdBox}>
          <View style={styles.tableRow}>
            <View style={[styles.cellCol, { width: "100%" }]}>
              <Text>
                <Text style={styles.labelBold}>Órgão / Setor Técnico Responsável: </Text>
                {dados.setorTecnicoNome}
              </Text>
            </View>
          </View>
          <View style={styles.tableRow}>
            <View style={[styles.cellCol, styles.cellBorderRight, { width: "55%" }]}>
              <Text>
                <Text style={styles.labelBold}>Categoria Consolidada: </Text>
                {dados.categoriaNome}
              </Text>
            </View>
            <View style={[styles.cellCol, { width: "45%" }]}>
              <Text>
                <Text style={styles.labelBold}>Plano de Contratações Anual: </Text>
                PCA {dados.pcaAno}
              </Text>
            </View>
          </View>
          <View style={styles.tableRow}>
            <View style={[styles.cellCol, styles.cellBorderRight, { width: "55%" }]}>
              <Text>
                <Text style={styles.labelBold}>Processo SEI: </Text>
                {dados.processoSEI}
              </Text>
            </View>
            <View style={[styles.cellCol, { width: "45%" }]}>
              <Text>
                <Text style={styles.labelBold}>Tipo de Contratação: </Text>
                {dados.tipoContratacao === "ATA"
                  ? "Ata de Registro de Preços (ARP)"
                  : "Contratação Normal (Contrato / Empenho)"}
              </Text>
            </View>
          </View>
          <View style={styles.tableRowLast}>
            <View style={[styles.cellCol, styles.cellBorderRight, { width: "55%" }]}>
              <Text>
                <Text style={styles.labelBold}>Responsável Técnico: </Text>
                {dados.responsavelNome} | Matrícula: {dados.responsavelMatricula}
              </Text>
            </View>
            <View style={[styles.cellCol, { width: "45%" }]}>
              <Text>
                <Text style={styles.labelBold}>E-mail: </Text>
                {dados.responsavelEmail} | Tel.: {dados.responsavelTelefone}
              </Text>
            </View>
          </View>
        </View>

        {/* 1. Descrição Sumária */}
        <View style={styles.sectionContainer} wrap={false}>
          <View style={styles.sectionHeaderBar}>
            <Text style={styles.sectionHeaderText}>1. Descrição sumária da demanda consolidada:</Text>
          </View>
          <View style={styles.sectionContentBox}>
            <Text style={styles.sectionParagraph}>{dados.descricaoSumaria}</Text>
          </View>
        </View>

        {/* 2. Tipificação do problema */}
        <View style={styles.sectionContainer} wrap={false}>
          <View style={styles.sectionHeaderBar}>
            <Text style={styles.sectionHeaderText}>2. Tipificação do problema:</Text>
          </View>
          <View style={styles.sectionContentBox}>
            <Text style={styles.sectionParagraph}>{dados.tipificacao}</Text>
          </View>
        </View>

        {/* 3. Nível Prioridade Consolidado */}
        <View style={styles.sectionContainer} wrap={false}>
          <View style={styles.sectionHeaderBar}>
            <Text style={styles.sectionHeaderText}>3. Nível Prioridade Consolidado</Text>
          </View>
          <View style={styles.sectionContentBox}>
            <Text style={styles.sectionParagraph}>
              <Text style={styles.labelBold}>Nível de Prioridade: </Text>
              {dados.prioridadeRotulo}
            </Text>
            <Text style={[styles.sectionParagraph, { marginTop: 2 }]}>
              <Text style={styles.labelBold}>Juízo Técnico / Critério de Consolidação: </Text>
              {dados.prioridadeJustificativa}
            </Text>
          </View>
        </View>

        {/* 4. Justificativa da Consolidação */}
        <View style={styles.sectionContainer} wrap={false}>
          <View style={styles.sectionHeaderBar}>
            <Text style={styles.sectionHeaderText}>4. Justificativa da consolidação da demanda:</Text>
          </View>
          <View style={styles.sectionContentBox}>
            <Text style={styles.sectionParagraph}>{dados.justificativaConsolidacao}</Text>
          </View>
        </View>

        {/* 5. Lista de Itens Consolidados */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderBar}>
            <Text style={styles.sectionHeaderText}>5. Lista de itens consolidados e quantitativos totais:</Text>
          </View>
          <View style={styles.sectionContentBox}>
            {gruposPorFonte.length > 0 ? (
              gruposPorFonte.map((grupo, gIdx) => (
                <View key={grupo.enquadramento} wrap={false}>
                  <Text style={styles.fonteRecursosTitle}>
                    Enquadramento da fonte dos recursos: {grupo.label}
                  </Text>
                  {renderTabelaConsolidada(grupo.itens, gIdx === 0 ? 1 : 1)}
                </View>
              ))
            ) : (
              <Text style={styles.sectionParagraph}>Nenhum item consolidado encontrado.</Text>
            )}

            <View
              style={{
                marginTop: 6,
                paddingTop: 4,
                borderTopWidth: 1,
                borderTopColor: BLUE,
                flexDirection: "row",
                justifyContent: "flex-end",
              }}
            >
              <Text style={{ fontSize: 9, fontWeight: "bold" }}>
                Total Geral Estimado da Demanda Consolidada: {brl(dados.totalEstimadoGeral)}
              </Text>
            </View>
          </View>
        </View>

        {/* 6. Data pretendida de conclusão / entrega consolidada */}
        <View style={styles.sectionContainer} wrap={false}>
          <View style={styles.sectionHeaderBar}>
            <Text style={styles.sectionHeaderText}>
              6. Data pretendida para conclusão do processo licitatório ou início da execução / entrega dos bens:
            </Text>
          </View>
          <View style={styles.sectionContentBox}>
            <Text style={styles.sectionParagraph}>
              <Text style={styles.labelBold}>
                Data de entrega consolidada (unificada pelo Setor Técnico):{" "}
              </Text>
              {formatarData(dados.dataEntregaConsolidada)}
            </Text>
            <Text style={[styles.sectionParagraph, { marginTop: 2, color: "#4B5563" }]}>
              Cronograma unificado estabelecido pelo Setor Técnico competente para viabilizar os prazos de
              homologação, empenho e atendimento ordenado a todas as unidades participantes.
            </Text>
          </View>
        </View>

        {/* 7. Natureza da Demanda */}
        <View style={styles.sectionContainer} wrap={false}>
          <View style={styles.sectionHeaderBar}>
            <Text style={styles.sectionHeaderText}>7. Natureza da Demanda:</Text>
          </View>
          <View style={styles.sectionContentBox}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 }}>
              <Text style={{ fontSize: 8.5 }}>[X] Contratação Nova Consolidada</Text>
              <Text style={{ fontSize: 8.5 }}>[ ] Renovação Contratual</Text>
              <Text style={{ fontSize: 8.5 }}>[ ] Fluxo Contínuo</Text>
            </View>
          </View>
        </View>

        {/* Bloco de Assinatura Eletrônica do Setor Técnico */}
        <View style={styles.dfdSignatureBlock} wrap={false}>
          <Text style={[styles.dfdSignatureLine, styles.labelBold]}>
            UNIVERSIDADE DO ESTADO DO RIO GRANDE DO NORTE – UERN
          </Text>
          <Text style={styles.dfdSignatureLine}>
            Documento emitido eletronicamente pelo Sistema de Planejamento e Contratações Anuais (PCA-UERN)
          </Text>
          <Text style={[styles.dfdSignatureLine, { marginTop: 4, fontWeight: "bold" }]}>
            {dados.responsavelNome}
          </Text>
          <Text style={[styles.dfdSignatureLine, { color: "#4B5563" }]}>
            Matrícula: {dados.responsavelMatricula} | {dados.setorTecnicoNome}
          </Text>
          <Text style={[styles.dfdSignatureLine, { color: "#4B5563", fontSize: 7.5 }]}>
            Data de consolidação e emissão: {formatarData(dados.dataEmissao)}
          </Text>
        </View>
      </Page>

      {/* PÁGINA 2: ANEXO DETALHADO POR UNIDADE E DFD DE ORIGEM */}
      <Page size="A4" style={styles.page}>
        {/* Banner do Anexo */}
        <View style={styles.dfdHeaderBanner}>
          <Text style={styles.dfdHeaderTitle1}>
            ANEXO AO DFD CONSOLIDADO — PROCESSO SEI {dados.processoSEI}
          </Text>
          <Text style={styles.dfdHeaderTitle2}>
            DETALHAMENTO POR UNIDADE DEMANDANTE E DFD DE ORIGEM ({dados.categoriaNome.toUpperCase()})
          </Text>
        </View>

        {/* Quadro Informativo */}
        <View style={styles.dfdIdBox}>
          <View style={styles.tableRowLast}>
            <View style={[styles.cellCol, { width: "100%" }]}>
              <Text style={{ fontSize: 7.5, color: "#374151" }}>
                <Text style={styles.labelBold}>Relação Analítica das Demandas Consolidadas: </Text>
                Este anexo detalha item por item as solicitações originais registradas pelas unidades
                demandantes, acompanhadas do respectivo DFD de origem, quantitativo demandado e a exata
                justificativa fundamentada pela unidade de origem no sistema PCA.
              </Text>
            </View>
          </View>
        </View>

        {/* Lista de Demandas Individuais por Unidade */}
        {dados.demandasOrigem.map((dem, idx) => (
          <View key={idx} style={styles.anexoCard} wrap={false}>
            <View style={styles.anexoCardHeader}>
              <Text style={{ fontSize: 8, fontWeight: "bold", color: "#1E3A8A" }}>
                Demanda #{idx + 1} — {dem.unidadeDemandante}
              </Text>
              <Text style={{ fontSize: 8, fontWeight: "bold", color: "#1E3A8A" }}>
                DFD Origem: {dem.dfdNumero}/{dem.dfdAno}
              </Text>
            </View>
            <View style={styles.anexoCardBody}>
              <View style={styles.anexoGridRow}>
                <View style={{ width: "52%" }}>
                  <Text style={{ fontSize: 8 }}>
                    <Text style={styles.labelBold}>Item Demandado: </Text>
                    {dem.itemNome}
                  </Text>
                  {dem.substituido && dem.itemOriginalNome && (
                    <Text style={{ fontSize: 7, color: "#92400E", marginTop: 1 }}>
                      (Substituído tecnicamente pelo setor — original: {dem.itemOriginalNome})
                    </Text>
                  )}
                </View>
                <View style={{ width: "22%" }}>
                  <Text style={{ fontSize: 8 }}>
                    <Text style={styles.labelBold}>Quantidade: </Text>
                    {dem.quantidade != null ? `${dem.quantidade} UN` : "—"}
                  </Text>
                </View>
                <View style={{ width: "26%", alignItems: "flex-end" }}>
                  <Text style={{ fontSize: 8 }}>
                    <Text style={styles.labelBold}>Valor Total: </Text>
                    {brl(dem.valorTotal)}
                  </Text>
                </View>
              </View>

              {/* Justificativa Original do DFD */}
              <View style={styles.anexoJustificativaBox}>
                <Text style={{ fontSize: 7.5, fontWeight: "bold", color: "#1F2937", marginBottom: 1 }}>
                  Justificativa da necessidade registrada no DFD original da Unidade:
                </Text>
                <Text style={styles.anexoJustificativaText}>"{dem.justificativaOriginal}"</Text>
                {dem.substituido && dem.substituicaoJustificativa && (
                  <Text style={[styles.anexoJustificativaText, { marginTop: 2, color: "#92400E" }]}>
                    Nota Técnica de Substituição: "{dem.substituicaoJustificativa}"
                  </Text>
                )}
              </View>
            </View>
          </View>
        ))}

        {/* Rodapé institucional */}
        <View style={{ marginTop: 16, alignItems: "center" }} wrap={false}>
          <Text style={{ fontSize: 7.5, color: "#6B7280" }}>
            Fim do Anexo Analítico · Documento gerado eletronicamente para instrução do ETP (PCA-UERN)
          </Text>
        </View>
      </Page>
    </Document>
  );
}
