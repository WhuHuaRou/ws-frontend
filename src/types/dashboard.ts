export type AssetStatus = "normal" | "warning" | "offline";

export interface CowBasic {
  cowNo: string;
  pen: string;
  breed: string;
  gender: string;
  ageMonth: number;
  weightKg: number;
  status: "在栏" | "观察" | "转出";
  lastCollectedAt: string;
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
  measurement: string;
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
