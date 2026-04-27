import type { SensorPoint } from "../types/dashboard";

export function statusLabel(status: SensorPoint["status"]) {
  const labels: Record<SensorPoint["status"], string> = {
    normal: "正常",
    warning: "预警",
    offline: "离线",
  };

  return labels[status];
}

export function statusClassName(status: SensorPoint["status"]) {
  return `status status-${status}`;
}
