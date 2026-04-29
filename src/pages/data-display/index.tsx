import { useEffect, useMemo, useState } from "react";
import { getDashboardData } from "../../api/dashboard";
import { AppShell, type ShellNavItem } from "../../components/layout/AppShell";
import { StateBlock } from "../../components/ui/StateBlock";
import { CowBasicPage } from "../cow-basic";
import { DatasetPage } from "../dataset";
import { ImageAnnotationPage } from "../image-annotation";
import { LiveVideoPage } from "../live-video";
import { PointCloudDataPage } from "../point-cloud";
import { VideoArchivePage } from "../video-archive";
import type { DashboardData } from "../../types/dashboard";

type ModuleId = "cow-basic" | "dataset" | "point-cloud" | "image" | "live-video" | "archive";

const moduleItems: Array<ShellNavItem & { id: ModuleId; eyebrow: string; title: string; primaryAction: string }> = [
  { id: "cow-basic", label: "牛只档案", eyebrow: "cow_basic", title: "牛只基础档案", primaryAction: "新增牛只" },
  { id: "dataset", label: "数据集", eyebrow: "cow_dataset", title: "牛只数据集", primaryAction: "新增数据集" },
  { id: "point-cloud", label: "点云数据", eyebrow: "cow_point_cloud", title: "点云文件与字段结构", primaryAction: "导入点云" },
  { id: "image", label: "图像标注", eyebrow: "cow_image", title: "图片与标注结果", primaryAction: "上传图片" },
  { id: "live-video", label: "实时视频", eyebrow: "video_stream_access", title: "实时视频访问", primaryAction: "刷新视频" },
  { id: "archive", label: "视频备份", eyebrow: "video_archive_segment", title: "视频备份分段", primaryAction: "导出备份" },
];

export function DataDisplayPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [activeModule, setActiveModule] = useState<ModuleId>("cow-basic");
  const [cowKeyword, setCowKeyword] = useState("");

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    getDashboardData()
      .then((result) => {
        if (isMounted) {
          setData(result);
          setError("");
        }
      })
      .catch((requestError: Error) => {
        if (isMounted) {
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
  }, []);

  const activeMeta = useMemo(
    () => moduleItems.find((item) => item.id === activeModule) ?? moduleItems[0],
    [activeModule],
  );

  return (
    <AppShell
      activeNavId={activeModule}
      eyebrow={activeMeta.eyebrow}
      navItems={moduleItems}
      onNavChange={(moduleId) => setActiveModule(moduleId as ModuleId)}
      primaryAction={activeMeta.primaryAction}
      title={activeMeta.title}
    >
      {isLoading ? <ModuleSkeleton /> : null}

      {!isLoading && error ? (
        <StateBlock title="数据加载失败" description={error} action="重新加载" onAction={() => window.location.reload()} />
      ) : null}

      {!isLoading && !error && data ? renderModule(activeModule, data, cowKeyword, setCowKeyword) : null}
    </AppShell>
  );
}

function renderModule(
  activeModule: ModuleId,
  data: DashboardData,
  cowKeyword: string,
  setCowKeyword: (keyword: string) => void,
) {
  switch (activeModule) {
    case "cow-basic":
      return <CowBasicPage cows={data.cows} keyword={cowKeyword} onKeywordChange={setCowKeyword} />;
    case "dataset":
      return <DatasetPage datasets={data.datasets} />;
    case "point-cloud":
      return <PointCloudDataPage pointClouds={data.pointClouds} />;
    case "image":
      return <ImageAnnotationPage images={data.images} />;
    case "live-video":
      return <LiveVideoPage streams={data.liveStreams} />;
    case "archive":
      return <VideoArchivePage archives={data.archives} />;
    default:
      return null;
  }
}

function ModuleSkeleton() {
  return (
    <div className="module-page" aria-label="加载中">
      <div className="skeleton toolbar-skeleton" />
      <div className="skeleton table-skeleton" />
    </div>
  );
}
