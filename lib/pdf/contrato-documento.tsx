import React from "react";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { brl } from "../formato";
import type { DadosAutenticacaoPdf } from "./autenticacao";
import { RodapeAutenticacaoPdf } from "./rodape-autenticacao";
import { CabecalhoInstitucionalPdf } from "./cabecalho-institucional-pdf";
import { desdobrarItensComRegramentoMpe, type ItemParaRegramentoMpe } from "../regramento-mpe";

const s = StyleSheet.create({
  page: {
    paddingTop: 32,
    paddingHorizontal: 36,
    paddingBottom: 48,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#1e293b",
  },
  secao: { marginTop: 10 },
  secaoTitulo: { fontSize: 9.5, fontWeight: "bold", marginBottom: 3, color: "#1e3a8a" },
  corpo: { fontSize: 8.5, lineHeight: 1.35, textAlign: "justify" },
  rodape: { marginTop: 24, textAlign: "center", fontSize: 8 },
  tabela: { marginTop: 6, borderWidth: 1, borderColor: "#cbd5e1" },
  tabelaHeader: { flexDirection: "row", backgroundColor: "#f1f5f9", borderBottomWidth: 1, borderColor: "#cbd5e1" },
  tabelaLinha: { flexDirection: "row", borderBottomWidth: 1, borderColor: "#e2e8f0" },
  tabelaCelula: { padding: 3.5, fontSize: 8 },
  colItem: { width: "42%" },
  colCota: { width: "22%", fontSize: 7.5 },
  colQtd: { width: "10%", textAlign: "right" },
  colValorUnit: { width: "13%", textAlign: "right" },
  colValorTotal: { width: "13%", textAlign: "right" },
  totalLinha: { flexDirection: "row", backgroundColor: "#f8fafc", fontWeight: "bold" },
});

export interface ContratoPdfProps {
  processoSEI: string;
  categoriaNome: string;
  sequencialTexto?: string;
  numeroContratoFormatado?: string;
  objeto: string;
  vigenciaMeses?: number;
  garantiaPercentual?: number;
  fornecedorRazaoSocial?: string;
  fornecedorCnpj?: string;
  valorTotalEstimado?: number;
  itens: ItemParaRegramentoMpe[];
  autenticacao?: DadosAutenticacaoPdf;
}

