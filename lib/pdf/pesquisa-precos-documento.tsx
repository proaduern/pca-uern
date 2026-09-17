import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { brl, formatarDataHora } from "../formato";
import { totalPesquisaPrecosPdf, type PesquisaPrecosParaPdf } from "./pesquisa-precos-dados";

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#1e293b" },
  cabecalho: { fontSize: 9, textAlign: "center", marginBottom: 2 },
  titulo: { fontSize: 12, fontWeight: 700, textAlign: "center", marginTop: 8, marginBottom: 16 },
  secao: { marginTop: 12 },
  secaoTitulo: { fontSize: 10, fontWeight: 700, marginBottom: 4 },
  corpo: { fontSize: 9, lineHeight: 1.4 },
  linha: { marginBottom: 2 },
  label: { fontWeight: 700 },
  rodape: { marginTop: 24, textAlign: "center" },
  nota: { fontSize: 8, fontStyle: "italic", color: "#475569", marginTop: 4 },
  tabela: { marginTop: 8, borderWidth: 1, borderColor: "#cbd5e1" },
  tabelaHeader: { flexDirection: "row", backgroundColor: "#f1f5f9", borderBottomWidth: 1, borderColor: "#cbd5e1" },
  tabelaLinha: { flexDirection: "row", borderBottomWidth: 1, borderColor: "#e2e8f0" },
  tabelaCelula: { padding: 4, fontSize: 9 },
  colItem: { width: "46%" },
  colQtd: { width: "14%", textAlign: "right" },
  colValorUnit: { width: "20%", textAlign: "right" },
  colValorTotal: { width: "20%", textAlign: "right" },
  totalLinha: { flexDirection: "row", backgroundColor: "#f1f5f9", fontWeight: 700 },
});

export function PesquisaPrecosDocumento({ pesquisa }: { pesquisa: PesquisaPrecosParaPdf }) {
  const total = totalPesquisaPrecosPdf(pesquisa);

  return (
    <Document>
      <Page size="A4" style={s.page} wrap>
        <Text style={s.cabecalho}>UNIVERSIDADE DO ESTADO DO RIO GRANDE DO NORTE</Text>
        <Text style={s.cabecalho}>Processo nº {pesquisa.processoSEI}</Text>
        <Text style={s.titulo}>PESQUISA DE PREÇOS — {pesquisa.categoriaNome}</Text>

        <View style={s.secao}>
          <Text style={s.secaoTitulo}>Metodologia da Pesquisa</Text>
          <Text style={s.corpo}>{pesquisa.metodologia || "—"}</Text>
        </View>

        {pesquisa.arquivoPdfNome && (
          <View style={s.secao}>
            <Text style={s.corpo}>
              <Text style={s.label}>PDF de referência enviado: </Text>
              {pesquisa.arquivoPdfNome}
            </Text>
          </View>
        )}

        <View style={s.tabela}>
          <View style={s.tabelaHeader}>
            <Text style={[s.tabelaCelula, s.colItem]}>Item</Text>
            <Text style={[s.tabelaCelula, s.colQtd]}>Qtd.</Text>
            <Text style={[s.tabelaCelula, s.colValorUnit]}>Valor unit. pesquisado</Text>
            <Text style={[s.tabelaCelula, s.colValorTotal]}>Valor total</Text>
          </View>
          {pesquisa.itens.map((it, i) => (
            <View key={i} style={s.tabelaLinha}>
              <Text style={[s.tabelaCelula, s.colItem]}>{it.item}</Text>
              <Text style={[s.tabelaCelula, s.colQtd]}>{it.quantidade}</Text>
              <Text style={[s.tabelaCelula, s.colValorUnit]}>{brl(it.valorUnitarioPesquisado)}</Text>
              <Text style={[s.tabelaCelula, s.colValorTotal]}>{brl(it.quantidade * it.valorUnitarioPesquisado)}</Text>
            </View>
          ))}
          <View style={s.totalLinha}>
            <Text style={[s.tabelaCelula, s.colItem]}></Text>
            <Text style={[s.tabelaCelula, s.colQtd]}></Text>
            <Text style={[s.tabelaCelula, s.colValorUnit]}>Total estimado</Text>
            <Text style={[s.tabelaCelula, s.colValorTotal]}>{brl(total)}</Text>
          </View>
        </View>

        <View style={s.rodape}>
          <Text>Documento elaborado eletronicamente pelo sistema PCA-UERN</Text>
          <Text>
            {pesquisa.responsavelNome ?? "—"}
            {pesquisa.responsavelMatricula ? ` — Matrícula ${pesquisa.responsavelMatricula}` : ""}
          </Text>
          <Text>
            {pesquisa.status === "FINALIZADO" && pesquisa.finalizadoEm
              ? `Finalizado em: ${formatarDataHora(pesquisa.finalizadoEm)}`
              : "RASCUNHO — ainda não finalizado"}
          </Text>
          <Text style={s.nota}>
            Este documento não possui assinatura digital com certificação ICP-Brasil — deve ser
            protocolado e assinado no SEI para compor o processo formal de contratação.
          </Text>
        </View>
      </Page>
    </Document>
  );
}
