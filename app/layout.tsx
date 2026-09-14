import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sistema PCA UERN",
  description: "Coleta, gestão e acompanhamento de demandas de bens e serviços da UERN — Pró-Reitoria de Administração (PROAD/UERN)",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 font-sans">{children}</body>
    </html>
  );
}
