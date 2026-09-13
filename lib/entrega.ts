/**
 * Motor de Entrega de Bens (Fase 4), extraído do sistema original: máquina de
 * 4 status e o cálculo da confirmação do demandante (aceite tácito em 10
 * dias / contestação / ratificação pela Administração).
 */

export type SubperfilEntrega = "PATRIMONIO" | "ALMOXARIFADO";

export const SUBPERFIL_ENTREGA_LABEL: Record<SubperfilEntrega, string> = {
  PATRIMONIO: "Unidade de Patrimônio",
  ALMOXARIFADO: "Unidade de Almoxarifado",
};

/** Permanente -> Patrimônio; Consumo -> Almoxarifado (roteamento automático, sem exceção). */
export function subperfilBensPorTipo(tipoBem: "CONSUMO" | "PERMANENTE" | null | undefined): SubperfilEntrega {
  return tipoBem === "CONSUMO" ? "ALMOXARIFADO" : "PATRIMONIO";
}

export type StatusEntregaValor = "EM_ESTOQUE" | "AUTORIZADO_PROAD" | "ENTREGA_ANDAMENTO" | "ENTREGUE";

export interface StatusEntregaInfo {
  value: StatusEntregaValor;
  label: string;
  proximos: StatusEntregaValor[];
}

export const STATUS_ENTREGA_OPCOES: StatusEntregaInfo[] = [
  { value: "EM_ESTOQUE", label: "Material em Estoque e Pronto para Distribuição", proximos: ["AUTORIZADO_PROAD"] },
  { value: "AUTORIZADO_PROAD", label: "Autorizado pela PROAD para Entrega, em Separação", proximos: ["ENTREGA_ANDAMENTO"] },
  { value: "ENTREGA_ANDAMENTO", label: "Entrega em Andamento", proximos: ["ENTREGUE"] },
  { value: "ENTREGUE", label: "Material Entregue ao Destinatário", proximos: [] },
];

export function statusEntregaInfo(value: StatusEntregaValor): StatusEntregaInfo | undefined {
  return STATUS_ENTREGA_OPCOES.find((s) => s.value === value);
}

export function statusEntregaLabel(value: StatusEntregaValor | null): string {
  if (!value) return "—";
  return statusEntregaInfo(value)?.label ?? "—";
}

export function proximosStatusEntrega(statusAtual: StatusEntregaValor | null): StatusEntregaInfo[] {
  if (!statusAtual) return [STATUS_ENTREGA_OPCOES[0]];
  const info = statusEntregaInfo(statusAtual);
  if (!info || info.proximos.length === 0) return [];
  return STATUS_ENTREGA_OPCOES.filter((o) => info.proximos.includes(o.value));
}

export type StatusConfirmacaoEntrega =
  | "PENDENTE"
  | "CONFIRMADO"
  | "CONTESTACAO_PENDENTE_ENTREGA"
  | "CONTESTACAO_PENDENTE_ADMIN"
  | "CONTESTACAO_RATIFICADA"
  | "CONTESTACAO_REJEITADA";

/** "auto_confirmado" nunca é gravado — é sempre calculado a partir do prazo, igual ao sistema original. */
export type StatusConfirmacaoEfetivo = StatusConfirmacaoEntrega | "AUTO_CONFIRMADO";

export function confirmacaoEfetiva(
  status: StatusConfirmacaoEntrega,
  dataLimite: Date,
): StatusConfirmacaoEfetivo {
  if (status === "PENDENTE" && new Date() > dataLimite) return "AUTO_CONFIRMADO";
  return status;
}
