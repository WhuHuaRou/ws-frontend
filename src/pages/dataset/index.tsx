import { statusClassName, statusLabel } from "../../lib/format";
import type { DatasetSummary } from "../../types/dashboard";

export function DatasetPage({ datasets }: { datasets: DatasetSummary[] }) {
  return (
    <div className="module-page">
      <section className="panel module-toolbar">
        <div>
          <p className="eyebrow">cow_dataset</p>
          <h2>牛只数据集</h2>
        </div>
      </section>

      <section className="panel table-panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>数据集编号</th>
                <th>牛编号</th>
                <th>文件数</th>
                <th>访问地址</th>
                <th>采集时间</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              {datasets.map((dataset) => (
                <tr key={dataset.id}>
                  <td>
                    <strong>{dataset.datasetCode}</strong>
                    <span>{dataset.id}</span>
                  </td>
                  <td>{dataset.cowNo}</td>
                  <td>{dataset.fileCount}</td>
                  <td>{dataset.datasetUrl}</td>
                  <td>{dataset.collectedAt}</td>
                  <td>
                    <span className={statusClassName(dataset.status)}>{statusLabel(dataset.status)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
