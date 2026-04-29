import { useState } from "react";
import { formatNumber } from "../../lib/format";
import type { PointCloudSummary } from "../../types/dashboard";

type PointField = PointCloudSummary["fieldSchema"][number];

const fieldDescriptions: Record<PointField, { name: string; detail: string }> = {
  x: { name: "X 坐标", detail: "点在三维空间中的横向位置，用于还原点云几何形态。" },
  y: { name: "Y 坐标", detail: "点在三维空间中的纵向位置，与 x、z 一起组成空间坐标。" },
  z: { name: "Z 坐标", detail: "点在三维空间中的高度或深度位置，用于体尺和轮廓分析。" },
  r: { name: "R 颜色通道", detail: "RGB 颜色中的红色通道值，用于保留点云表面颜色。" },
  g: { name: "G 颜色通道", detail: "RGB 颜色中的绿色通道值，用于保留点云表面颜色。" },
  b: { name: "B 颜色通道", detail: "RGB 颜色中的蓝色通道值，用于保留点云表面颜色。" },
  label: { name: "Label 标签", detail: "点所属的分类标签，可映射到背部、腹部、腿部等业务含义。" },
};

export function PointCloudDataPage({ pointClouds }: { pointClouds: PointCloudSummary[] }) {
  const [activeField, setActiveField] = useState<PointField>("x");
  const activeFieldInfo = fieldDescriptions[activeField];

  return (
    <div className="module-page">
      <section className="panel module-toolbar">
        <div>
          <p className="eyebrow">cow_point_cloud</p>
          <h2>点云文件与字段结构</h2>
        </div>
        <button className="secondary-button">导入点云</button>
      </section>

      <div className="record-grid">
        {pointClouds.map((pointCloud) => (
          <article className="panel record-panel" key={pointCloud.id}>
            <div className="panel-heading">
              <div>
                <p className="eyebrow">{pointCloud.cowNo}</p>
                <h2>{pointCloud.pointCloudNo}</h2>
              </div>
              <span className="panel-note">{pointCloud.processedAt}</span>
            </div>
            <div className="point-cloud-file">
              <span>
                <small>文件名</small>
                <strong>{pointCloud.fileName}</strong>
              </span>
              <span>
                <small>路径</small>
                <strong>{pointCloud.filePath}</strong>
              </span>
            </div>
            <div className="point-cloud-summary">
              <span>
                <strong>{pointCloud.fileFormat}</strong>
                文件格式
              </span>
              <span>
                <strong>{formatNumber(pointCloud.pointCount)}</strong>
                点数量
              </span>
              <span>
                <strong>{pointCloud.fileSizeMb} MB</strong>
                文件大小
              </span>
            </div>
            <div className="field-schema" aria-label={`${pointCloud.pointCloudNo} 字段结构`}>
              {pointCloud.fieldSchema.map((field) => (
                <button
                  className={activeField === field ? "field-chip field-chip-active" : "field-chip"}
                  key={field}
                  onClick={() => setActiveField(field)}
                >
                  {field}
                </button>
              ))}
            </div>
            <div className="field-detail">
              <strong>{activeFieldInfo.name}</strong>
              <span>{activeFieldInfo.detail}</span>
            </div>
            <div className="part-bars" role="img" aria-label={`${pointCloud.pointCloudNo} label 分布`}>
              {pointCloud.labelStats.map((item) => (
                <div className="part-row" key={item.label}>
                  <span>{item.label}</span>
                  <div className="part-track">
                    <span style={{ width: `${item.ratio}%` }} />
                  </div>
                  <strong>{item.ratio}%</strong>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
