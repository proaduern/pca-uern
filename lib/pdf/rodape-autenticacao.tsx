import React from "react";
import { View, Text, Link, StyleSheet } from "@react-pdf/renderer";
import type { DadosAutenticacaoPdf } from "./autenticacao";

const styles = StyleSheet.create({
  footerContainer: {
    position: "absolute",
    bottom: 14,
    left: 28,
    right: 28,
    borderTopWidth: 0.75,
    borderTopColor: "#94a3b8",
    backgroundColor: "#f8fafc",
    paddingVertical: 4,
    paddingHorizontal: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  leftCol: {
    flex: 1,
    paddingRight: 8,
  },
  titleLine: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    marginBottom: 1,
  },
  verifyLine: {
    fontSize: 6.3,
    fontFamily: "Helvetica",
    color: "#334155",
  },
  link: {
    fontSize: 6.3,
    fontFamily: "Helvetica-Bold",
    color: "#1d4ed8",
    textDecoration: "underline",
  },
  codeHighlight: {
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
  },
  rightCol: {
    alignItems: "flex-end",
    justifyContent: "center",
  },
  pageText: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    color: "#334155",
  },
  hashText: {
    fontSize: 5.8,
    fontFamily: "Helvetica",
    color: "#64748b",
  },
});

export function RodapeAutenticacaoPdf({
  autenticacao,
  mostrarPaginacao = true,
}: {
  autenticacao?: DadosAutenticacaoPdf;
  mostrarPaginacao?: boolean;
}) {
  if (!autenticacao) return null;

  const hashCurto = `${autenticacao.hashSha256.slice(0, 12)}...${autenticacao.hashSha256.slice(-8)}`;

  return (
    <View style={styles.footerContainer} fixed>
      <View style={styles.leftCol}>
        <Text style={styles.titleLine}>
          DOCUMENTO AUTENTICADO DIGITALMENTE — SISTEMA PCA UERN / PROAD
        </Text>
        <Text style={styles.verifyLine}>
          Confira a autenticidade deste documento público em:{" "}
          <Link src={autenticacao.urlVerificacao} style={styles.link}>
            {autenticacao.urlVerificacao}
          </Link>{" "}
          (Código Verificador:{" "}
          <Text style={styles.codeHighlight}>{autenticacao.codigoVerificador}</Text>)
        </Text>
      </View>
      <View style={styles.rightCol}>
        {mostrarPaginacao && (
          <Text
            style={styles.pageText}
            render={({ pageNumber, totalPages }) => `Pág. ${pageNumber} de ${totalPages}`}
          />
        )}
        <Text style={styles.hashText}>SHA-256: {hashCurto}</Text>
      </View>
    </View>
  );
}
