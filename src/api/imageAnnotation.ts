import type { AssetStatus, ImageAnnotation } from "../types/dashboard";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";
const IMAGE_PAGE_SIZE = 6;

export interface ImageAnnotationQuery {
  cowNo: string;
  imageType: "" | "EYE_MUSCLE" | "BACKFAT";
  pageNum: number;
}

export interface ImageAnnotationPageResult {
  rows: ImageAnnotation[];
  total: number;
}

export interface ImageAnnotationUploadInput {
  cowNo: string;
  imageType: "眼肌图" | "背膘图";
  file: File;
  measurementValue: string;
  collectedAt: string;
}

interface CowImageRow {
  id?: number | string;
  cowNo?: string;
  imageType?: string;
  imagePath?: string;
  eyeMuscleArea?: number | string | null;
  backfatThickness?: number | string | null;
  unit?: string | null;
  collectedAt?: string | null;
  createTime?: string | null;
}

interface TableDataResponse {
  code?: number;
  msg?: string | null;
  total?: number;
  rows?: CowImageRow[];
}

interface UploadImageResponse {
  code?: number;
  msg?: string | null;
  data?: CowImageRow;
  url?: string;
  originalFilename?: string;
}

interface CowNoOptionsResponse {
  code?: number;
  msg?: string | null;
  data?: string[];
}

export { IMAGE_PAGE_SIZE };

export async function listCowNoOptions(cowNo = ""): Promise<string[]> {
  const params = new URLSearchParams();
  if (cowNo.trim()) {
    params.set("cowNo", cowNo.trim());
  }

  const response = await fetch(`${API_BASE_URL}/cow/image/cowNoOptions?${params.toString()}`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: localStorage.getItem("token") ? `Bearer ${localStorage.getItem("token")}` : "",
    },
  });

  if (!response.ok) {
    throw new Error("牛编号候选接口暂时不可用");
  }

  const result = (await response.json()) as CowNoOptionsResponse;
  if (result.code !== undefined && result.code !== 0) {
    throw new Error(result.msg || "牛编号候选接口返回异常");
  }

  return result.data ?? [];
}

export async function listImageAnnotations(query: ImageAnnotationQuery): Promise<ImageAnnotationPageResult> {
  const params = new URLSearchParams({
    pageNum: String(query.pageNum),
    pageSize: String(IMAGE_PAGE_SIZE),
  });
  if (query.cowNo.trim()) {
    params.set("cowNo", query.cowNo.trim());
  }
  if (query.imageType) {
    params.set("imageType", query.imageType);
  }

  const response = await fetch(`${API_BASE_URL}/cow/image/list?${params.toString()}`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: localStorage.getItem("token") ? `Bearer ${localStorage.getItem("token")}` : "",
    },
  });

  if (!response.ok) {
    throw new Error("图像标注接口暂时不可用");
  }

  const result = (await response.json()) as TableDataResponse;
  if (result.code !== undefined && result.code !== 0) {
    throw new Error(result.msg || "图像标注接口返回异常");
  }

  return {
    rows: (result.rows ?? []).map(mapCowImageRow),
    total: result.total ?? 0,
  };
}

export async function uploadImageAnnotation(input: ImageAnnotationUploadInput): Promise<ImageAnnotation> {
  const formData = new FormData();
  formData.set("file", input.file);
  formData.set("cowNo", input.cowNo.trim());
  formData.set("imageType", input.imageType === "眼肌图" ? "EYE_MUSCLE" : "BACKFAT");
  if (input.measurementValue.trim()) {
    formData.set("measurementValue", input.measurementValue.trim());
  }
  if (input.collectedAt.trim()) {
    formData.set("collectedAt", input.collectedAt.trim());
  }
  formData.set("unit", input.imageType === "眼肌图" ? "cm2" : "mm");

  const response = await fetch(`${API_BASE_URL}/cow/image/upload`, {
    method: "POST",
    headers: {
      Authorization: localStorage.getItem("token") ? `Bearer ${localStorage.getItem("token")}` : "",
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error("图像上传接口暂时不可用");
  }

  const result = (await response.json()) as UploadImageResponse;
  if (result.code !== undefined && result.code !== 0) {
    throw new Error(result.msg || "图像上传接口返回异常");
  }

  return mapCowImageRow({
    ...result.data,
    imagePath: result.data?.imagePath || result.url,
  });
}

function mapCowImageRow(row: CowImageRow): ImageAnnotation {
  const imageType = row.imageType === "BACKFAT" ? "背膘图" : "眼肌图";
  const eyeMuscleAreaCm2 = toNumber(row.eyeMuscleArea);
  const backfatThicknessMm = toNumber(row.backfatThickness);
  const measurement = buildMeasurement(imageType, eyeMuscleAreaCm2, backfatThicknessMm, row.unit);
  const fileName = getFileName(row.imagePath);

  return {
    id: String(row.id ?? row.imagePath ?? `${row.cowNo ?? "IMG"}-${fileName}`),
    cowNo: row.cowNo || "未登记牛号",
    imageType,
    fileName,
    fileUrl: buildFileUrl(row.imagePath),
    measurement,
    eyeMuscleAreaCm2,
    backfatThicknessMm,
    annotatedAt: row.collectedAt || row.createTime || "未记录时间",
    status: getImageStatus(imageType, eyeMuscleAreaCm2, backfatThicknessMm),
  };
}

function buildMeasurement(
  imageType: ImageAnnotation["imageType"],
  eyeMuscleAreaCm2: number | undefined,
  backfatThicknessMm: number | undefined,
  unit?: string | null,
) {
  if (imageType === "眼肌图") {
    return eyeMuscleAreaCm2 ? `眼肌面积 ${eyeMuscleAreaCm2} ${unit || "cm2"}` : "眼肌面积待定";
  }
  return backfatThicknessMm ? `背膘厚度 ${backfatThicknessMm} ${unit || "mm"}` : "背膘厚度待定";
}

function buildFileUrl(path?: string) {
  if (!path) {
    return undefined;
  }
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

function getFileName(path?: string) {
  if (!path) {
    return "未命名图片";
  }
  return path.split(/[\\/]/).pop() || path;
}

function getImageStatus(
  imageType: ImageAnnotation["imageType"],
  eyeMuscleAreaCm2: number | undefined,
  backfatThicknessMm: number | undefined,
): AssetStatus {
  if (imageType === "眼肌图") {
    return eyeMuscleAreaCm2 ? "normal" : "warning";
  }
  return backfatThicknessMm ? "normal" : "warning";
}

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
