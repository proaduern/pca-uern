type ValorMonetario = number | string | { toString(): string } | null | undefined;

export function brl(valor: ValorMonetario): string {
  const n = Number(valor?.toString() ?? 0);
  return "R$ " + n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatarData(data: Date | string | null | undefined): string {
  if (!data) return "—";
  const d = typeof data === "string" ? new Date(data) : data;
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(d);
}

export function formatarDataHora(data: Date | string | null | undefined): string {
  if (!data) return "—";
  const d = typeof data === "string" ? new Date(data) : data;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}
