import type { DashboardMetric } from "../../types/dashboard";

export function MetricTile({ metric }: { metric: DashboardMetric }) {
  return (
    <section className={`metric-tile metric-${metric.tone}`}>
      <span className="metric-label">{metric.label}</span>
      <div className="metric-value">
        {metric.value}
        {metric.unit ? <small>{metric.unit}</small> : null}
      </div>
      <span className="metric-delta">{metric.delta}</span>
    </section>
  );
}
