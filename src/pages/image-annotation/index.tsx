import { statusClassName, statusLabel } from "../../lib/format";
import type { ImageAnnotation } from "../../types/dashboard";

export function ImageAnnotationPage({ images }: { images: ImageAnnotation[] }) {
  return (
    <div className="module-page">
      <section className="panel module-toolbar">
        <div>
          <p className="eyebrow">cow_image</p>
          <h2>图片与标注结果</h2>
        </div>
        <button className="secondary-button">上传图片</button>
      </section>

      <div className="image-record-grid">
        {images.map((image) => (
          <article className="panel image-record" key={image.id}>
            <div className="image-thumb" aria-hidden="true" />
            <div>
              <p className="eyebrow">{image.cowNo}</p>
              <h2>{image.imageType}</h2>
            </div>
            <strong>{image.measurement}</strong>
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
