import React from "react";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { formatarDataHora } from "../formato";
import {
  FASE_RISCO_LABEL,
  IMPACTO_RISCO_LABEL,
  NIVEL_ACEITACAO_RISCO_LABEL,
  PROBABILIDADE_RISCO_LABEL,
} from "../etp-riscos";
import type { AnaliseRiscosParaPdf } from "./riscos-dados";
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
  secaoTitulo: { fontSize: 10, fontWeight: "bold", color: "#1e3a8a", marginTop: 10, marginBottom: 4 },
  cartao: {
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 3,
    padding: 6,
    backgroundColor: "#ffffff",
  },
  cartaoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#f1f5f9",
    padding: 3,
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
    marginBottom: 4,
  },
  cartaoTitulo: { fontSize: 8.5, fontWeight: "bold", color: "#1e3a8a" },
  cartaoBadge: { fontSize: 8, fontWeight: "bold" },
  linha: { fontSize: 8, marginBottom: 2, lineHeight: 1.3 },
  label: { fontWeight: "bold", color: "#334155" },
  linhaTrio: { flexDirection: "row", marginBottom: 3 },
  trioItem: { flex: 1, fontSize: 8 },
  rodape: { marginTop: 20, textAlign: "center", fontSize: 7.5, color: "#64748b" },
});

export function RiscosDocumento({
  riscos,
  autenticacao,
}: {
  riscos: AnaliseRiscosParaPdf;
  autenticacao?: DadosAutenticacaoPdf;
}) {
  return (
    <Document>
      <Page size="A4" style={s.page} wrap>
        <CabecalhoInstitucionalPdf
          tituloDocumento="MAPA DE GERENCIAMENTO DE RISCOS"
          processoSEI={riscos.processoSEI}
          categoriaNome={riscos.categoriaNome}
          numeroSequencial={riscos.sequencialTexto}
        />

        <Text style={{ fontSize: 8, color: "#475569", marginBottom: 8, textAlign: "justify" }}>
          Matriz de riscos estruturada conforme os parâmetros da Lei nº 14.133/2021 e modelo oficial UERN
          (Processo SEI nº 04410277.001088/2025-87 / Doc. SEI 38206661), com identificação de probabilidade,
          impacto, ações preventivas e contingenciais.
        </Text>

        {riscos.itens.map((it, i) => (
          <View key={i} style={s.cartao} wrap={false}>
            <View style={s.cartaoHeader}>
              <Text style={s.cartaoTitulo}>
                RISCO Nº {(i + 1).toString().padStart(2, "0")} — {FASE_RISCO_LABEL[it.fase].toUpperCase()}
              </Text>
              <Text style={s.cartaoBadge}>
                {NIVEL_ACEITACAO_RISCO_LABEL[it.nivelAceitacao]}
              </Text>
            </View>

            <View style={s.linhaTrio}>
              <Text style={s.trioItem}>
                <Text style={s.label}>Probabilidade: </Text>
                {PROBABILIDADE_RISCO_LABEL[it.probabilidade]}
              </Text>
              <Text style={s.trioItem}>
                <Text style={s.label}>Impacto: </Text>
                {IMPACTO_RISCO_LABEL[it.impacto]}
              </Text>
              <Text style={s.trioItem}>
                <Text style={s.label}>Responsável: </Text>
                {it.responsavel}
              </Text>
            </View>

            <Text style={s.linha}>
              <Text style={s.label}>Descrição do evento de risco: </Text>
              {it.descricao}
            </Text>
            <Text style={s.linha}>
              <Text style={s.label}>Danos e consequências: </Text>
              {it.danos}
            </Text>
            <Text style={s.linha}>
              <Text style={s.label}>Ação preventiva: </Text>
              {it.acoesPreventivas}
            </Text>
            <Text style={s.linha}>
              <Text style={s.label}>Ação contingencial: </Text>
              {it.acoesContingenciais}
            </Text>
          </View>
        ))}

        <View style={s.rodape}>
          <Text>Documento elaborado eletronicamente pelo Sistema de Planejamento de Contratações (PCA-UERN)</Text>
          <Text>
            {riscos.responsavelNome ?? "—"}
            {riscos.responsavelMatricula ? ` — Matrícula ${riscos.responsavelMatricula}` : ""}
          </Text>
          <Text>
            {riscos.status === "FINALIZADO" && riscos.finalizadoEm
              ? `Finalizado em: ${formatarDataHora(riscos.finalizadoEm)}`
              : "RASCUNHO — em elaboração"}
          </Text>
        </View>

        <RodapeAutenticacaoPdf autenticacao={autenticacao} />
      </Page>
    </Document>
  );
}
