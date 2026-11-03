import React from "react";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { brl, formatarData } from "../formato";
import { type EtpParaPdf, totalItensEtp } from "./etp-dados";

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
  // Cabeçalho Institucional ETP
  etpHeaderBox: {
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    marginBottom: 8,
  },
  etpHeaderTop: {
    paddingVertical: 5,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  etpHeaderUniName: {
    fontSize: 9.5,
    fontWeight: "bold",
    textAlign: "center",
  },
  etpHeaderMiddleBar: {
    backgroundColor: BLUE,
    paddingVertical: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  etpHeaderMiddleTitle: {
    color: WHITE,
    fontSize: 10,
    fontWeight: "bold",
    textAlign: "center",
  },
  etpHeaderBottom: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    textAlign: "justify",
  },
  etpHeaderLegalText: {
    fontSize: 7.5,
    textAlign: "justify",
    lineHeight: 1.25,
  },
  // Seções com Barra Azul e Caixa Envolvente
  sectionContainer: {
    marginBottom: 7,
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
    padding: 5,
    minHeight: 22,
  },
  sectionParagraph: {
    fontSize: 8.5,
    textAlign: "justify",
    lineHeight: 1.25,
  },
  // 1. Dados do Processo (Tabela)
  etpProcessoTable: {
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderTopWidth: 0,
  },
  etpProcessoRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  etpProcessoRowLast: {
    flexDirection: "row",
  },
  etpProcessoLabel: {
    width: "38%",
    padding: 3.5,
    fontWeight: "bold",
    fontSize: 8.5,
    borderRightWidth: 1,
    borderRightColor: BORDER_COLOR,
  },
  etpProcessoVal: {
    width: "62%",
    padding: 3.5,
    fontSize: 8.5,
  },
  // Assinatura ETP
  etpSignatureBlock: {
    marginTop: 16,
    alignItems: "center",
    textAlign: "center",
  },
  etpLine: {
    width: 260,
    borderBottomWidth: 1,
    borderBottomColor: BLACK,
    marginBottom: 4,
  },
  // Tabela de itens do anexo
  tableContainer: {
    borderWidth: 1,
    borderColor: BLACK,
    marginTop: 6,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: BLACK,
    backgroundColor: "#F3F4F6",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: BLACK,
  },
  thCell: {
    padding: 3.5,
    fontWeight: "bold",
    fontSize: 8,
    borderRightWidth: 1,
    borderRightColor: BLACK,
  },
  tdCell: {
    padding: 3,
    fontSize: 8,
    borderRightWidth: 1,
    borderRightColor: BLACK,
  },
});

interface SubtopicosRequisitos {
  requisitosGerais: string;
  requisitosRelevancia: string;
  requisitosNatureza: string;
  requisitosDuracao: string;
  requisitosSustentabilidade: string;
  requisitosPadroesQualidade: string;
  requisitosTransicao: string;
}

