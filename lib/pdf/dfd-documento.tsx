import React from "react";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import {
  brl,
  formatarData,
  numeroFormatado,
  totalDoDfd,
  detalhesConvenio,
  detalhesRecursoExtra,
  type DfdParaPdf,
  type ItemParaPdf,
} from "./dfd-dados";

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
  // Header DFD
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
    fontSize: 9.5,
    fontWeight: "bold",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 2,
  },
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
  // Blocos com cabeçalho azul e caixa envolvente
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
  // Tabela interna de itens
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
  observacaoFonte: {
    fontSize: 7.5,
    color: "#111827",
    marginTop: 3,
    marginBottom: 2,
  },
  // Assinatura DFD
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
});

function renderItemTable(itens: ItemParaPdf[], startIdx = 1) {
  const subtotal = itens.reduce((acc, it) => acc + it.valorTotal, 0);

  return (
    <View style={styles.itemsTableContainer}>
      <View style={styles.itemsTableHeader}>
        <Text style={[styles.thCell, { width: "8%" }, styles.textCenter]}>Item</Text>
        <Text style={[styles.thCell, { width: "38%" }]}>Categoria / Descrição</Text>
        <Text style={[styles.thCell, { width: "8%" }, styles.textCenter]}>Und</Text>
        <Text style={[styles.thCell, { width: "18%" }, styles.textRight]}>Valor unit. est.</Text>
        <Text style={[styles.thCell, { width: "10%" }, styles.textCenter]}>Qtde</Text>
        <Text style={[styles.thCell, { width: "18%" }, styles.textRight, styles.noBorderRight]}>
          Valor total
        </Text>
      </View>
      {itens.map((it, idx) => (
        <View key={idx} style={styles.itemsTableRow}>
          <Text style={[styles.tdCell, { width: "8%" }, styles.textCenter]}>{startIdx + idx}</Text>
          <Text style={[styles.tdCell, { width: "38%" }]}>
            {it.categoriaNome ? `${it.categoriaNome} — ` : ""}
            {it.nome}
          </Text>
          <Text style={[styles.tdCell, { width: "8%" }, styles.textCenter]}>UN</Text>
          <Text style={[styles.tdCell, { width: "18%" }, styles.textRight]}>
            {it.valorUnit != null ? brl(it.valorUnit) : "—"}
          </Text>
          <Text style={[styles.tdCell, { width: "10%" }, styles.textCenter]}>
            {it.quantidade != null ? String(it.quantidade) : "—"}
          </Text>
          <Text style={[styles.tdCell, { width: "18%" }, styles.textRight, styles.noBorderRight]}>
            {brl(it.valorTotal)}
          </Text>
        </View>
      ))}
      <View style={styles.subTotalRow}>
        <Text style={[styles.tdCell, { width: "82%" }, styles.labelBold, styles.textRight]}>
          Subtotal:
        </Text>
        <Text
          style={[
            styles.tdCell,
            { width: "18%" },
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

export function DfdDocumento({ dfd }: { dfd: DfdParaPdf }) {
  const itensGeral = dfd.itens.filter((it) => it.enquadramento === "GERAL");
  const itensExtra = dfd.itens.filter((it) => it.enquadramento === "RECURSOS_EXTRA");
  const itensOp = dfd.itens.filter((it) => it.enquadramento === "OP");
  const itensConvenio = dfd.itens.filter((it) => it.enquadramento === "CONVENIO");
  const convenios = detalhesConvenio(dfd);
  const recursosExtra = detalhesRecursoExtra(dfd);
  const total = totalDoDfd(dfd);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Banner Superior Azul */}
        <View style={styles.dfdHeaderBanner}>
          <Text style={styles.dfdHeaderTitle1}>
            DOCUMENTO DE FORMALIZAÇÃO DA DEMANDA – DFD nº {numeroFormatado(dfd)}
          </Text>
          <Text style={styles.dfdHeaderTitle2}>{dfd.unidadeNome.toUpperCase()}</Text>
        </View>

        {/* Quadro de Contatos da Unidade */}
        <View style={styles.dfdIdBox}>
          <View style={styles.tableRow}>
            <View style={[styles.cellCol, { width: "100%" }]}>
              <Text>
                <Text style={styles.labelBold}>Unidade Demandante: </Text>
                {dfd.unidadeNome}
              </Text>
            </View>
          </View>
          <View style={styles.tableRow}>
            <View style={[styles.cellCol, styles.cellBorderRight, { width: "50%" }]}>
              <Text>
                <Text style={styles.labelBold}>Responsável pela Demanda: </Text>
                {dfd.responsavelNome || "—"}
              </Text>
            </View>
            <View style={[styles.cellCol, { width: "50%" }]}>
              <Text>
                <Text style={styles.labelBold}>Matrícula: </Text>
                {dfd.responsavelMatricula || "—"}
              </Text>
            </View>
          </View>
          <View style={styles.tableRowLast}>
            <View style={[styles.cellCol, styles.cellBorderRight, { width: "50%" }]}>
              <Text>
                <Text style={styles.labelBold}>E-mail: </Text>
                {dfd.unidadeEmail}
              </Text>
            </View>
            <View style={[styles.cellCol, { width: "50%" }]}>
              <Text>
                <Text style={styles.labelBold}>Telefone: </Text>
                {dfd.responsavelTelefone || "—"}
              </Text>
            </View>
          </View>
        </View>

        {/* 1. Descrição Sumária */}
        <View style={styles.sectionContainer} wrap={false}>
          <View style={styles.sectionHeaderBar}>
            <Text style={styles.sectionHeaderText}>1. Descrição sumária da demanda:</Text>
          </View>
          <View style={styles.sectionContentBox}>
            <Text style={styles.sectionParagraph}>
              {dfd.descricaoSumaria || "Demanda cadastrada no sistema PCA-UERN."}
            </Text>
          </View>
        </View>

        {/* 2. Tipificação do problema */}
        <View style={styles.sectionContainer} wrap={false}>
          <View style={styles.sectionHeaderBar}>
            <Text style={styles.sectionHeaderText}>2. Tipificação do problema:</Text>
          </View>
          <View style={styles.sectionContentBox}>
            <Text style={styles.sectionParagraph}>
              {dfd.tipificacaoNome || "Aquisição de Bens / Prestação de Serviços Institucionais"}
            </Text>
          </View>
        </View>

        {/* 3. Nível Prioridade */}
        <View style={styles.sectionContainer} wrap={false}>
          <View style={styles.sectionHeaderBar}>
            <Text style={styles.sectionHeaderText}>3. Nível Prioridade</Text>
          </View>
          <View style={styles.sectionContentBox}>
            <Text style={styles.sectionParagraph}>
              {dfd.prioridadeFrase || "Prioridade definida nos termos do planejamento institucional."}
            </Text>
          </View>
        </View>

        {/* 4. Justificativa da necessidade */}
        <View style={styles.sectionContainer} wrap={false}>
          <View style={styles.sectionHeaderBar}>
            <Text style={styles.sectionHeaderText}>4. Justificativa da necessidade:</Text>
          </View>
          <View style={styles.sectionContentBox}>
            <Text style={styles.sectionParagraph}>{dfd.justificativa}</Text>
          </View>
        </View>

        {/* 5. Lista de itens e origem dos recursos */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderBar}>
            <Text style={styles.sectionHeaderText}>5. Lista de itens e origem dos recursos:</Text>
          </View>
          <View style={styles.sectionContentBox}>
            {/* Bloco 1: Recursos Ordinários - Uern Geral */}
            {(itensGeral.length > 0 ||
              (itensExtra.length === 0 && itensOp.length === 0 && itensConvenio.length === 0)) && (
              <View>
                <Text style={styles.fonteRecursosTitle}>
                  Enquadramento da fonte dos recursos: Recursos Ordinários – Uern Geral
                </Text>
                {itensGeral.length > 0 ? (
                  renderItemTable(itensGeral, 1)
                ) : (
                  <Text style={styles.observacaoFonte}>Nenhum item cadastrado nesta fonte.</Text>
                )}
              </View>
            )}

            {/* Bloco 2: Recursos Extra */}
            {itensExtra.length > 0 && (
              <View wrap={false}>
                <Text style={styles.fonteRecursosTitle}>
                  Enquadramento da fonte dos recursos: Recursos arrecadados pela Unidade (Recursos Extra)
                </Text>
                {recursosExtra.map((r, i) => (
                  <Text key={i} style={styles.observacaoFonte}>
                    Dados Bancários: {r.agenciaConta} | Valor Total: {r.valorDemandado}
                  </Text>
                ))}
                {renderItemTable(itensExtra, itensGeral.length + 1)}
              </View>
            )}

            {/* Bloco 3: Orçamento Participativo */}
            {itensOp.length > 0 && (
              <View wrap={false}>
                <Text style={styles.fonteRecursosTitle}>
                  Enquadramento da fonte dos recursos: Recursos Ordinários – Orçamento Participativo
                </Text>
                {renderItemTable(itensOp, itensGeral.length + itensExtra.length + 1)}
              </View>
            )}

            {/* Bloco 4: Convênio */}
            {itensConvenio.length > 0 && (
              <View wrap={false}>
                <Text style={styles.fonteRecursosTitle}>
                  Enquadramento da fonte dos recursos: Recursos de Convênio(*)
                </Text>
                {convenios.map((c, i) => (
                  <Text key={i} style={styles.observacaoFonte}>
                    Identificação do Convênio: {c.identificacao} | Valor: {c.valorDemandado}
                    {c.autorEmenda ? ` | Autor da Emenda: ${c.autorEmenda}` : ""}
                  </Text>
                ))}
                {renderItemTable(
                  itensConvenio,
                  itensGeral.length + itensExtra.length + itensOp.length + 1,
                )}
              </View>
            )}

            {/* Somatório Total */}
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
                Total Estimado da Demanda: {brl(total)}
              </Text>
            </View>
          </View>
        </View>

        {/* 6. Data pretendida */}
        <View style={styles.sectionContainer} wrap={false}>
          <View style={styles.sectionHeaderBar}>
            <Text style={styles.sectionHeaderText}>
              6. Data pretendida para conclusão do processo licitatório ou início da execução do serviço continuado / data de entrega do bem:
            </Text>
          </View>
          <View style={styles.sectionContentBox}>
            <Text style={styles.sectionParagraph}>
              {dfd.data ? formatarData(dfd.data) : "Conforme cronograma do Plano de Contratações Anual."}
            </Text>
          </View>
        </View>

        {/* 7. Natureza da demanda */}
        <View style={styles.sectionContainer} wrap={false}>
          <View style={styles.sectionHeaderBar}>
            <Text style={styles.sectionHeaderText}>7. Natureza da Demanda:</Text>
          </View>
          <View style={styles.sectionContentBox}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 }}>
              <Text style={{ fontSize: 8.5 }}>
                [{dfd.tipoDemanda === "NOVA" ? "X" : " "}] Contratação Nova
              </Text>
              <Text style={{ fontSize: 8.5 }}>
                [{dfd.tipoDemanda === "RENOVACAO" ? "X" : " "}] Renovação do Contrato
              </Text>
              <Text style={{ fontSize: 8.5 }}>
                [{dfd.tipoDemanda === "FLUXO_CONTINUO" ? "X" : " "}] Fluxo Contínuo
              </Text>
            </View>
          </View>
        </View>

        {/* Bloco de Assinatura Eletrônica */}
        <View style={styles.dfdSignatureBlock} wrap={false}>
          <Text style={[styles.dfdSignatureLine, styles.labelBold]}>
            UNIVERSIDADE DO ESTADO DO RIO GRANDE DO NORTE – UERN
          </Text>
          <Text style={styles.dfdSignatureLine}>
            Documento emitido eletronicamente pelo Sistema de Planejamento e Contratações Anuais (PCA-UERN)
          </Text>
          <Text style={[styles.dfdSignatureLine, { marginTop: 4 }]}>
            {dfd.responsavelNome || "Responsável pela Unidade Demandante"}
          </Text>
          <Text style={[styles.dfdSignatureLine, { color: "#4B5563" }]}>
            Matrícula: {dfd.responsavelMatricula || "—"} | {dfd.unidadeNome}
          </Text>
          <Text style={[styles.dfdSignatureLine, { color: "#4B5563", fontSize: 7.5 }]}>
            Data de emissão: {formatarData(dfd.criadoEm)}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
