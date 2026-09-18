import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { formatarDataHora } from "../formato";
import {
  FASE_RISCO_LABEL,
  IMPACTO_RISCO_LABEL,
  NIVEL_ACEITACAO_RISCO_LABEL,
  PROBABILIDADE_RISCO_LABEL,
} from "../etp-riscos";
import type { AnaliseRiscosParaPdf } from "./riscos-dados";

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#1e293b" },
  cabecalho: { fontSize: 9, textAlign: "center", marginBottom: 2 },
  titulo: { fontSize: 12, fontWeight: 700, textAlign: "center", marginTop: 8, marginBottom: 16 },
  rodape: { marginTop: 24, textAlign: "center" },
  nota: { fontSize: 8, fontStyle: "italic", color: "#475569", marginTop: 4 },
  cartao: { marginBottom: 10, borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 4, padding: 8 },
  cartaoTitulo: { fontSize: 9, fontWeight: 700, marginBottom: 4 },
  linha: { fontSize: 9, marginBottom: 2, lineHeight: 1.4 },
  label: { fontWeight: 700 },
  linhaTrio: { flexDirection: "row", marginBottom: 2 },
  trioItem: { flex: 1, fontSize: 9 },
});

export function RiscosDocumento({ riscos }: { riscos: AnaliseRiscosParaPdf }) {
  return (
    <Document>
      <Page size="A4" style={s.page} wrap>
        <Text style={s.cabecalho}>UNIVERSIDADE DO ESTADO DO RIO GRANDE DO NORTE</Text>
        <Text style={s.cabecalho}>Processo nº {riscos.processoSEI}</Text>
        <Text style={s.titulo}>MAPA DE RISCOS DA CONTRATAÇÃO — {riscos.categoriaNome}</Text>

        {riscos.itens.map((it, i) => (
          <View key={i} style={s.cartao} wrap={false}>
            <Text style={s.cartaoTitulo}>Risco nº {i + 1}</Text>
            <View style={s.linhaTrio}>
              <Text style={s.trioItem}>
                <Text style={s.label}>Fase: </Text>
                {FASE_RISCO_LABEL[it.fase]}
              </Text>
              <Text style={s.trioItem}>
                <Text style={s.label}>Probabilidade: </Text>
                {PROBABILIDADE_RISCO_LABEL[it.probabilidade]}
              </Text>
              <Text style={s.trioItem}>
                <Text style={s.label}>Impacto: </Text>
                {IMPACTO_RISCO_LABEL[it.impacto]}
              </Text>
            </View>
            <Text style={s.linha}>
              <Text style={s.label}>Descrição do risco: </Text>
              {it.descricao}
            </Text>
            <Text style={s.linha}>
              <Text style={s.label}>Danos: </Text>
              {it.danos}
            </Text>
            <Text style={s.linha}>
              <Text style={s.label}>Nível de aceitação: </Text>
              {NIVEL_ACEITACAO_RISCO_LABEL[it.nivelAceitacao]}
            </Text>
            <Text style={s.linha}>
              <Text style={s.label}>Ações preventivas: </Text>
              {it.acoesPreventivas}
            </Text>
            <Text style={s.linha}>
              <Text style={s.label}>Ações contingenciais: </Text>
              {it.acoesContingenciais}
            </Text>
            <Text style={s.linha}>
              <Text style={s.label}>Responsável: </Text>
              {it.responsavel}
            </Text>
          </View>
        ))}

        <View style={s.rodape}>
          <Text>Documento elaborado eletronicamente pelo sistema PCA-UERN</Text>
          <Text>
            {riscos.responsavelNome ?? "—"}
            {riscos.responsavelMatricula ? ` — Matrícula ${riscos.responsavelMatricula}` : ""}
          </Text>
          <Text>
            {riscos.status === "FINALIZADO" && riscos.finalizadoEm
              ? `Finalizado em: ${formatarDataHora(riscos.finalizadoEm)}`
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