function extrairSubtopicosRequisitos(texto: string | undefined): SubtopicosRequisitos {
  if (!texto || !texto.trim()) {
    return {
      requisitosGerais:
        "Descrevem-se os requisitos necessários à contratação com vistas ao atendimento da necessidade especificada, essenciais e com padrões mínimos de qualidade para seleção da proposta mais vantajosa, abstendo-se de relacionar especificações excessivas ou desnecessárias.",
      requisitosRelevancia:
        "Com base no Levantamento de Mercado, confirma-se que os requisitos estipulados são indispensáveis para garantir a padronização, a segurança da infraestrutura institucional da UERN e a durabilidade patrimonial dos bens, não limitando indevidamente a competitividade nem restringindo a participação de fornecedores habilitados.",
      requisitosNatureza:
        "Aquisição de bens comuns / prestação de serviços com fornecimento integral, não configurando serviço com dedicação exclusiva de mão de obra.",
      requisitosDuracao:
        "Vigência contratual fixada em até 12 (doze) meses contados da publicação ou empenho, associada aos prazos de garantia técnica legal e contratual.",
      requisitosSustentabilidade:
        "Critérios de sustentabilidade ambiental observados, incluindo eficiência no consumo energético, conforms às diretivas ambientais aplicáveis e destinação adequada de resíduos/logística reversa.",
      requisitosPadroesQualidade:
        "Produtos novos, de primeiro uso, de padrão corporativo de alta durabilidade, em conformidade com normas técnicas e padrões de qualidade pertinentes.",
      requisitosTransicao:
        "Por se tratar de contratação para entrega definitiva ou prestação ordinária, não se aplica transição contratual com transferência de tecnologia ou absorção de pessoal.",
    };
  }

  const regexBlocos = [
    { key: "requisitosGerais", padrao: /4\.1\.?\s*(?:Dos\s*Requisitos:?)?([\s\S]*?)(?=4\.1\.1|4\.2|$)/i },
    { key: "requisitosRelevancia", padrao: /4\.1\.1\.?\s*(?:Relev[âa]ncia[^:]*:?)?([\s\S]*?)(?=4\.2|$)/i },
    { key: "requisitosNatureza", padrao: /4\.2\.?\s*(?:Natureza[^:]*:?)?([\s\S]*?)(?=4\.3|$)/i },
    { key: "requisitosDuracao", padrao: /4\.3\.?\s*(?:Dura[çc][ãa]o[^:]*:?)?([\s\S]*?)(?=4\.4|$)/i },
    { key: "requisitosSustentabilidade", padrao: /4\.4\.?\s*(?:Sustentabilidade[^:]*:?)?([\s\S]*?)(?=4\.5|$)/i },
    { key: "requisitosPadroesQualidade", padrao: /4\.5\.?\s*(?:Padr[õo]es[^:]*:?)?([\s\S]*?)(?=4\.6|$)/i },
    { key: "requisitosTransicao", padrao: /4\.6\.?\s*(?:Transi[çc][ãa]o[^:]*:?)?([\s\S]*?)$/i },
  ];

  let temMatch = false;
  const res: Record<string, string> = {};
  for (const item of regexBlocos) {
    const match = texto.match(item.padrao);
    if (match && match[1]?.trim()) {
      res[item.key] = match[1].trim();
      temMatch = true;
    }
  }

  if (temMatch) {
    return {
      requisitosGerais: res.requisitosGerais || texto.trim(),
      requisitosRelevancia: res.requisitosRelevancia || "Conforme estudos técnicos preliminares.",
      requisitosNatureza: res.requisitosNatureza || "Conforme especificação do objeto.",
      requisitosDuracao: res.requisitosDuracao || "Vigência estabelecida conforme Lei 14.133/2021.",
      requisitosSustentabilidade: res.requisitosSustentabilidade || "Critérios de sustentabilidade aplicáveis observados.",
      requisitosPadroesQualidade: res.requisitosPadroesQualidade || "Padrões mínimos de qualidade assegurados.",
      requisitosTransicao: res.requisitosTransicao || "Não se aplica transição contratual.",
    };
  }

  return {
    requisitosGerais: texto.trim(),
    requisitosRelevancia: "Conforme levantamento de mercado e especificações técnicas.",
    requisitosNatureza: "Aquisição de bens / prestação de serviços conforme definido no objeto.",
    requisitosDuracao: "Vigência regular estabelecida conforme planejamento.",
    requisitosSustentabilidade: "Critérios de sustentabilidade ambiental observados.",
    requisitosPadroesQualidade: "Padrões mínimos de qualidade técnica assegurados.",
    requisitosTransicao: "Não se aplica transição contratual.",
  };
}

