import { type FormEvent, useEffect, useState } from "react";
import { IMAGE_PAGE_SIZE, listImageAnnotations } from "../../api/imageAnnotation";
import { statusClassName, statusLabel } from "../../lib/format";
import type { ImageAnnotation } from "../../types/dashboard";

type ImageTypeQuery = "" | "EYE_MUSCLE" | "BACKFAT";

interface ImageQueryState {
  cowNo: string;
  imageType: ImageTypeQuery;
}

export function ImageAnnotationPage({ refreshSignal = 0 }: { refreshSignal?: number }) {
  const [query, setQuery] = useState<ImageQueryState>({ cowNo: "", imageType: "" });
  const [draftQuery, setDraftQuery] = useState<ImageQueryState>(query);
  const [page, setPage] = useState(1);
  const [remoteImages, setRemoteImages] = useState<ImageAnnotation[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const pageCount = Math.max(1, Math.ceil(total / IMAGE_PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    listImageAnnotations({ ...query, pageNum: page })
      .then((result) => {
        if (isMounted) {
          setRemoteImages(result.rows);
          setTotal(result.total);
          setError("");
        }
      })
      .catch((requestError: Error) => {
        if (isMounted) {
          setRemoteImages([]);
          setTotal(0);
          setError(requestError.message);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [page, query, refreshSignal]);

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
    setPage(1);
    setQuery(draftQuery);
  };

  const handleReset = () => {
    const nextQuery: ImageQueryState = { cowNo: "", imageType: "" };
    setDraftQuery(nextQuery);
    setQuery(nextQuery);
    setPage(1);
  };

  return (
    <div className="module-page">
      <section className="panel module-toolbar">
        <div>
          <p className="eyebrow">cow_image</p>
          <h2>眼肌与背膘展示</h2>
        </div>
        <form className="image-query-form" onSubmit={handleSearch}>
          <label className="search-field">
            牛编号
            <input
              type="search"
              value={draftQuery.cowNo}
              onChange={(event) => setDraftQuery({ ...draftQuery, cowNo: event.target.value })}
              placeholder="输入牛编号"
            />
          </label>
          <label className="search-field">
            图像类型
            <select
              value={draftQuery.imageType}
              onChange={(event) => setDraftQuery({ ...draftQuery, imageType: event.target.value as ImageTypeQuery })}
            >
              <option value="">全部</option>
              <option value="EYE_MUSCLE">眼肌图</option>
              <option value="BACKFAT">背膘图</option>
            </select>
          </label>
          <div className="image-query-actions">
            <button className="secondary-button" type="button" onClick={handleReset}>
              重置
            </button>
            <button className="primary-button" type="submit">
              查询
            </button>
          </div>
        </form>
      </section>

      {error ? (
        <div className="image-inline-warning">
          <strong>图像接口未返回数据</strong>
          <span>{error}</span>
        </div>
      ) : null}

      {isLoading ? <ImageGridSkeleton /> : null}

      {!isLoading && remoteImages.length > 0 ? (
        <div className="image-record-grid">
          {remoteImages.map((image) => (
            <article className="panel image-record" key={image.id}>
              <ImagePreview image={image} />
              <div>
                <p className="eyebrow">{image.cowNo}</p>
                <h2>{image.imageType}</h2>
              </div>
              <AnnotationMetric image={image} />
              <p className="annotation-summary">{image.measurement}</p>
              <span>{image.fileName}</span>
              <div className="record-footer">
                <span>{image.annotatedAt}</span>
                <span className={statusClassName(image.status)}>{statusLabel(image.status)}</span>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {!isLoading && remoteImages.length === 0 ? (
        <section className="panel state-block image-empty-state">
          <div className="state-glyph" />
          <h2>暂无图像数据</h2>
          <p>没有查询到图像标注记录。</p>
        </section>
      ) : null}

      <div className="image-pagination">
        <span>
          共 {total} 条，每页 {IMAGE_PAGE_SIZE} 张
        </span>
        <div>
          <button
            className="viewer-reset-button"
            type="button"
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            disabled={currentPage <= 1 || isLoading}
          >
            上一页
          </button>
          <strong>
            {currentPage} / {pageCount}
          </strong>
          <button
            className="viewer-reset-button"
            type="button"
            onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
            disabled={currentPage >= pageCount || isLoading}
          >
            下一页
          </button>
        </div>
      </div>
    </div>
  );
}

function ImagePreview({ image }: { image: ImageAnnotation }) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [image.fileUrl]);

  if (!image.fileUrl || hasError) {
    return (
      <div className="image-preview image-preview-missing">
        <strong>{hasError ? "图片加载失败" : "未返回图片地址"}</strong>
        <span>{image.fileUrl || image.fileName}</span>
      </div>
    );
  }

  return (
    <div className="image-preview">
      <img
        src={image.fileUrl}
        alt={`${image.cowNo} ${image.imageType}`}
        loading="lazy"
        onError={() => setHasError(true)}
      />
    </div>
  );
}

function AnnotationMetric({ image }: { image: ImageAnnotation }) {
  if (image.imageType === "眼肌图") {
    return (
      <div className="annotation-metrics" aria-label={`${image.cowNo} 眼肌指标`}>
        <span>
          <small>眼肌面积</small>
          <strong>{image.eyeMuscleAreaCm2 ? `${image.eyeMuscleAreaCm2} cm2` : "待定"}</strong>
        </span>
      </div>
    );
  }

  return (
    <div className="annotation-metrics" aria-label={`${image.cowNo} 背膘指标`}>
      <span>
        <small>背膘厚度</small>
        <strong>{image.backfatThicknessMm ? `${image.backfatThicknessMm} mm` : "待定"}</strong>
      </span>
    </div>
  );
}

function ImageGridSkeleton() {
  return (
    <div className="image-record-grid" aria-label="图像加载中">
      {Array.from({ length: IMAGE_PAGE_SIZE }).map((_, index) => (
        <article className="panel image-record image-record-skeleton" key={index}>
          <div className="skeleton image-preview" />
          <div className="skeleton image-line-skeleton" />
          <div className="skeleton image-metric-skeleton" />
          <div className="skeleton image-line-skeleton short" />
        </article>
      ))}
    </div>
  );
}
