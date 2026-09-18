import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { brl, formatarDataHora } from "../formato";
import { SECOES_TR } from "../termo-referencia";
import { totalItensTr, type TermoReferenciaParaPdf } from "./termo-referencia-dados";

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

export function TermoReferenciaDocumento({ tr }: { tr: TermoReferenciaParaPdf }) {
  const totalAnexo = totalItensTr(tr);
  const totalPesquisa = tr.itensPesquisa.reduce((soma, it) => soma + it.quantidade * it.valorUnitarioPesquisado, 0);

  return (
    <Document>
      <Page size="A4" style={s.page} wrap>
        <Text style={s.cabecalho}>UNIVERSIDADE DO ESTADO DO RIO GRANDE DO NORTE</Text>
        <Text style={s.cabecalho}>Processo nº {tr.processoSEI}</Text>
        <Text style={s.titulo}>TERMO DE REFERÊNCIA — {tr.categoriaNome}</Text>

        <View style={s.secao}>
          <Text style={s.secaoTitulo}>1. Do Objeto</Text>
          <Text style={s.corpo}>{tr.objeto}</Text>
        </View>
        <View style={s.secao}>
          <Text style={s.secaoTitulo}>2. Da Fundamentação da Contratação</Text>
          <Text style={s.corpo}>{tr.necessidadeContratacao}</Text>
          <Text style={s.corpo}>{tr.referenciaPca}</Text>
        </View>
        <View style={s.secao}>
          <Text style={s.secaoTitulo}>3. Da Descrição da Solução</Text>
          <Text style={s.corpo}>{tr.descricaoSolucaoCompleta}</Text>
        </View>

        <View style={s.secao}>
          <Text style={s.secaoTitulo}>4. Da Estimativa de Valor da Contratação</Text>
          <Text style={s.corpo}>Metodologia da pesquisa de preços: {tr.metodologiaPesquisa}</Text>
          <View style={s.tabela}>
            <View style={s.tabelaHeader}>
              <Text style={[s.tabelaCelula, s.colItem]}>Item</Text>
              <Text style={[s.tabelaCelula, s.colQtd]}>Qtd.</Text>
              <Text style={[s.tabelaCelula, s.colValorUnit]}>Valor unit. pesquisado</Text>
              <Text style={[s.tabelaCelula, s.colValorTotal]}>Valor total</Text>
            </View>
            {tr.itensPesquisa.map((it, i) => (
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
              <Text style={[s.tabelaCelula, s.colValorTotal]}>{brl(totalPesquisa)}</Text>
            </View>
          </View>
        </View>

        {SECOES_TR.map((secao) => (
          <View key={secao.campo} style={s.secao} wrap>
            <Text style={s.secaoTitulo}>
              {secao.numero}. {secao.titulo}
            </Text>
            <Text style={s.corpo}>{(tr as unknown as Record<string, string>)[secao.campo]}</Text>
          </View>
        ))}

        <View style={s.secao}>
          <Text style={s.secaoTitulo}>23. Responsabilidade pela Elaboração e Conteúdo do Documento</Text>
          <Text style={s.corpo}>
            Certifico que sou responsável pela elaboração do presente documento e que o mesmo traz os
            conteúdos conforme diretrizes estabelecidas pela Universidade.
          </Text>
        </View>

        <View style={s.rodape}>
          <Text>Documento elaborado eletronicamente pelo sistema PCA-UERN</Text>
          <Text>
            {tr.responsavelNome ?? "—"}
            {tr.responsavelMatricula ? ` — Matrícula ${tr.responsavelMatricula}` : ""}
          </Text>
          <Text>
            {tr.status === "FINALIZADO" && tr.finalizadoEm
              ? `Finalizado em: ${formatarDataHora(tr.finalizadoEm)}`
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
          Anexo do Termo de Referência — Itens Objeto da Licitação ({tr.categoriaNome})
        </Text>

        <View style={s.tabela}>
          <View style={s.tabelaHeader}>
            <Text style={[s.tabelaCelula, s.colItem]}>Item</Text>
            <Text style={[s.tabelaCelula, s.colQtd]}>Qtd.</Text>
            <Text style={[s.tabelaCelula, s.colValorUnit]}>Valor unitário</Text>
            <Text style={[s.tabelaCelula, s.colValorTotal]}>Valor total</Text>
          </View>
          {tr.itens.map((it, i) => (
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
