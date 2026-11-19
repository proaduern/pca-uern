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

export interface AtaPdfProps {
  processoSEI: string;
  categoriaNome: string;
  sequencialTexto?: string;
  numeroAtaFormatado?: string;
  objeto: string;
  validadeMeses?: number;
  fornecedorRazaoSocial?: string;
  fornecedorCnpj?: string;
  itens: ItemParaRegramentoMpe[];
  autenticacao?: DadosAutenticacaoPdf;
}

export function AtaDocumentoPdf({
  processoSEI,
  categoriaNome,
  sequencialTexto,
  numeroAtaFormatado,
  objeto,
  validadeMeses = 12,
  fornecedorRazaoSocial,
  fornecedorCnpj,
  itens,
  autenticacao,
}: AtaPdfProps) {
  const itensDesdobrados = desdobrarItensComRegramentoMpe(itens);
  const total = itensDesdobrados.reduce((acc, it) => acc + it.valorTotalEstimado, 0);
  const titulo = numeroAtaFormatado ? `ATA DE REGISTRO DE PREÇOS Nº ${numeroAtaFormatado}` : "MINUTA DE ATA DE REGISTRO DE PREÇOS";

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
          <Text style={s.secaoTitulo}>ÓRGÃO GERENCIADOR E BENEFICIÁRIOS</Text>
          <Text style={s.corpo}>
            ÓRGÃO GERENCIADOR: UNIVERSIDADE DO ESTADO DO RIO GRANDE DO NORTE — UERN, autarquia estadual de regime especial,
            inscrita no CNPJ sob o nº 08.258.209/0001-07, sediada no Campus Central em Mossoró/RN.
          </Text>
          <Text style={[s.corpo, { marginTop: 4 }]}>
            DETENTORA DA ATA: {fornecedorRazaoSocial ? `${fornecedorRazaoSocial}, CNPJ nº ${fornecedorCnpj || "—"}` : "Fornecedor classificado em primeiro lugar no certame de Registro de Preços."}
          </Text>
        </View>

        <View style={s.secao}>
          <Text style={s.secaoTitulo}>CLÁUSULA PRIMEIRA — DO OBJETO E PREÇOS REGISTRADOS</Text>
          <Text style={s.corpo}>
            A presente Ata tem por objeto o registro de preços para a futura e eventual contratação de: {objeto},
            conforme condições, quantidades e especificações fixadas no Edital e no Termo de Referência.
          </Text>
        </View>

        <View style={s.secao}>
          <Text style={s.secaoTitulo}>CLÁUSULA SEGUNDA — DA VIGÊNCIA DA ATA</Text>
          <Text style={s.corpo}>
            O prazo de validade da Ata de Registro de Preços é de {validadeMeses} meses, contado a partir da publicação
            do seu extrato na imprensa oficial, prorrogável nos termos do art. 84 da Lei nº 14.133/2021.
          </Text>
        </View>

        <View style={s.secao}>
          <Text style={s.secaoTitulo}>CLÁUSULA TERCEIRA — DA UTILIZAÇÃO DA ATA E CANCELAMENTO</Text>
          <Text style={s.corpo}>
            A existência de preços registrados não obriga a Administração a contratar, facultando-se a realização de
            licitação específica para a contratação pretendida, sendo assegurada ao beneficiário do registro a preferência de fornecimento em igualdade de condições.
          </Text>
        </View>

        <View style={s.secao}>
          <Text style={s.secaoTitulo}>ANEXO — ITENS E PREÇOS REGISTRADOS (COM COTAS LC 675/2020)</Text>
          <View style={s.tabela}>
            <View style={s.tabelaHeader}>
              <Text style={[s.tabelaCelula, s.colItem]}>Item / Especificação</Text>
              <Text style={[s.tabelaCelula, s.colCota]}>Cota / LC 675</Text>
              <Text style={[s.tabelaCelula, s.colQtd]}>Qtd. Registrada</Text>
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
              <Text style={[s.tabelaCelula, s.colItem]}>VALOR TOTAL ESTIMADO REGISTRADO</Text>
              <Text style={[s.tabelaCelula, s.colCota]}></Text>
              <Text style={[s.tabelaCelula, s.colQtd]}></Text>
              <Text style={[s.tabelaCelula, s.colValorUnit]}></Text>
              <Text style={[s.tabelaCelula, s.colValorTotal]}>{brl(total)}</Text>
            </View>
          </View>
        </View>

        <View style={s.rodape}>
          <Text>Documento elaborado eletronicamente pelo Sistema Integrado PROAD (PCA/SGC-UERN)</Text>
          <Text>Modelo Oficial da Advocacia-Geral da União (AGU) — Sistema de Registro de Preços</Text>
        </View>

        <RodapeAutenticacaoPdf autenticacao={autenticacao} />
      </Page>
    </Document>
  );
}
