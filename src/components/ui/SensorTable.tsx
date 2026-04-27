import { statusClassName, statusLabel } from "../../lib/format";
import type { SensorPoint } from "../../types/dashboard";

export function SensorTable({ sensors }: { sensors: SensorPoint[] }) {
  return (
    <section className="panel table-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">采集明细</p>
          <h2>实时传感器数据</h2>
        </div>
        <button className="secondary-button">查看全部</button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>点位</th>
              <th>设备</th>
              <th>指标</th>
              <th>读数</th>
              <th>状态</th>
              <th>采样</th>
            </tr>
          </thead>
          <tbody>
            {sensors.map((sensor) => (
              <tr key={sensor.id}>
                <td>
                  <strong>{sensor.greenhouse}</strong>
                  <span>{sensor.id}</span>
                </td>
                <td>{sensor.device}</td>
                <td>{sensor.metric}</td>
                <td className="number-cell">
                  {sensor.value}
                  <small>{sensor.unit}</small>
                </td>
                <td>
                  <span className={statusClassName(sensor.status)}>{statusLabel(sensor.status)}</span>
                </td>
                <td>{sensor.sampledAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
