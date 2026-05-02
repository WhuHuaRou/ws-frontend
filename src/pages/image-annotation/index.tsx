import { statusClassName, statusLabel } from "../../lib/format";
import type { ImageAnnotation } from "../../types/dashboard";

export function ImageAnnotationPage({ images }: { images: ImageAnnotation[] }) {
  return (
    <div className="module-page">
      <section className="panel module-toolbar">
        <div>
          <p className="eyebrow">cow_image</p>
          <h2>眼肌与背膘展示</h2>
        </div>
      </section>

      <div className="image-record-grid">
        {images.map((image) => (
          <article className="panel image-record" key={image.id}>
            <div className="image-preview">
              {image.fileUrl ? (
                <img src={image.fileUrl} alt={`${image.cowNo} ${image.imageType}`} loading="lazy" />
              ) : (
                <div className="image-thumb" aria-hidden="true" />
              )}
            </div>
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
    </div>
  );
}

function AnnotationMetric({ image }: { image: ImageAnnotation }) {
  if (image.imageType === "眼肌图") {
    return (
      <div className="annotation-metrics" aria-label={`${image.cowNo} 眼肌指标`}>
        <span>
          <small>眼肌面积</small>
          <strong>{image.eyeMuscleAreaCm2 ? `${image.eyeMuscleAreaCm2} cm2` : "待复核"}</strong>
        </span>
      </div>
    );
  }

  return (
    <div className="annotation-metrics" aria-label={`${image.cowNo} 背膘指标`}>
      <span>
        <small>背膘厚度</small>
        <strong>{image.backfatThicknessMm ? `${image.backfatThicknessMm} mm` : "待复核"}</strong>
      </span>
    </div>
  );
}
