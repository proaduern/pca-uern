import React from "react";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { CabecalhoInstitucionalPdf } from "./cabecalho-institucional-pdf";
import { RodapeAutenticacaoPdf } from "./rodape-autenticacao";
import type { DadosAutenticacaoPdf } from "./autenticacao";
import type { ItemImrPadrao } from "../imr-padrao";

const s = StyleSheet.create({
  page: {
    paddingTop: 32,
    paddingHorizontal: 36,
    paddingBottom: 48,
    fontSize: 8.5,
    fontFamily: "Helvetica",
    color: "#1e293b",
  },
  secao: { marginTop: 10 },
  secaoTitulo: { fontSize: 9.5, fontWeight: "bold", marginBottom: 3, color: "#1e3a8a" },
  corpo: { fontSize: 8.5, lineHeight: 1.35, textAlign: "justify" },
  tabela: { marginTop: 6, borderWidth: 1, borderColor: "#cbd5e1" },
  tabelaHeader: { flexDirection: "row", backgroundColor: "#1e3a8a", borderBottomWidth: 1, borderColor: "#cbd5e1" },
  tabelaLinha: { flexDirection: "row", borderBottomWidth: 1, borderColor: "#e2e8f0" },
  th: { padding: 4, fontSize: 8, fontWeight: "bold", color: "#ffffff" },
  td: { padding: 3.5, fontSize: 7.5 },
  colNum: { width: "6%", textAlign: "center" },
  colIndicador: { width: "22%" },
  colEscopo: { width: "16%" },
  colDesc: { width: "44%" },
  colPontos: { width: "12%", textAlign: "center", fontWeight: "bold" },

  // Tabela Glosa
  thGlosa: { padding: 4, fontSize: 8, fontWeight: "bold", color: "#ffffff", textAlign: "center" },
  tdGlosa: { padding: 3.5, fontSize: 8, textAlign: "center" },
  colFaixa: { width: "40%" },
  colConceito: { width: "30%" },
  colGlosa: { width: "30%" },

  rodape: { marginTop: 24, textAlign: "center", fontSize: 8 },
});

export interface ImrPdfProps {
  processoSEI: string;
  categoriaNome: string;
  tipoModelo: "DEDICACAO_EXCLUSIVA" | "SERVICOS_GERAIS";
  sequencialTexto?: string;
  responsavelNome?: string | null;
  responsavelMatricula?: string | null;
  dataTexto?: string;
  itens: ItemImrPadrao[];
  autenticacao?: DadosAutenticacaoPdf;
}