export function EtpDocumento({ etp }: { etp: EtpParaPdf }) {
  const subtopicos = extrairSubtopicosRequisitos(etp.requisitosContratacao);
  const dataHoje = etp.finalizadoEm ? formatarData(etp.finalizadoEm) : formatarData(new Date());
  const orgaoResponsavel = `UERN – Reitoria / Pró-Reitoria de Administração (PROAD)${
    etp.setorTecnicoNome ? ` - ${etp.setorTecnicoNome}` : ""
  }`;
  const total = totalItensEtp(etp);

  return (
    <Document>
      {/* Corpo Principal do ETP */}
      <Page size="A4" style={styles.page}>
        {/* Cabeçalho Institucional */}
        <View style={styles.etpHeaderBox}>
          <View style={styles.etpHeaderTop}>
            <Text style={styles.etpHeaderUniName}>
              FUNDAÇÃO UNIVERSIDADE DO ESTADO DO RIO GRANDE DO NORTE – FUERN
            </Text>
          </View>
          <View style={styles.etpHeaderMiddleBar}>
            <Text style={styles.etpHeaderMiddleTitle}>ESTUDOS PRELIMINARES</Text>
          </View>
          <View style={styles.etpHeaderBottom}>
            <Text style={styles.etpHeaderLegalText}>
              Lei 14.133/2021, Art. 18, § 1º: O estudo técnico preliminar deverá evidenciar o problema a ser
              resolvido e a sua melhor solução, de modo a permitir a avaliação da viabilidade técnica e econômica da
              contratação.
            </Text>
          </View>
        </View>

        {/* 1. Dados do Processo */}
        <View style={styles.sectionContainer} wrap={false}>
          <View style={styles.sectionHeaderBar}>
            <Text style={styles.sectionHeaderText}>1. Dados do Processo:</Text>
          </View>
          <View style={styles.etpProcessoTable}>
            <View style={styles.etpProcessoRow}>
              <Text style={styles.etpProcessoLabel}>Órgão Responsável pela Contratação:</Text>
              <Text style={styles.etpProcessoVal}>{orgaoResponsavel}</Text>
            </View>
            <View style={styles.etpProcessoRow}>
              <Text style={styles.etpProcessoLabel}>Objeto:</Text>
              <Text style={styles.etpProcessoVal}>{etp.objeto}</Text>
            </View>
            <View style={styles.etpProcessoRow}>
              <Text style={styles.etpProcessoLabel}>Local da entrega ou prestação do serviço:</Text>
              <Text style={styles.etpProcessoVal}>{etp.localEntregaPrestacao || "Campi da UERN"}</Text>
            </View>
            <View style={styles.etpProcessoRowLast}>
              <Text style={styles.etpProcessoLabel}>Nº do Processo:</Text>
              <Text style={styles.etpProcessoVal}>{etp.processoSEI || "04410017.000854/2026-92"}</Text>
            </View>
          </View>
        </View>

        {/* 2. Necessidade da Contratação */}
        <View style={styles.sectionContainer} wrap={false}>
          <View style={styles.sectionHeaderBar}>
            <Text style={styles.sectionHeaderText}>2. Necessidade da contratação</Text>
          </View>
          <View style={styles.sectionContentBox}>
            <Text style={styles.sectionParagraph}>{etp.necessidadeContratacao}</Text>
          </View>
        </View>

        {/* 3. Referência ao PCA e Planejamento */}
        <View style={styles.sectionContainer} wrap={false}>
          <View style={styles.sectionHeaderBar}>
            <Text style={styles.sectionHeaderText}>
              3. Referência ao Plano Anual de Contratações, entre outros documentos institucionais (PDI, PPA, etc):
            </Text>
          </View>
          <View style={styles.sectionContentBox}>
            <Text style={styles.sectionParagraph}>{etp.referenciaPca}</Text>
          </View>
        </View>

        {/* 4. Requisitos da Contratação com Subtópicos Ajustados */}
        <View style={styles.sectionContainer} wrap={false}>
          <View style={styles.sectionHeaderBar}>
            <Text style={styles.sectionHeaderText}>4. Requisitos da Contratação:</Text>
          </View>
          <View style={styles.sectionContentBox}>
            <View style={{ marginBottom: 4 }}>
              <Text style={{ fontWeight: "bold", fontSize: 8.5 }}>4.1. Dos Requisitos:</Text>
              <Text style={styles.sectionParagraph}>{subtopicos.requisitosGerais}</Text>
            </View>

            <View style={{ marginBottom: 4, paddingLeft: 6, borderLeftWidth: 1, borderLeftColor: BORDER_COLOR }}>
              <Text style={{ fontWeight: "bold", fontSize: 8.5 }}>
                4.1.1. Relevância dos requisitos estipulados:
              </Text>
              <Text style={styles.sectionParagraph}>{subtopicos.requisitosRelevancia}</Text>
            </View>

            <View style={{ marginBottom: 4 }}>
              <Text style={{ fontWeight: "bold", fontSize: 8.5 }}>4.2. Natureza da Contratação:</Text>
              <Text style={styles.sectionParagraph}>{subtopicos.requisitosNatureza}</Text>
            </View>

            <View style={{ marginBottom: 4 }}>
              <Text style={{ fontWeight: "bold", fontSize: 8.5 }}>4.3. Duração Inicial do Contrato:</Text>
              <Text style={styles.sectionParagraph}>{subtopicos.requisitosDuracao}</Text>
            </View>

            <View style={{ marginBottom: 4 }}>
              <Text style={{ fontWeight: "bold", fontSize: 8.5 }}>4.4. Sustentabilidade:</Text>
              <Text style={styles.sectionParagraph}>{subtopicos.requisitosSustentabilidade}</Text>
            </View>

            <View style={{ marginBottom: 4 }}>
              <Text style={{ fontWeight: "bold", fontSize: 8.5 }}>4.5. Padrões mínimos de qualidade:</Text>
              <Text style={styles.sectionParagraph}>{subtopicos.requisitosPadroesQualidade}</Text>
            </View>

            <View style={{ marginBottom: 2 }}>
              <Text style={{ fontWeight: "bold", fontSize: 8.5 }}>4.6. Transição Contratual:</Text>
              <Text style={styles.sectionParagraph}>{subtopicos.requisitosTransicao}</Text>
            </View>
          </View>
        </View>

        {/* 5. Estimativa das Quantidades */}
        <View style={styles.sectionContainer} wrap={false}>
          <View style={styles.sectionHeaderBar}>
            <Text style={styles.sectionHeaderText}>5. Estimativa das Quantidades e memória de cálculo:</Text>
          </View>
          <View style={styles.sectionContentBox}>
            <Text style={styles.sectionParagraph}>{etp.estimativaQuantidadesMemoria}</Text>
          </View>
        </View>

        {/* 6. Levantamento de Mercado */}
        <View style={styles.sectionContainer} wrap={false}>
          <View style={styles.sectionHeaderBar}>
            <Text style={styles.sectionHeaderText}>
              6. Levantamento de Mercado e Justificativa da Escolha do Tipo de Solução a Contratar:
            </Text>
          </View>
          <View style={styles.sectionContentBox}>
            <Text style={styles.sectionParagraph}>{etp.levantamentoMercadoJustificativa}</Text>
          </View>
        </View>

        {/* 7. Estimativa Preliminar de Preços */}
        <View style={styles.sectionContainer} wrap={false}>
          <View style={styles.sectionHeaderBar}>
            <Text style={styles.sectionHeaderText}>7. Estimativa preliminar de preços:</Text>
          </View>
          <View style={styles.sectionContentBox}>
            <Text style={styles.sectionParagraph}>{etp.estimativaPreliminarPrecos}</Text>
          </View>
        </View>

        {/* 8. Descrição da Solução como um todo */}
        <View style={styles.sectionContainer} wrap={false}>
          <View style={styles.sectionHeaderBar}>
            <Text style={styles.sectionHeaderText}>8. Descrição da Solução como um todo:</Text>
          </View>
          <View style={styles.sectionContentBox}>
            <Text style={styles.sectionParagraph}>{etp.descricaoSolucaoCompleta}</Text>
          </View>
        </View>

        {/* 9. Justificativas para o Parcelamento */}
        <View style={styles.sectionContainer} wrap={false}>
          <View style={styles.sectionHeaderBar}>
            <Text style={styles.sectionHeaderText}>
              9. Justificativas para o Parcelamento ou não da Solução:
            </Text>
          </View>
          <View style={styles.sectionContentBox}>
            <Text style={styles.sectionParagraph}>{etp.justificativaParcelamento}</Text>
          </View>
        </View>

        {/* 10. Demonstrativo dos Resultados Esperados */}
        <View style={styles.sectionContainer} wrap={false}>
          <View style={styles.sectionHeaderBar}>
            <Text style={styles.sectionHeaderText}>10. Demonstrativo dos Resultados Esperados:</Text>
          </View>
          <View style={styles.sectionContentBox}>
            <Text style={styles.sectionParagraph}>{etp.resultadosEsperados}</Text>
          </View>
        </View>

        {/* 11. Providências a serem adotadas */}
        <View style={styles.sectionContainer} wrap={false}>
          <View style={styles.sectionHeaderBar}>
            <Text style={styles.sectionHeaderText}>
              11. Providências a serem adotadas pela Administração:
            </Text>
          </View>
          <View style={styles.sectionContentBox}>
            <Text style={styles.sectionParagraph}>{etp.providenciasAdministracao}</Text>
          </View>
        </View>

        {/* 12. Impactos Ambientais */}
        <View style={styles.sectionContainer} wrap={false}>
          <View style={styles.sectionHeaderBar}>
            <Text style={styles.sectionHeaderText}>12. Descrição de possíveis impactos ambientais:</Text>
          </View>
          <View style={styles.sectionContentBox}>
            <Text style={styles.sectionParagraph}>{etp.impactosAmbientais}</Text>
          </View>
        </View>

        {/* 13. Contratações Correlatas */}
        <View style={styles.sectionContainer} wrap={false}>
          <View style={styles.sectionHeaderBar}>
            <Text style={styles.sectionHeaderText}>13. Contratações correlatas ou interdependentes:</Text>
          </View>
          <View style={styles.sectionContentBox}>
            <Text style={styles.sectionParagraph}>{etp.contratacoesCorrelatas}</Text>
          </View>
        </View>

        {/* 14. Declaração de Viabilidade */}
        <View style={styles.sectionContainer} wrap={false}>
          <View style={styles.sectionHeaderBar}>
            <Text style={styles.sectionHeaderText}>
              14. Declaração da viabilidade ou não da contratação:
            </Text>
          </View>
          <View style={styles.sectionContentBox}>
            <Text style={styles.sectionParagraph}>{etp.declaracaoViabilidade}</Text>
          </View>
        </View>

        {/* 15. Responsabilidade pela Elaboração e Encerramento */}
        <View style={styles.sectionContainer} wrap={false}>
          <View style={styles.sectionHeaderBar}>
            <Text style={styles.sectionHeaderText}>
              15. Responsabilidade pela Elaboração e Conteúdo do Documento:
            </Text>
          </View>
          <View style={styles.sectionContentBox}>
            <Text style={[styles.sectionParagraph, { marginBottom: 16 }]}>
              Certificamos que somos responsáveis pela elaboração do presente documento que compila os Estudos
              Preliminares desta unidade demandante e que o mesmo traz os conteúdos, conforme diretrizes
              estabelecidas pela Universidade.
            </Text>
            <View style={styles.etpSignatureBlock}>
              <View style={styles.etpLine} />
              <Text style={{ fontWeight: "bold", fontSize: 9 }}>
                {etp.responsavelNome || "Responsável Técnico pela Elaboração"}
              </Text>
              <Text style={{ fontSize: 8, color: "#4B5563" }}>
                Matrícula: {etp.responsavelMatricula || "—"}
              </Text>
              <Text style={{ fontSize: 7.5, color: "#4B5563", marginTop: 2 }}>
                Local e data: Mossoró/RN, {dataHoje}.
              </Text>
            </View>
          </View>
        </View>
      </Page>

      {/* Anexo de Itens se houver */}
      {etp.itens && etp.itens.length > 0 && (
        <Page size="A4" style={styles.page}>
          <View style={styles.sectionContainer} wrap={false}>
            <View style={styles.sectionHeaderBar}>
              <Text style={styles.sectionHeaderText}>
                Anexo do ETP — Itens Consolidados da Demanda ({etp.categoriaNome})
              </Text>
            </View>
            <View style={styles.sectionContentBox}>
              <View style={styles.tableContainer}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.thCell, { width: "8%", textAlign: "center" }]}>Item</Text>
                  <Text style={[styles.thCell, { width: "46%" }]}>Descrição do Item</Text>
                  <Text style={[styles.thCell, { width: "12%", textAlign: "center" }]}>Qtde</Text>
                  <Text style={[styles.thCell, { width: "17%", textAlign: "right" }]}>Valor unit.</Text>
                  <Text style={[styles.thCell, { width: "17%", textAlign: "right", borderRightWidth: 0 }]}>
                    Valor total
                  </Text>
                </View>
                {etp.itens.map((it, idx) => (
                  <View key={idx} style={styles.tableRow}>
                    <Text style={[styles.tdCell, { width: "8%", textAlign: "center" }]}>{idx + 1}</Text>
                    <Text style={[styles.tdCell, { width: "46%" }]}>{it.nome}</Text>
                    <Text style={[styles.tdCell, { width: "12%", textAlign: "center" }]}>
                      {it.quantidade != null ? String(it.quantidade) : "—"}
                    </Text>
                    <Text style={[styles.tdCell, { width: "17%", textAlign: "right" }]}>
                      {it.valorUnit != null ? brl(it.valorUnit) : "—"}
                    </Text>
                    <Text style={[styles.tdCell, { width: "17%", textAlign: "right", borderRightWidth: 0 }]}>
                      {brl(it.valorTotal)}
                    </Text>
                  </View>
                ))}
                <View style={[styles.tableRow, { backgroundColor: "#F9FAFB" }]}>
                  <Text style={[styles.tdCell, { width: "83%", fontWeight: "bold", textAlign: "right" }]}>
                    Total Consolidado:
                  </Text>
                  <Text style={[styles.tdCell, { width: "17%", fontWeight: "bold", textAlign: "right", borderRightWidth: 0 }]}>
                    {brl(total)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </Page>
      )}
    </Document>
  );
}
