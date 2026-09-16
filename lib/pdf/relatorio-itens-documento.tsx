import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { brl } from "@/lib/formato";
import { totalDosItens, type ItemParaRelatorio } from "@/lib/relatorio-unidade";

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#1e293b" },
  titulo: { fontSize: 12, fontWeight: 700, textAlign: "center", marginBottom: 16 },
  tabela: { marginTop: 8, borderWidth: 1, borderColor: "#cbd5e1" },
  tabelaHeader: { flexDirection: "row", backgroundColor: "#f1f5f9", borderBottomWidth: 1, borderColor: "#cbd5e1" },
  tabelaLinha: { flexDirection: "row", borderBottomWidth: 1, borderColor: "#e2e8f0" },
  tabelaCelula: { padding: 4, fontSize: 9 },
  colCategoria: { width: "26%" },
  colItem: { width: "34%" },
  colQtd: { width: "10%", textAlign: "right" },
  colValorUnit: { width: "15%", textAlign: "right" },
  colValorTotal: { width: "15%", textAlign: "right" },
  totalLinha: { flexDirection: "row", backgroundColor: "#f1f5f9", fontWeight: 700 },
});

export function RelatorioItensDocumento({
  unidadeNome,
  itens,
}: {
  unidadeNome: string;
  itens: ItemParaRelatorio[];
}) {
  const total = totalDosItens(itens);

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Text style={s.titulo}>Relatório Geral de Itens — {unidadeNome}</Text>

        <View style={s.tabela}>
          <View style={s.tabelaHeader}>
            <Text style={[s.tabelaCelula, s.colCategoria]}>Categoria</Text>
            <Text style={[s.tabelaCelula, s.colItem]}>Item</Text>
            <Text style={[s.tabelaCelula, s.colQtd]}>Qtd.</Text>
            <Text style={[s.tabelaCelula, s.colValorUnit]}>Valor unitário</Text>
            <Text style={[s.tabelaCelula, s.colValorTotal]}>Valor total</Text>
          </View>
          {itens.map((it, i) => (
            <View key={i} style={s.tabelaLinha}>
              <Text style={[s.tabelaCelula, s.colCategoria]}>{it.categoriaNome}</Text>
              <Text style={[s.tabelaCelula, s.colItem]}>{it.nome}</Text>
              <Text style={[s.tabelaCelula, s.colQtd]}>{it.quantidade ?? "—"}</Text>
              <Text style={[s.tabelaCelula, s.colValorUnit]}>{it.valorUnit != null ? brl(it.valorUnit) : "—"}</Text>
              <Text style={[s.tabelaCelula, s.colValorTotal]}>{brl(it.valorTotal)}</Text>
            </View>
          ))}
          <View style={s.totalLinha}>
            <Text style={[s.tabelaCelula, s.colCategoria]}></Text>
            <Text style={[s.tabelaCelula, s.colItem]}></Text>
            <Text style={[s.tabelaCelula, s.colQtd]}></Text>
            <Text style={[s.tabelaCelula, s.colValorUnit]}>Total</Text>
            <Text style={[s.tabelaCelula, s.colValorTotal]}>{brl(total)}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
