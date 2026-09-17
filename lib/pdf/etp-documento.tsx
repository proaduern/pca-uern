import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { brl, formatarDataHora } from "../formato";
import { SECOES_ETP } from "../etp-riscos";
import { totalItensEtp, type EtpParaPdf } from "./etp-dados";

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#1e293b" },
  cabecalho: { fontSize: 9, textAlign: "center", marginBottom: 2 },
  titulo: { fontSize: 12, fontWeight: 700, textAlign: "center", marginTop: 8, marginBottom: 16 },
  secao: { marginTop: 12 },
  secaoTitulo: { fontSize: 10, fontWeight: 700, marginBottom: 4 },
  corpo: { fontSize: 9, lineHeight: 1.4 },
  linha: { marginBottom: 2 },
  label: { fontWeight: 700 },
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

export function EtpDocumento({ etp }: { etp: EtpParaPdf }) {
  const total = totalItensEtp(etp);

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Text style={s.cabecalho}>UNIVERSIDADE DO ESTADO DO RIO GRANDE DO NORTE</Text>
        <Text style={s.cabecalho}>Processo nº {etp.processoSEI}</Text>
        <Text style={s.titulo}>ESTUDO TÉCNICO PRELIMINAR DA CONTRATAÇÃO</Text>

        <View style={s.secao}>
          <Text style={s.secaoTitulo}>1. Dados do Processo</Text>
          <Text style={s.linha}>
            <Text style={s.label}>Categoria: </Text>
            {etp.categoriaNome}
          </Text>
          <Text style={s.linha}>
            <Text style={s.label}>Objeto: </Text>
            {etp.objeto}
          </Text>
          <Text style={s.linha}>
            <Text style={s.label}>Local da entrega ou prestação do serviço: </Text>
            {etp.localEntregaPrestacao}
          </Text>
        </View>

        {SECOES_ETP.map((secao) => (
          <View key={secao.campo} style={s.secao} wrap>
            <Text style={s.secaoTitulo}>
              {secao.numero}. {secao.titulo}
            </Text>
            <Text style={s.corpo}>{(etp as unknown as Record<string, string>)[secao.campo]}</Text>
          </View>
        ))}

        <View style={s.secao}>
          <Text style={s.secaoTitulo}>15. Responsabilidade pela Elaboração e Conteúdo do Documento</Text>
          <Text style={s.corpo}>
            Certifico que sou responsável pela elaboração do presente documento e que o mesmo traz os
            conteúdos conforme diretrizes estabelecidas pela Universidade.
          </Text>
        </View>

        <View style={s.rodape}>
          <Text>Documento elaborado eletronicamente pelo sistema PCA-UERN</Text>
          <Text>
            {etp.responsavelNome ?? "—"}
            {etp.responsavelMatricula ? ` — Matrícula ${etp.responsavelMatricula}` : ""}
          </Text>
          <Text>
            {etp.status === "FINALIZADO" && etp.finalizadoEm
              ? `Finalizado em: ${formatarDataHora(etp.finalizadoEm)}`
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
          Anexo do ETP — Itens Objeto da Licitação ({etp.categoriaNome})
        </Text>

        <View style={s.tabela}>
          <View style={s.tabelaHeader}>
            <Text style={[s.tabelaCelula, s.colItem]}>Item</Text>
            <Text style={[s.tabelaCelula, s.colQtd]}>Qtd.</Text>
            <Text style={[s.tabelaCelula, s.colValorUnit]}>Valor unitário</Text>
            <Text style={[s.tabelaCelula, s.colValorTotal]}>Valor total</Text>
          </View>
          {etp.itens.map((it, i) => (
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
            <Text style={[s.tabelaCelula, s.colValorTotal]}>{brl(total)}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
