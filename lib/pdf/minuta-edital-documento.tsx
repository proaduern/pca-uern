import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { brl, formatarDataHora } from "../formato";
import { SECOES_MINUTA } from "../minuta-edital";
import { totalItensMinuta, type MinutaEditalParaPdf } from "./minuta-edital-dados";

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#1e293b" },
  cabecalho: { fontSize: 9, textAlign: "center", marginBottom: 2 },
  titulo: { fontSize: 12, fontWeight: 700, textAlign: "center", marginTop: 8, marginBottom: 16 },
  secao: { marginTop: 12 },
  secaoTitulo: { fontSize: 10, fontWeight: 700, marginBottom: 4 },
  corpo: { fontSize: 9, lineHeight: 1.4 },
  rodape: { marginTop: 40, textAlign: "center" },
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

export function MinutaEditalDocumento({ minuta }: { minuta: MinutaEditalParaPdf }) {
  const totalAnexo = totalItensMinuta(minuta);

  return (
    <Document>
      <Page size="A4" style={s.page} wrap>
        <Text style={s.cabecalho}>UNIVERSIDADE DO ESTADO DO RIO GRANDE DO NORTE</Text>
        <Text style={s.cabecalho}>Processo nº {minuta.processoSEI}</Text>
        <Text style={s.titulo}>MINUTA DE EDITAL — {minuta.categoriaNome}</Text>

        <View style={s.secao}>
          <Text style={s.secaoTitulo}>1. Do Objeto</Text>
          <Text style={s.corpo}>{minuta.objeto}</Text>
        </View>
        <View style={s.secao}>
          <Text style={s.secaoTitulo}>18. Critérios de Medição e de Pagamento (do Termo de Referência)</Text>
          <Text style={s.corpo}>{minuta.criteriosMedicaoPagamento}</Text>
        </View>
        <View style={s.secao}>
          <Text style={s.secaoTitulo}>19. Forma e Critério de Seleção do Fornecedor (do Termo de Referência)</Text>
          <Text style={s.corpo}>{minuta.formaSelecaoFornecedor}</Text>
        </View>
        <View style={s.secao}>
          <Text style={s.secaoTitulo}>20. Exigências de Habilitação (do Termo de Referência)</Text>
          <Text style={s.corpo}>{minuta.exigenciasHabilitacao}</Text>
        </View>
        <View style={s.secao}>
          <Text style={s.secaoTitulo}>22. Garantia de Execução (do Termo de Referência)</Text>
          <Text style={s.corpo}>{minuta.garantiaExecucao}</Text>
        </View>

        {SECOES_MINUTA.map((secao) => (
          <View key={secao.campo} style={s.secao} wrap>
            <Text style={s.secaoTitulo}>
              {secao.numero}. {secao.titulo}
            </Text>
            <Text style={s.corpo}>{(minuta as unknown as Record<string, string>)[secao.campo]}</Text>
          </View>
        ))}

        <View style={s.secao}>
          <Text style={s.secaoTitulo}>31. Responsabilidade pela Elaboração e Conteúdo do Documento</Text>
          <Text style={s.corpo}>
            Certifico que sou responsável pela elaboração do presente documento e que o mesmo traz os
            conteúdos conforme diretrizes estabelecidas pela Universidade.
          </Text>
        </View>

        <View style={s.rodape}>
          <Text>Documento elaborado eletronicamente pelo sistema PCA-UERN</Text>
          <Text>
            {minuta.responsavelNome ?? "—"}
            {minuta.responsavelMatricula ? ` — Matrícula ${minuta.responsavelMatricula}` : ""}
          </Text>
          <Text>
            {minuta.status === "FINALIZADO" && minuta.finalizadoEm
              ? `Finalizado em: ${formatarDataHora(minuta.finalizadoEm)}`
              : "RASCUNHO — ainda não finalizado"}
          </Text>
          <Text style={s.nota}>
            Este documento não possui assinatura digital com certificação ICP-Brasil — deve ser
            protocolado e assinado no SEI para compor o processo formal de contratação.
          </Text>
        </View>
      </Page>

      <Page size="A4" style={s.page}>
        <Text style={s.titulo}>
          Anexo da Minuta de Edital — Itens Objeto da Licitação ({minuta.categoriaNome})
        </Text>

        <View style={s.tabela}>
          <View style={s.tabelaHeader}>
            <Text style={[s.tabelaCelula, s.colItem]}>Item</Text>
            <Text style={[s.tabelaCelula, s.colQtd]}>Qtd.</Text>
            <Text style={[s.tabelaCelula, s.colValorUnit]}>Valor unitário</Text>
            <Text style={[s.tabelaCelula, s.colValorTotal]}>Valor total</Text>
          </View>
          {minuta.itens.map((it, i) => (
            <View key={i} style={s.tabelaLinha}>
              <Text style={[s.tabelaCelula, s.colItem]}>{it.nome}</Text>
              <Text style={[s.tabelaCelula, s.colQtd]}>{it.quantidade ?? "—"}</Text>
              <Text style={[s.tabelaCelula, s.colValorUnit]}>{it.valorUnit != null ? brl(it.valorUnit) : "—"}</Text>
              <Text style={[s.tabelaCelula, s.colValorTotal]}>{brl(it.valorTotal)}</Text>
            </View>
          ))}
          <View style={s.totalLinha}>
            <Text style={[s.tabelaCelula, s.colItem]}></Text>
            <Text style={[s.tabelaCelula, s.colQtd]}></Text>
            <Text style={[s.tabelaCelula, s.colValorUnit]}>Total</Text>
            <Text style={[s.tabelaCelula, s.colValorTotal]}>{brl(totalAnexo)}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