export function ImrDocumentoPdf({
  processoSEI,
  categoriaNome,
  tipoModelo,
  sequencialTexto,
  responsavelNome,
  responsavelMatricula,
  itens,
  autenticacao,
}: ImrPdfProps) {
  const subtituloModelo =
    tipoModelo === "DEDICACAO_EXCLUSIVA"
      ? "MODELO A — DEDICAÇÃO EXCLUSIVA DE MÃO DE OBRA (PADRÃO ZELO)"
      : "MODELO B — SERVIÇOS EM GERAL SEM DEDICAÇÃO EXCLUSIVA (SLA & QUALIDADE)";

  return (
    <Document>
      <Page size="A4" style={s.page} wrap>
        <CabecalhoInstitucionalPdf
          tituloDocumento="INSTRUMENTO DE MEDIÇÃO DE RESULTADO — IMR"
          processoSEI={processoSEI}
          categoriaNome={categoriaNome}
          numeroSequencial={sequencialTexto}
        />

        <View style={s.secao}>
          <Text style={s.secaoTitulo}>1. DISPOSIÇÕES GERAIS E OBJETIVOS ({subtituloModelo})</Text>
          <Text style={s.corpo}>
            O presente Instrumento de Medição de Resultado (IMR) estabelece os critérios objetivos para avaliação
            mensal da execução dos serviços contratados pela Universidade do Estado do Rio Grande do Norte (UERN),
            atrelamento do pagamento à conformidade e aplicação de eventuais glosas contratuais, conforme Lei Federal
            nº 14.133/2021.
          </Text>
        </View>

        <View style={s.secao}>
          <Text style={s.secaoTitulo}>2. FAIXAS DE PONTUAÇÃO E REGRA DE GLOSA</Text>
          <View style={s.tabela}>
            <View style={s.tabelaHeader}>
              <Text style={[s.thGlosa, s.colFaixa]}>Pontuação Acumulada no Período</Text>
              <Text style={[s.thGlosa, s.colConceito]}>Conceito / Avaliação</Text>
              <Text style={[s.thGlosa, s.colGlosa]}>Percentual de Desconto / Glosa</Text>
            </View>
            <View style={s.tabelaLinha}>
              <Text style={[s.tdGlosa, s.colFaixa]}>Até 5,0 pontos</Text>
              <Text style={[s.tdGlosa, s.colConceito]}>Excelente / Ótimo</Text>
              <Text style={[s.tdGlosa, s.colGlosa]}>0% (Pagamento Integral - 100%)</Text>
            </View>
            <View style={s.tabelaLinha}>
              <Text style={[s.tdGlosa, s.colFaixa]}>De 5,1 a 10,0 pontos</Text>
              <Text style={[s.tdGlosa, s.colConceito]}>Bom / Regular com ressalva</Text>
              <Text style={[s.tdGlosa, s.colGlosa]}>Glosa de 2% do valor da fatura</Text>
            </View>
            <View style={s.tabelaLinha}>
              <Text style={[s.tdGlosa, s.colFaixa]}>De 10,1 a 20,0 pontos</Text>
              <Text style={[s.tdGlosa, s.colConceito]}>Regular / Insatisfatório</Text>
              <Text style={[s.tdGlosa, s.colGlosa]}>Glosa de 5% do valor da fatura</Text>
            </View>
            <View style={s.tabelaLinha}>
              <Text style={[s.tdGlosa, s.colFaixa]}>Acima de 20,0 pontos</Text>
              <Text style={[s.tdGlosa, s.colConceito]}>Crítico / Inadimplemento Grave</Text>
              <Text style={[s.tdGlosa, s.colGlosa]}>Glosa de 10% + Abertura de PAD</Text>
            </View>
          </View>
        </View>

        <View style={s.secao} wrap>
          <Text style={s.secaoTitulo}>3. TABELA DE OCORRÊNCIAS E PONTUAÇÃO DE NÃO CONFORMIDADES</Text>
          <View style={s.tabela}>
            <View style={s.tabelaHeader}>
              <Text style={[s.th, s.colNum]}>Nº</Text>
              <Text style={[s.th, s.colIndicador]}>Indicador</Text>
              <Text style={[s.th, s.colEscopo]}>Escopo</Text>
              <Text style={[s.th, s.colDesc]}>Ocorrência / Descrição</Text>
              <Text style={[s.th, s.colPontos]}>Pontos</Text>
            </View>
            {itens.map((it, idx) => (
              <View key={idx} style={s.tabelaLinha} wrap={false}>
                <Text style={[s.td, s.colNum]}>{(idx + 1).toString().padStart(2, "0")}</Text>
                <Text style={[s.td, s.colIndicador]}>{it.indicadorNome}</Text>
                <Text style={[s.td, s.colEscopo]}>{it.servicoEscopo}</Text>
                <Text style={[s.td, s.colDesc]}>{it.descricao}</Text>
                <Text style={[s.td, s.colPontos]}>{it.pontuacaoTexto}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={s.rodape}>
          <Text>Documento elaborado eletronicamente pelo Sistema de Planejamento de Contratações (PCA-UERN)</Text>
          <Text>
            {responsavelNome ?? "—"}
            {responsavelMatricula ? ` — Matrícula ${responsavelMatricula}` : ""}
          </Text>
        </View>

        <RodapeAutenticacaoPdf autenticacao={autenticacao} />
      </Page>
    </Document>
  );
}
