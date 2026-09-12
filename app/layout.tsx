import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sistema de Coleta de Demandas — UERN",
  description: "Plano de Contratações Anual (PCA) — Pró-Reitoria de Administração (PROAD/UERN)",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 font-sans">{children}</body>
    </html>
  );
}
