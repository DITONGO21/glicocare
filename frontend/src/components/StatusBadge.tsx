import { cn } from "@/lib/utils";
import type { AlertStatus } from "@/types/api";

export type StatusLevel = "normal" | "warning" | "critical";

const LABELS: Record<StatusLevel, string> = {
  normal: "Normal",
  warning: "Atenção",
  critical: "Crítico",
};

const STYLES: Record<StatusLevel, string> = {
  normal: "bg-status-normal-bg text-status-normal border-status-normal/20",
  warning: "bg-status-warning-bg text-status-warning border-status-warning/20",
  critical: "bg-status-critical-bg text-status-critical border-status-critical/20",
};

interface StatusBadgeProps {
  status: StatusLevel;
  label?: string;
  className?: string;
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        STYLES[status],
        className
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          status === "normal" && "bg-status-normal",
          status === "warning" && "bg-status-warning",
          status === "critical" && "bg-status-critical"
        )}
      />
      {label ?? LABELS[status]}
    </span>
  );
}

export function glucoseStatus(value: number): StatusLevel {
  if (value < 70 || value > 180) return "critical";
  if (value < 80 || value > 140) return "warning";
  return "normal";
}

const ALERT_LABELS: Record<AlertStatus, string> = {
  None: "Normal",
  UnderObservation: "Em observação",
  Resolved: "Resolvido",
  Ignored: "Ignorado",
};

/** Maps the backend-computed AlertStatus to a StatusBadge visual level. */
export function alertStatusLevel(alertStatus: AlertStatus): StatusLevel {
  switch (alertStatus) {
    case "UnderObservation":
      return "critical";
    case "Resolved":
      return "normal";
    case "Ignored":
      return "warning";
    case "None":
    default:
      return "normal";
  }
}

export function alertStatusLabel(alertStatus: AlertStatus): string {
  return ALERT_LABELS[alertStatus];
}
