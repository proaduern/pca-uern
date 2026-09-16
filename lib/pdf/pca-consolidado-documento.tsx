import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { brl } from "@/lib/formato";
import { totaisConsolidado, type LinhaConsolidado } from "@/lib/pca-consolidado";

const s = StyleSheet.create({
  page: { padding: 30, fontSize: 8, fontFamily: "Helvetica", color: "#1e293b" },
  tituloOrgao: { fontSize: 10, fontWeight: 700, textAlign: "center" },
  tituloPca: { fontSize: 11, fontWeight: 700, textAlign: "center", marginBottom: 12 },
  tabela: { marginTop: 8, borderWidth: 1, borderColor: "#cbd5e1" },
  tabelaHeader: { flexDirection: "row", backgroundColor: "#f1f5f9", borderBottomWidth: 1, borderColor: "#cbd5e1" },
  tabelaLinha: { flexDirection: "row", borderBottomWidth: 1, borderColor: "#e2e8f0" },
  tabelaCelula: { padding: 3, fontSize: 7.5 },
  colRubrica: { width: "17%" },
  colModalidade: { width: "12%" },
  colCategoria: { width: "22%" },
  colValor: { width: "11%", textAlign: "right" },
  colPncp: { width: "16%" },
  totalLinha: { flexDirection: "row", backgroundColor: "#f1f5f9", fontWeight: 700 },
  resumo: { marginTop: 12 },
  resumoLinha: { flexDirection: "row", justifyContent: "space-between", maxWidth: 260, marginBottom: 2 },
});

export function PcaConsolidadoDocumento({ ano, linhas }: { ano: number; linhas: LinhaConsolidado[] }) {
  const totais = totaisConsolidado(linhas);

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={s.page}>
        <Text style={s.tituloOrgao}>FUNDAÇÃO UNIVERSIDADE DO ESTADO DO RIO GRANDE DO NORTE</Text>
        <Text style={s.tituloPca}>PLANO DE CONTRATAÇÕES ANUAIS – PCA {ano}</Text>

        <View style={s.tabela}>
          <View style={s.tabelaHeader}>
            <Text style={[s.tabelaCelula, s.colRubrica]}>Classificação / Rubrica Geral</Text>
            <Text style={[s.tabelaCelula, s.colModalidade]}>Modalidade</Text>
            <Text style={[s.tabelaCelula, s.colCategoria]}>Categoria</Text>
            <Text style={[s.tabelaCelula, s.colValor]}>Convênios</Text>
            <Text style={[s.tabelaCelula, s.colValor]}>Recursos Extra</Text>
            <Text style={[s.tabelaCelula, s.colValor]}>Fonte 500 (Geral + OP)</Text>
            <Text style={[s.tabelaCelula, s.colValor]}>TOTAL</Text>
            <Text style={[s.tabelaCelula, s.colPncp]}>Código PNCP</Text>
          </View>
          {linhas.map((l, i) => (
            <View key={i} style={s.tabelaLinha}>
              <Text style={[s.tabelaCelula, s.colRubrica]}>{l.classificacaoRubrica}</Text>
              <Text style={[s.tabelaCelula, s.colModalidade]}>{l.modalidade}</Text>
              <Text style={[s.tabelaCelula, s.colCategoria]}>{l.categoriaNome}</Text>
              <Text style={[s.tabelaCelula, s.colValor]}>{brl(l.convenio)}</Text>
              <Text style={[s.tabelaCelula, s.colValor]}>{brl(l.recursosExtra)}</Text>
              <Text style={[s.tabelaCelula, s.colValor]}>{brl(l.fonte500)}</Text>
              <Text style={[s.tabelaCelula, s.colValor]}>{brl(l.total)}</Text>
              <Text style={[s.tabelaCelula, s.colPncp]}>{l.codigoPncp ?? "—"}</Text>
            </View>
          ))}
          <View style={s.totalLinha}>
            <Text style={[s.tabelaCelula, s.colRubrica]}></Text>
            <Text style={[s.tabelaCelula, s.colModalidade]}></Text>
            <Text style={[s.tabelaCelula, s.colCategoria]}>TOTAIS</Text>
            <Text style={[s.tabelaCelula, s.colValor]}>{brl(totais.convenio)}</Text>
            <Text style={[s.tabelaCelula, s.colValor]}>{brl(totais.recursosExtra)}</Text>
            <Text style={[s.tabelaCelula, s.colValor]}>{brl(totais.fonte500)}</Text>
            <Text style={[s.tabelaCelula, s.colValor]}>{brl(totais.total)}</Text>
            <Text style={[s.tabelaCelula, s.colPncp]}></Text>
          </View>
        </View>

        <View style={s.resumo}>
          <View style={s.resumoLinha}>
            <Text>PCA FONTE 500</Text>
            <Text>{brl(totais.fonte500)}</Text>
          </View>
          <View style={s.resumoLinha}>
            <Text>PCA TOTAL (500 + CONVÊNIOS + OUTRAS FONTES)</Text>
            <Text>{brl(totais.total)}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
