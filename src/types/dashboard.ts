export type MetricTone = "green" | "blue" | "amber" | "rose";

export interface DashboardMetric {
  id: string;
  label: string;
  value: string;
  unit?: string;
  delta: string;
  tone: MetricTone;
}

export interface SensorPoint {
  id: string;
  greenhouse: string;
  device: string;
  metric: "温度" | "湿度" | "光照" | "CO2" | "土壤水分";
  value: number;
  unit: string;
  status: "normal" | "warning" | "offline";
  sampledAt: string;
}

export interface TrendPoint {
  label: string;
  temperature: number;
  humidity: number;
}

export interface TaskSummary {
  id: string;
  title: string;
  owner: string;
  progress: number;
  dueAt: string;
}

export interface DashboardData {
  metrics: DashboardMetric[];
  sensors: SensorPoint[];
  trends: TrendPoint[];
  tasks: TaskSummary[];
}
