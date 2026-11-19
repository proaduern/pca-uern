import React from "react";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { brl, formatarDataHora } from "../formato";
import { SECOES_MINUTA } from "../minuta-edital";
import { totalItensMinuta, type MinutaEditalParaPdf } from "./minuta-edital-dados";
import type { DadosAutenticacaoPdf } from "./autenticacao";
import { RodapeAutenticacaoPdf } from "./rodape-autenticacao";
import { CabecalhoInstitucionalPdf } from "./cabecalho-institucional-pdf";

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
  colItem: { width: "46%" },
  colQtd: { width: "14%", textAlign: "right" },
  colValorUnit: { width: "20%", textAlign: "right" },
  colValorTotal: { width: "20%", textAlign: "right" },
  totalLinha: { flexDirection: "row", backgroundColor: "#f8fafc", fontWeight: "bold" },
});

export function MinutaEditalDocumento({
  minuta,
  autenticacao,
}: {
  minuta: MinutaEditalParaPdf;
  autenticacao?: DadosAutenticacaoPdf;
}) {
  const totalAnexo = totalItensMinuta(minuta);
  const tituloDoc = minuta.sequencialTexto ? "EDITAL DE LICITAÇÃO" : "MINUTA DE EDITAL DE LICITAÇÃO";

  return (
    <Document>
      <Page size="A4" style={s.page} wrap>
        <CabecalhoInstitucionalPdf
          tituloDocumento={tituloDoc}
          processoSEI={minuta.processoSEI}
          categoriaNome={minuta.categoriaNome}
          numeroSequencial={minuta.sequencialTexto}
        />

        <View style={s.secao}>
          <Text style={s.secaoTitulo}>1. DO OBJETO DA LICITAÇÃO</Text>
          <Text style={s.corpo}>{minuta.objeto}</Text>
        </View>

        <View style={s.secao}>
          <Text style={s.secaoTitulo}>2. DA FORMA E CRITÉRIOS DE SELEÇÃO DO FORNECEDOR</Text>
          <Text style={s.corpo}>{minuta.formaSelecaoFornecedor}</Text>
        </View>

        <View style={s.secao}>
          <Text style={s.secaoTitulo}>3. DAS EXIGÊNCIAS DE HABILITAÇÃO</Text>
          <Text style={s.corpo}>{minuta.exigenciasHabilitacao}</Text>
        </View>

        <View style={s.secao}>
          <Text style={s.secaoTitulo}>4. DOS CRITÉRIOS DE MEDIÇÃO E PAGAMENTO</Text>
          <Text style={s.corpo}>{minuta.criteriosMedicaoPagamento}</Text>
        </View>

        <View style={s.secao}>
          <Text style={s.secaoTitulo}>5. DA GARANTIA DE EXECUÇÃO CONTRATUAL</Text>
          <Text style={s.corpo}>{minuta.garantiaExecucao}</Text>
        </View>

        {SECOES_MINUTA.map((secao) => (
          <View key={secao.campo} style={s.secao} wrap>
            <Text style={s.secaoTitulo}>
              {secao.numero}. {secao.titulo.toUpperCase()}
            </Text>
            <Text style={s.corpo}>{(minuta as unknown as Record<string, string>)[secao.campo] || "—"}</Text>
          </View>
        ))}

        <View style={s.secao}>
          <Text style={s.secaoTitulo}>ANEXO — RELAÇÃO ESTIMADA DE ITENS DA LICITAÇÃO</Text>
          <View style={s.tabela}>
            <View style={s.tabelaHeader}>
              <Text style={[s.tabelaCelula, s.colItem]}>Item / Descrição</Text>
              <Text style={[s.tabelaCelula, s.colQtd]}>Qtd.</Text>
              <Text style={[s.tabelaCelula, s.colValorUnit]}>Valor Unit.</Text>
              <Text style={[s.tabelaCelula, s.colValorTotal]}>Valor Total</Text>
            </View>
            {minuta.itens.map((it, i) => (
              <View key={i} style={s.tabelaLinha}>
                <Text style={[s.tabelaCelula, s.colItem]}>{it.nome}</Text>
                <Text style={[s.tabelaCelula, s.colQtd]}>{it.quantidade ?? "—"}</Text>
                <Text style={[s.tabelaCelula, s.colValorUnit]}>
                  {it.valorUnit != null ? brl(it.valorUnit) : "—"}
                </Text>
                <Text style={[s.tabelaCelula, s.colValorTotal]}>{brl(it.valorTotal)}</Text>
              </View>
            ))}
            <View style={s.totalLinha}>
              <Text style={[s.tabelaCelula, s.colItem]}>TOTAL ESTIMADO</Text>
              <Text style={[s.tabelaCelula, s.colQtd]}></Text>
              <Text style={[s.tabelaCelula, s.colValorUnit]}></Text>
              <Text style={[s.tabelaCelula, s.colValorTotal]}>{brl(totalAnexo)}</Text>
            </View>
          </View>
        </View>

        <View style={s.rodape}>
          <Text>Documento elaborado eletronicamente pelo Sistema de Planejamento de Contratações (PCA-UERN)</Text>
          <Text>
            {minuta.responsavelNome ?? "—"}
            {minuta.responsavelMatricula ? ` — Matrícula ${minuta.responsavelMatricula}` : ""}
          </Text>
          <Text>
            {minuta.status === "FINALIZADO" && minuta.finalizadoEm
              ? `Finalizado em: ${formatarDataHora(minuta.finalizadoEm)}`
              : "RASCUNHO — em elaboração"}
          </Text>
        </View>

        <RodapeAutenticacaoPdf autenticacao={autenticacao} />
      </Page>
    </Document>
  );
}
