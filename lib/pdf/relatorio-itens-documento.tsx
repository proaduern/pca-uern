import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { brl } from "@/lib/formato";
import { agruparPorCategoria, totalDosItens, type ItemParaRelatorio } from "@/lib/relatorio-unidade";
import type { DadosAutenticacaoPdf } from "./autenticacao";
import { RodapeAutenticacaoPdf } from "./rodape-autenticacao";

const s = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingHorizontal: 40,
    paddingBottom: 52,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#1e293b",
  },
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
  categoriaHeader: { backgroundColor: "#e2e8f0", padding: 4, fontSize: 9, fontWeight: 700 },
  subtotalLinha: { flexDirection: "row", backgroundColor: "#f8fafc", fontWeight: 700 },
  totalLinha: { flexDirection: "row", backgroundColor: "#f1f5f9", fontWeight: 700 },
  signatureBlock: { marginTop: 24, alignItems: "center", textAlign: "center" },
  signatureLine: { width: 220, borderTopWidth: 0.8, borderColor: "#94a3b8", marginBottom: 4 },
  signatureName: { fontSize: 8.5, fontWeight: 700, color: "#0f172a" },
  signatureRole: { fontSize: 7.5, color: "#475569" },
  signatureSub: { fontSize: 7, color: "#64748b", marginTop: 1 },
});

export function RelatorioItensDocumento({
  unidadeNome,
  itens,
  autenticacao,
  responsavelNome,
  responsavelMatricula,
}: {
  unidadeNome: string;
  itens: ItemParaRelatorio[];
  autenticacao?: DadosAutenticacaoPdf;
  responsavelNome?: string;
  responsavelMatricula?: string;
}) {
  const total = totalDosItens(itens);
  const grupos = agruparPorCategoria(itens);

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
          {grupos.map((grupo) => (
            <View key={grupo.categoriaNome}>
              <Text style={s.categoriaHeader}>{grupo.categoriaNome}</Text>
              {grupo.itens.map((it, i) => (
                <View key={i} style={s.tabelaLinha}>
                  <Text style={[s.tabelaCelula, s.colCategoria]}></Text>
                  <Text style={[s.tabelaCelula, s.colItem]}>{it.nome}</Text>
                  <Text style={[s.tabelaCelula, s.colQtd]}>{it.quantidade ?? "—"}</Text>
                  <Text style={[s.tabelaCelula, s.colValorUnit]}>
                    {it.valorUnit != null ? brl(it.valorUnit) : "—"}
                  </Text>
                  <Text style={[s.tabelaCelula, s.colValorTotal]}>{brl(it.valorTotal)}</Text>
                </View>
              ))}
              <View style={s.subtotalLinha}>
                <Text style={[s.tabelaCelula, s.colCategoria]}></Text>
                <Text style={[s.tabelaCelula, s.colItem]}></Text>
                <Text style={[s.tabelaCelula, s.colQtd]}></Text>
                <Text style={[s.tabelaCelula, s.colValorUnit]}>Subtotal</Text>
                <Text style={[s.tabelaCelula, s.colValorTotal]}>{brl(grupo.subtotal)}</Text>
              </View>
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

        <View style={s.signatureBlock} wrap={false}>
          <View style={s.signatureLine} />
          <Text style={s.signatureName}>{responsavelNome || "Responsável pela Unidade Demandante"}</Text>
          <Text style={s.signatureRole}>
            {responsavelMatricula ? `Matrícula nº ${responsavelMatricula} • ` : ""}{unidadeNome}
          </Text>
          <Text style={s.signatureSub}>
            Documento emitido eletronicamente pelo Sistema PCA-UERN
          </Text>
        </View>

        <RodapeAutenticacaoPdf autenticacao={autenticacao} />
      </Page>
    </Document>
  );
}
