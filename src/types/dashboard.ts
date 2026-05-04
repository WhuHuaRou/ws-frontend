export type AssetStatus = "normal" | "warning" | "offline";

export interface CowBasic {
  id?: string;
  cowNo: string;
  cowName?: string;
  breed?: string;
  gender: string;
  genderCode?: string;
  birthDate?: string;
  farmName?: string;
  penNo?: string;
  status: string;
  statusCode?: string;
  remark?: string;
}

export interface DatasetSummary {
  id: string;
  cowNo: string;
  datasetCode: string;
  datasetUrl: string;
  collectedAt: string;
  fileCount: number;
  status: AssetStatus;
}

export interface PointCloudSummary {
  id: string;
  cowNo: string;
  pointCloudNo: string;
  fileName: string;
  filePath: string;
  fileUrl?: string;
  fileFormat: string;
  fileSizeMb: number;
  pointCount: number;
  fieldSchema: Array<"x" | "y" | "z" | "r" | "g" | "b" | "label">;
  labelCount: number;
  processedAt: string;
  labelStats: Array<{
    label: string;
    pointCount: number;
    ratio: number;
  }>;
}

export interface ImageAnnotation {
  id: string;
  cowNo: string;
  imageType: "眼肌图" | "背膘图";
  fileName: string;
  fileUrl?: string;
  measurement: string;
  eyeMuscleAreaCm2?: number;
  backfatThicknessMm?: number;
  annotatedAt: string;
  status: AssetStatus;
}

export interface VideoStream {
  id: string;
  cowNo: string;
  cameraName: string;
  pen: string;
  playUrl: string;
  datasetUrl: string;
  status: AssetStatus;
}

export interface ArchiveSegment {
  id: string;
  cowNo: string;
  cameraName: string;
  startTime: string;
  endTime: string;
  fileSizeGb: number;
  archiveStatus: AssetStatus;
}

export interface DashboardData {
  cows: CowBasic[];
  datasets: DatasetSummary[];
  pointClouds: PointCloudSummary[];
  images: ImageAnnotation[];
  liveStreams: VideoStream[];
  archives: ArchiveSegment[];
}