export function ContratoDocumentoPdf({
  processoSEI,
  categoriaNome,
  sequencialTexto,
  numeroContratoFormatado,
  objeto,
  vigenciaMeses = 12,
  garantiaPercentual = 5,
  fornecedorRazaoSocial,
  fornecedorCnpj,
  itens,
  autenticacao,
}: ContratoPdfProps) {
  const itensDesdobrados = desdobrarItensComRegramentoMpe(itens);
  const total = itensDesdobrados.reduce((acc, it) => acc + it.valorTotalEstimado, 0);
  const titulo = numeroContratoFormatado ? `TERMO DE CONTRATO Nº ${numeroContratoFormatado}` : "MINUTA DE TERMO DE CONTRATO";

  return (
    <Document>
      <Page size="A4" style={s.page} wrap>
        <CabecalhoInstitucionalPdf
          tituloDocumento={titulo}
          processoSEI={processoSEI}
          categoriaNome={categoriaNome}
          numeroSequencial={sequencialTexto}
        />

        <View style={s.secao}>
          <Text style={s.secaoTitulo}>DAS PARTES CONTRATANTES</Text>
          <Text style={s.corpo}>
            CONTRATANTE: UNIVERSIDADE DO ESTADO DO RIO GRANDE DO NORTE — UERN, autarquia estadual de regime especial,
            com sede em Mossoró/RN, CNPJ sob nº 08.258.209/0001-07, representada por sua Reitora ou autoridade delegada.
          </Text>
          <Text style={[s.corpo, { marginTop: 4 }]}>
            CONTRATADA: {fornecedorRazaoSocial ? `${fornecedorRazaoSocial}, inscrita no CNPJ sob nº ${fornecedorCnpj || "—"}` : "Empresa vencedora a ser homologada no certame licitatório."}
          </Text>
        </View>

        <View style={s.secao}>
          <Text style={s.secaoTitulo}>CLÁUSULA PRIMEIRA — DO OBJETO</Text>
          <Text style={s.corpo}>{objeto}</Text>
        </View>

        <View style={s.secao}>
          <Text style={s.secaoTitulo}>CLÁUSULA SEGUNDA — DA VIGÊNCIA E PRORROGAÇÃO</Text>
          <Text style={s.corpo}>
            O prazo de vigência desta contratação é de {vigenciaMeses} meses, com início na data de sua publicação ou assinatura,
            podendo ser prorrogado nos termos dos artigos 105 a 107 da Lei nº 14.133/2021.
          </Text>
        </View>

        <View style={s.secao}>
          <Text style={s.secaoTitulo}>CLÁUSULA TERCEIRA — DO VALOR CONTRATUAL E ADEQUAÇÃO ORÇAMENTÁRIA</Text>
          <Text style={s.corpo}>
            O valor total estimado desta contratação é de {brl(total)}, correndo a despesa à conta dos recursos orçamentários
            consignados no orçamento da UERN para o presente exercício financeiro.
          </Text>
        </View>

        <View style={s.secao}>
          <Text style={s.secaoTitulo}>CLÁUSULA QUARTA — DA GARANTIA CONTRATUAL</Text>
          <Text style={s.corpo}>
            A Contratada prestará garantia de execução no percentual de {garantiaPercentual}% sobre o valor global do contrato,
            em uma das modalidades previstas no art. 96, § 1º da Lei nº 14.133/2021.
          </Text>
        </View>

        <View style={s.secao}>
          <Text style={s.secaoTitulo}>CLÁUSULA QUINTA — DA GESTÃO, FISCALIZAÇÃO E MEDIÇÃO (IMR)</Text>
          <Text style={s.corpo}>
            A fiscalização da execução contratual observará as disposições da Lei Federal nº 14.133/2021 e do Termo de Referência,
            aplicando-se as metas e indicadores do Instrumento de Medição de Resultado (IMR) para apuração de conformidade e liquidação.
          </Text>
        </View>

        <View style={s.secao}>
          <Text style={s.secaoTitulo}>ANEXO — ITENS CONTRATADOS E TRATAMENTO DIFERENCIADO (LC 675/2020)</Text>
          <View style={s.tabela}>
            <View style={s.tabelaHeader}>
              <Text style={[s.tabelaCelula, s.colItem]}>Item / Especificação</Text>
              <Text style={[s.tabelaCelula, s.colCota]}>Cota / LC 675</Text>
              <Text style={[s.tabelaCelula, s.colQtd]}>Qtd.</Text>
              <Text style={[s.tabelaCelula, s.colValorUnit]}>Valor Unit.</Text>
              <Text style={[s.tabelaCelula, s.colValorTotal]}>Valor Total</Text>
            </View>
            {itensDesdobrados.map((it, i) => (
              <View key={i} style={s.tabelaLinha}>
                <Text style={[s.tabelaCelula, s.colItem]}>{it.descricao}</Text>
                <Text style={[s.tabelaCelula, s.colCota]}>{it.enquadramentoTexto}</Text>
                <Text style={[s.tabelaCelula, s.colQtd]}>{it.quantidade}</Text>
                <Text style={[s.tabelaCelula, s.colValorUnit]}>{brl(it.valorUnitarioEstimado)}</Text>
                <Text style={[s.tabelaCelula, s.colValorTotal]}>{brl(it.valorTotalEstimado)}</Text>
              </View>
            ))}
            <View style={s.totalLinha}>
              <Text style={[s.tabelaCelula, s.colItem]}>TOTAL GERAL ESTIMADO</Text>
              <Text style={[s.tabelaCelula, s.colCota]}></Text>
              <Text style={[s.tabelaCelula, s.colQtd]}></Text>
              <Text style={[s.tabelaCelula, s.colValorUnit]}></Text>
              <Text style={[s.tabelaCelula, s.colValorTotal]}>{brl(total)}</Text>
            </View>
          </View>
        </View>

        <View style={s.rodape}>
          <Text>Documento elaborado eletronicamente pelo Sistema Integrado PROAD (PCA/SGC-UERN)</Text>
          <Text>Modelo Oficial da Advocacia-Geral da União (AGU) — Lei nº 14.133/2021</Text>
        </View>

        <RodapeAutenticacaoPdf autenticacao={autenticacao} />
      </Page>
    </Document>
  );
}
