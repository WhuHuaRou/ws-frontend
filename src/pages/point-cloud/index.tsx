import { useEffect, useMemo, useState } from "react";
import { PointCloudViewer } from "../../components/point-cloud/PointCloudViewer";
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

const pageSize = 10;

export function PointCloudDataPage({ pointClouds }: { pointClouds: PointCloudSummary[] }) {
  const [activeField, setActiveField] = useState<PointField>("x");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(pointClouds[0]?.id ?? "");
  const [page, setPage] = useState(1);
  const activeFieldInfo = fieldDescriptions[activeField];
  const normalizedQuery = query.trim().toLowerCase();
  const filteredPointClouds = useMemo(
    () =>
      normalizedQuery
        ? pointClouds.filter((pointCloud) =>
            [pointCloud.cowNo, pointCloud.pointCloudNo, pointCloud.fileName, pointCloud.filePath]
              .join(" ")
              .toLowerCase()
              .includes(normalizedQuery),
          )
        : pointClouds,
    [normalizedQuery, pointClouds],
  );
  const pageCount = Math.max(1, Math.ceil(filteredPointClouds.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visiblePointClouds = filteredPointClouds.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const selectedPointCloud =
    filteredPointClouds.find((pointCloud) => pointCloud.id === selectedId) ?? filteredPointClouds[0] ?? null;

  useEffect(() => {
    setPage(1);
  }, [normalizedQuery]);

  useEffect(() => {
    if (!filteredPointClouds.length) {
      setSelectedId("");
      return;
    }
    if (!filteredPointClouds.some((pointCloud) => pointCloud.id === selectedId)) {
      setSelectedId(filteredPointClouds[0].id);
    }
  }, [filteredPointClouds, selectedId]);

  return (
    <div className="module-page">
      <section className="panel module-toolbar">
        <div>
          <p className="eyebrow">cow_point_cloud</p>
          <h2>点云查询与三维预览</h2>
        </div>
      </section>

      <div className="point-cloud-workspace">
        <aside className="panel point-cloud-sidebar" aria-label="现有点云">
          <div className="point-cloud-sidebar-title">
            <p className="eyebrow">现有点云</p>
            <h2>点云目录</h2>
          </div>
          <label className="search-field point-cloud-search">
            查询点云
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="牛编号 / 点云号 / 文件名"
            />
          </label>

          <div className="point-cloud-count">
            <strong>{filteredPointClouds.length}</strong>
            <span>个点云</span>
          </div>

          {visiblePointClouds.length > 0 ? (
            <div className="point-cloud-list-items">
              {visiblePointClouds.map((pointCloud) => (
                <button
                  className={
                    selectedPointCloud?.id === pointCloud.id
                      ? "point-cloud-list-item point-cloud-list-item-active"
                      : "point-cloud-list-item"
                  }
                  key={pointCloud.id}
                  onClick={() => setSelectedId(pointCloud.id)}
                  type="button"
                >
                  <strong>{pointCloud.pointCloudNo}</strong>
                  <span>{pointCloud.cowNo}</span>
                  <em>{formatNumber(pointCloud.pointCount)} 点</em>
                </button>
              ))}
            </div>
          ) : (
            <div className="point-cloud-empty">
              <strong>没有匹配结果</strong>
              <span>换一个关键词再查。</span>
            </div>
          )}

          <div className="point-cloud-pagination">
            <button
              className="viewer-reset-button"
              type="button"
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              disabled={currentPage <= 1}
            >
              上一页
            </button>
            <span>
              {currentPage} / {pageCount}
            </span>
            <button
              className="viewer-reset-button"
              type="button"
              onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
              disabled={currentPage >= pageCount}
            >
              下一页
            </button>
          </div>
        </aside>

        {selectedPointCloud ? (
          <article className="panel record-panel point-cloud-panel" key={selectedPointCloud.id}>
            <div className="panel-heading">
              <div>
                <p className="eyebrow">{selectedPointCloud.cowNo}</p>
                <h2>{selectedPointCloud.pointCloudNo}</h2>
              </div>
              <span className="panel-note">{selectedPointCloud.processedAt}</span>
            </div>
            <div className="point-cloud-file">
              <span>
                <small>文件名</small>
                <strong>{selectedPointCloud.fileName}</strong>
              </span>
              <span>
                <small>路径</small>
                <strong>{selectedPointCloud.filePath}</strong>
              </span>
            </div>
            <div className="point-cloud-summary">
              <span>
                <strong>{selectedPointCloud.fileFormat}</strong>
                文件格式
              </span>
              <span>
                <strong>{formatNumber(selectedPointCloud.pointCount)}</strong>
                点数量
              </span>
              <span>
                <strong>{selectedPointCloud.fileSizeMb} MB</strong>
                文件大小
              </span>
            </div>
            <PointCloudViewer pointCloud={selectedPointCloud} />
            <div className="field-schema" aria-label={`${selectedPointCloud.pointCloudNo} 字段结构`}>
              {selectedPointCloud.fieldSchema.map((field) => (
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
            <div className="part-bars" role="img" aria-label={`${selectedPointCloud.pointCloudNo} label 分布`}>
              {selectedPointCloud.labelStats.map((item) => (
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
        ) : (
          <section className="panel state-block">
            <div className="state-glyph" />
            <h2>{filteredPointClouds.length === 0 ? "没有匹配的点云" : "请选择点云"}</h2>
            <p>
              {filteredPointClouds.length === 0
                ? "换一个牛编号、点云号或文件名再查。"
                : "从左侧目录选择一个点云后再加载三维预览。"}
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
