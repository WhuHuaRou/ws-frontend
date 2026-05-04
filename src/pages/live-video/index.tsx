import { statusClassName, statusLabel } from "../../lib/format";
import type { VideoStream } from "../../types/dashboard";

export function LiveVideoPage({ streams }: { streams: VideoStream[] }) {
  return (
    <div className="module-page">
      <section className="panel module-toolbar">
        <div>
          <p className="eyebrow">video_stream_access</p>
          <h2>实时视频访问</h2>
        </div>
        <button className="secondary-button">刷新播放地址</button>
      </section>

      {streams.length > 0 ? (
        <div className="record-grid">
          {streams.map((stream) => (
            <article className="panel video-record" key={stream.id}>
              <div className="stream-preview large">
                <span className="stream-line" />
                <span className="stream-line short" />
              </div>
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">{stream.cowNo}</p>
                  <h2>{stream.cameraName}</h2>
                </div>
                <span className={statusClassName(stream.status)}>{statusLabel(stream.status)}</span>
              </div>
              <div className="record-meta">
                <span>栏位：{stream.pen}</span>
                <span>播放：{stream.playUrl}</span>
                <span>数据集：{stream.datasetUrl}</span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <section className="panel state-block compact-empty-state">
          <div className="state-glyph" />
          <h2>暂无实时视频</h2>
          <p>没有查询到视频流记录。</p>
        </section>
      )}
    </div>
  );
}
