import type { AssetStatus } from "../types/dashboard";

export function statusLabel(status: AssetStatus) {
  const labels: Record<AssetStatus, string> = {
    normal: "可用",
    warning: "待核验",
    offline: "离线",
  };

  return labels[status];
}

export function statusClassName(status: AssetStatus) {
  return `status status-${status}`;
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value);
}
