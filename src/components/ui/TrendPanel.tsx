import type { TrendPoint } from "../../types/dashboard";

export function TrendPanel({ trends }: { trends: TrendPoint[] }) {
  const maxTemperature = Math.max(...trends.map((item) => item.temperature));
  const maxHumidity = Math.max(...trends.map((item) => item.humidity));

  return (
    <section className="panel trend-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">环境曲线</p>
          <h2>今日温湿度走势</h2>
        </div>
        <span className="panel-note">每 2 小时采样</span>
      </div>
      <div className="trend-bars" role="img" aria-label="今日温度与湿度趋势">
        {trends.map((point) => (
          <div className="trend-column" key={point.label}>
            <div className="bar-pair">
              <span
                className="bar bar-temperature"
                style={{ height: `${(point.temperature / maxTemperature) * 100}%` }}
              />
              <span className="bar bar-humidity" style={{ height: `${(point.humidity / maxHumidity) * 100}%` }} />
            </div>
            <span>{point.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
