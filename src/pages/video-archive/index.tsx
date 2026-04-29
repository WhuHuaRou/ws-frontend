import { statusClassName, statusLabel } from "../../lib/format";
import type { ArchiveSegment } from "../../types/dashboard";

export function VideoArchivePage({ archives }: { archives: ArchiveSegment[] }) {
  return (
    <div className="module-page">
      <section className="panel module-toolbar">
        <div>
          <p className="eyebrow">video_archive_segment</p>
          <h2>视频备份分段</h2>
        </div>
        <button className="secondary-button">生成备份</button>
      </section>

      <section className="panel table-panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>分段编号</th>
                <th>牛编号</th>
                <th>摄像头</th>
                <th>开始时间</th>
                <th>结束时间</th>
                <th>大小</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              {archives.map((archive) => (
                <tr key={archive.id}>
                  <td>
                    <strong>{archive.id}</strong>
                  </td>
                  <td>{archive.cowNo}</td>
                  <td>{archive.cameraName}</td>
                  <td>{archive.startTime}</td>
                  <td>{archive.endTime}</td>
                  <td>{archive.fileSizeGb} GB</td>
                  <td>
                    <span className={statusClassName(archive.archiveStatus)}>{statusLabel(archive.archiveStatus)}</span>
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
