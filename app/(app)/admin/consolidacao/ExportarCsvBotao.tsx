"use client";

function paraCsv(linhas: string[][]): string {
  const escapar = (v: string) => `"${v.replace(/"/g, '""')}"`;
  return linhas.map((linha) => linha.map(escapar).join(";")).join("\n");
}

export default function ExportarCsvBotao({
  nomeArquivo,
  linhas,
}: {
  nomeArquivo: string;
  linhas: string[][];
}) {
  return (
    <button
      onClick={() => {
        const csv = "﻿" + paraCsv(linhas);
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = nomeArquivo;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }}
      className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
    >
      Exportar CSV
    </button>
  );
}
