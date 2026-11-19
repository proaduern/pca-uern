import React from "react";
import { View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { obterBrasaoUernDataUrl } from "./brasao-data-url";

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1E3A8A",
    paddingBottom: 8,
  },
  brasao: {
    width: 38,
    height: 58,
    marginBottom: 4,
  },
  linhaEstado: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#1E293B",
    textAlign: "center",
    textTransform: "uppercase",
  },
  linhaUniversidade: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#1E3A8A",
    textAlign: "center",
    textTransform: "uppercase",
    marginTop: 1,
  },
  linhaProad: {
    fontSize: 7.5,
    color: "#475569",
    textAlign: "center",
    textTransform: "uppercase",
    marginTop: 1,
  },
  linhaDlc: {
    fontSize: 7,
    color: "#64748B",
    textAlign: "center",
    textTransform: "uppercase",
    marginTop: 1,
  },
  tituloBox: {
    marginTop: 6,
    paddingVertical: 3,
    paddingHorizontal: 8,
    backgroundColor: "#1E3A8A",
    borderRadius: 2,
    alignSelf: "stretch",
  },
  tituloTexto: {
    color: "#FFFFFF",
    fontSize: 9.5,
    fontWeight: "bold",
    textAlign: "center",
    textTransform: "uppercase",
  },
  processoSubBox: {
    marginTop: 4,
    flexDirection: "row",
    justifyContent: "space-between",
    alignSelf: "stretch",
  },
  processoTexto: {
    fontSize: 7.5,
    color: "#334155",
    fontWeight: "bold",
  },
});

export interface CabecalhoInstitucionalPdfProps {
  tituloDocumento: string;
  processoSEI: string;
  categoriaNome?: string;
  numeroSequencial?: string;
}

export function CabecalhoInstitucionalPdf({
  tituloDocumento,
  processoSEI,
  categoriaNome,
  numeroSequencial,
}: CabecalhoInstitucionalPdfProps) {
  const brasaoSrc = obterBrasaoUernDataUrl();

  return (
    <View style={styles.container}>
      {brasaoSrc ? <Image src={brasaoSrc} style={styles.brasao} /> : null}
      <Text style={styles.linhaEstado}>Estado do Rio Grande do Norte</Text>
      <Text style={styles.linhaUniversidade}>Universidade do Estado do Rio Grande do Norte — UERN</Text>
      <Text style={styles.linhaProad}>Pró-Reitoria de Administração — PROAD</Text>
      <Text style={styles.linhaDlc}>Diretoria de Licitações e Contratos — DLC</Text>

      <View style={styles.tituloBox}>
        <Text style={styles.tituloTexto}>
          {numeroSequencial ? `${tituloDocumento} Nº ${numeroSequencial}` : tituloDocumento}
        </Text>
      </View>

      <View style={styles.processoSubBox}>
        <Text style={styles.processoTexto}>PROCESSO SEI: {processoSEI}</Text>
        {categoriaNome && (
          <Text style={styles.processoTexto}>CATEGORIA: {categoriaNome.toUpperCase()}</Text>
        )}
      </View>
    </View>
  );
}
