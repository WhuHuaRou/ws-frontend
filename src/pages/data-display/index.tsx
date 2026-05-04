import { type FormEvent, useEffect, useMemo, useState } from "react";
import { createCowBasic, type CowBasicCreateInput } from "../../api/cowBasic";
import { getDashboardData } from "../../api/dashboard";
import { listCowNoOptions, uploadImageAnnotation } from "../../api/imageAnnotation";
import { AppShell, type ShellNavItem } from "../../components/layout/AppShell";
import { StateBlock } from "../../components/ui/StateBlock";
import { CowBasicPage } from "../cow-basic";
import { DatasetPage } from "../dataset";
import { ImageAnnotationPage } from "../image-annotation";
import { LiveVideoPage } from "../live-video";
import { PointCloudDataPage } from "../point-cloud";
import { VideoArchivePage } from "../video-archive";
import type { AssetStatus, CowBasic, DashboardData, DatasetSummary, ImageAnnotation, PointCloudSummary } from "../../types/dashboard";

type ModuleId = "cow-basic" | "dataset" | "point-cloud" | "image" | "live-video" | "archive";
type CreateDialogKind = "cow-basic" | "dataset" | "point-cloud" | "image";

interface DatasetFormState {
  cowNo: string;
  datasetCode: string;
  datasetUrl: string;
  collectedAt: string;
  fileCount: string;
}

interface PointCloudFormState {
  cowNo: string;
  pointCloudNo: string;
  file: File | null;
  pointCount: string;
}

interface ImageFormState {
  cowNo: string;
  imageType: ImageAnnotation["imageType"];
  displayName: string;
  file: File | null;
  measurementValue: string;
  annotatedAt: string;
}

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
  const [dialogKind, setDialogKind] = useState<CreateDialogKind | null>(null);
  const [imageRefreshSignal, setImageRefreshSignal] = useState(0);

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
  const openCreateDialog = () => {
    if (activeModule === "cow-basic" || activeModule === "dataset" || activeModule === "point-cloud" || activeModule === "image") {
      setDialogKind(activeModule);
    }
  };

  return (
    <AppShell
      activeNavId={activeModule}
      eyebrow={activeMeta.eyebrow}
      navItems={moduleItems}
      onNavChange={(moduleId) => setActiveModule(moduleId as ModuleId)}
      onPrimaryAction={openCreateDialog}
      primaryAction={activeMeta.primaryAction}
      title={activeMeta.title}
    >
      {isLoading ? <ModuleSkeleton /> : null}

      {!isLoading && error ? (
        <StateBlock title="数据加载失败" description={error} action="重新加载" onAction={() => window.location.reload()} />
      ) : null}

      {!isLoading && !error && data
        ? renderModule(activeModule, data, cowKeyword, setCowKeyword, imageRefreshSignal)
        : null}

      {data && dialogKind ? (
        <CreateRecordDialog
          cows={data.cows}
          kind={dialogKind}
          onClose={() => setDialogKind(null)}
          onCreateCow={async (form) => {
            const nextCow = await createCowBasic(form);
            setData((current) => (current ? { ...current, cows: [nextCow, ...current.cows] } : current));
            setDialogKind(null);
          }}
          onCreateDataset={(form) => {
            const nextDataset: DatasetSummary = {
              id: `DS-PROTO-${Date.now()}`,
              cowNo: form.cowNo.trim(),
              datasetCode: form.datasetCode.trim(),
              datasetUrl: form.datasetUrl.trim(),
              collectedAt: form.collectedAt.trim(),
              fileCount: Number(form.fileCount) || 0,
              status: "normal" as AssetStatus,
            };
            setData((current) =>
              current ? { ...current, datasets: [nextDataset, ...current.datasets] } : current,
            );
            setDialogKind(null);
          }}
          onCreateImage={async (form) => {
            if (!form.file) {
              return;
            }
            const nextImage = await uploadImageAnnotation({
              cowNo: form.cowNo,
              imageType: form.imageType,
              file: form.file,
              measurementValue: form.measurementValue,
              collectedAt: form.annotatedAt,
            });
            setData((current) => (current ? { ...current, images: [nextImage, ...current.images] } : current));
            setImageRefreshSignal((value) => value + 1);
            setDialogKind(null);
          }}
          onCreatePointCloud={(form) => {
            const pointCloudNo = form.pointCloudNo.trim() || form.file?.name || "未命名点云";
            const fileName = form.file?.name || pointCloudNo;
            const nextPointCloud: PointCloudSummary = {
              id: `PC-PROTO-${Date.now()}`,
              cowNo: form.cowNo.trim(),
              pointCloudNo,
              fileName,
              filePath: `本地上传/${fileName}`,
              fileUrl: form.file ? URL.createObjectURL(form.file) : undefined,
              fileFormat: fileName.split(".").pop()?.toUpperCase() || "TXT",
              fileSizeMb: form.file ? Number((form.file.size / 1024 / 1024).toFixed(1)) : 0,
              pointCount: Number(form.pointCount) || 0,
              fieldSchema: ["x", "y", "z", "r", "g", "b", "label"],
              labelCount: 0,
              processedAt: new Date().toLocaleString("zh-CN", { hour12: false }),
              labelStats: [],
            };
            setData((current) =>
              current ? { ...current, pointClouds: [nextPointCloud, ...current.pointClouds] } : current,
            );
            setDialogKind(null);
          }}
        />
      ) : null}
    </AppShell>
  );
}

function renderModule(
  activeModule: ModuleId,
  data: DashboardData,
  cowKeyword: string,
  setCowKeyword: (keyword: string) => void,
  imageRefreshSignal: number,
) {
  switch (activeModule) {
    case "cow-basic":
      return <CowBasicPage cows={data.cows} keyword={cowKeyword} onKeywordChange={setCowKeyword} />;
    case "dataset":
      return <DatasetPage datasets={data.datasets} />;
    case "point-cloud":
      return <PointCloudDataPage pointClouds={data.pointClouds} />;
    case "image":
      return <ImageAnnotationPage refreshSignal={imageRefreshSignal} />;
    case "live-video":
      return <LiveVideoPage streams={data.liveStreams} />;
    case "archive":
      return <VideoArchivePage archives={data.archives} />;
    default:
      return null;
  }
}

function CreateRecordDialog({
  cows,
  kind,
  onClose,
  onCreateCow,
  onCreateDataset,
  onCreateImage,
  onCreatePointCloud,
}: {
  cows: CowBasic[];
  kind: CreateDialogKind;
  onClose: () => void;
  onCreateCow: (form: CowBasicCreateInput) => void | Promise<void>;
  onCreateDataset: (form: DatasetFormState) => void;
  onCreateImage: (form: ImageFormState) => void | Promise<void>;
  onCreatePointCloud: (form: PointCloudFormState) => void;
}) {
  return (
    <div className="dialog-backdrop" role="presentation">
      <section className="panel create-dialog" role="dialog" aria-modal="true" aria-label="新增业务数据">
        {kind === "cow-basic" ? (
          <CowBasicCreateForm onClose={onClose} onSubmit={onCreateCow} />
        ) : kind === "dataset" ? (
          <DatasetCreateForm onClose={onClose} onSubmit={onCreateDataset} />
        ) : kind === "point-cloud" ? (
          <PointCloudCreateForm onClose={onClose} onSubmit={onCreatePointCloud} />
        ) : (
          <ImageCreateForm cows={cows} onClose={onClose} onSubmit={onCreateImage} />
        )}
      </section>
    </div>
  );
}

function CowBasicCreateForm({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (form: CowBasicCreateInput) => void | Promise<void>;
}) {
  const [form, setForm] = useState<CowBasicCreateInput>({
    cowNo: "",
    cowName: "",
    breed: "",
    gender: "0",
    birthDate: "",
    farmName: "",
    penNo: "",
    status: "0",
    remark: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.cowNo.trim()) {
      return;
    }
    setIsSubmitting(true);
    setError("");
    try {
      await onSubmit(form);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "牛只保存失败");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="create-form" onSubmit={handleSubmit}>
      <DialogHeading eyebrow="cow_basic" title="新增牛只" onClose={onClose} />
      <FormField label="牛编号" value={form.cowNo} onChange={(cowNo) => setForm({ ...form, cowNo })} required />
      <FormField label="牛只名称" value={form.cowName} onChange={(cowName) => setForm({ ...form, cowName })} />
      <FormField label="养殖场" value={form.farmName} onChange={(farmName) => setForm({ ...form, farmName })} />
      <FormField label="栏位编号" value={form.penNo} onChange={(penNo) => setForm({ ...form, penNo })} />
      <FormField label="品种" value={form.breed} onChange={(breed) => setForm({ ...form, breed })} />
      <label className="form-field">
        性别
        <select value={form.gender} onChange={(event) => setForm({ ...form, gender: event.target.value })}>
          <option value="0">未知</option>
          <option value="1">公</option>
          <option value="2">母</option>
        </select>
      </label>
      <FormField label="出生日期" type="date" value={form.birthDate} onChange={(birthDate) => setForm({ ...form, birthDate })} />
      <label className="form-field">
        状态
        <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
          <option value="0">正常</option>
          <option value="1">停用</option>
        </select>
      </label>
      <FormField label="备注" value={form.remark} onChange={(remark) => setForm({ ...form, remark })} />
      {error ? <p className="form-error">{error}</p> : null}
      <DialogActions disabled={isSubmitting} onClose={onClose} submitText={isSubmitting ? "保存中" : "保存牛只"} />
    </form>
  );
}

function DatasetCreateForm({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (form: DatasetFormState) => void;
}) {
  const [form, setForm] = useState<DatasetFormState>({
    cowNo: "",
    datasetCode: "",
    datasetUrl: "",
    collectedAt: "",
    fileCount: "0",
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.cowNo.trim() || !form.datasetCode.trim()) {
      return;
    }
    onSubmit(form);
  };

  return (
    <form className="create-form" onSubmit={handleSubmit}>
      <DialogHeading eyebrow="cow_dataset" title="新增数据集" onClose={onClose} />
      <FormField label="牛编号" value={form.cowNo} onChange={(cowNo) => setForm({ ...form, cowNo })} required />
      <FormField
        label="数据集编号"
        value={form.datasetCode}
        onChange={(datasetCode) => setForm({ ...form, datasetCode })}
        required
      />
      <FormField label="访问地址" value={form.datasetUrl} onChange={(datasetUrl) => setForm({ ...form, datasetUrl })} />
      <FormField label="采集时间" value={form.collectedAt} onChange={(collectedAt) => setForm({ ...form, collectedAt })} />
      <FormField
        label="文件数"
        type="number"
        value={form.fileCount}
        onChange={(fileCount) => setForm({ ...form, fileCount })}
      />
      <DialogActions onClose={onClose} submitText="保存数据集" />
    </form>
  );
}

function PointCloudCreateForm({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (form: PointCloudFormState) => void;
}) {
  const [form, setForm] = useState<PointCloudFormState>({
    cowNo: "",
    pointCloudNo: "",
    file: null,
    pointCount: "0",
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.cowNo.trim() || !form.pointCloudNo.trim() || !form.file) {
      return;
    }
    onSubmit(form);
  };

  return (
    <form className="create-form" onSubmit={handleSubmit}>
      <DialogHeading eyebrow="cow_point_cloud" title="导入点云" onClose={onClose} />
      <FormField label="牛编号" value={form.cowNo} onChange={(cowNo) => setForm({ ...form, cowNo })} required />
      <FormField
        label="点云命名"
        value={form.pointCloudNo}
        onChange={(pointCloudNo) => setForm({ ...form, pointCloudNo })}
        placeholder="例如 D67_3 或 第1头牛点云"
        required
      />
      <FileField
        accept=".txt,.csv,.xyz,.pts,.ply,.pcd"
        file={form.file}
        label="上传点云文件"
        onChange={(file) =>
          setForm({
            ...form,
            file,
            pointCloudNo: form.pointCloudNo || file?.name.replace(/\.[^.]+$/, "") || "",
          })
        }
        required
      />
      <FormField
        label="点数量"
        type="number"
        value={form.pointCount}
        onChange={(pointCount) => setForm({ ...form, pointCount })}
      />
      <DialogActions onClose={onClose} submitText="保存点云" />
    </form>
  );
}

function ImageCreateForm({
  cows,
  onClose,
  onSubmit,
}: {
  cows: CowBasic[];
  onClose: () => void;
  onSubmit: (form: ImageFormState) => void | Promise<void>;
}) {
  const fallbackCowNos = useMemo(() => cows.map((cow) => cow.cowNo), [cows]);
  const [cowNoOptions, setCowNoOptions] = useState<string[]>(fallbackCowNos);
  const [form, setForm] = useState<ImageFormState>({
    cowNo: "",
    imageType: "眼肌图",
    displayName: "",
    file: null,
    measurementValue: "",
    annotatedAt: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    listCowNoOptions(form.cowNo)
      .then((options) => {
        if (isMounted) {
          setCowNoOptions(options.length > 0 ? options : fallbackCowNos);
        }
      })
      .catch(() => {
        if (isMounted) {
          setCowNoOptions(fallbackCowNos);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [fallbackCowNos, form.cowNo]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.cowNo.trim() || !form.file) {
      return;
    }
    if (!isKnownCowNo(cowNoOptions, form.cowNo)) {
      setError("请选择牛只档案中已有的牛编号");
      return;
    }
    setIsSubmitting(true);
    setError("");
    try {
      await onSubmit(form);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "图像保存失败");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="create-form" onSubmit={handleSubmit}>
      <DialogHeading eyebrow="cow_image" title="新增图像" onClose={onClose} />
      <CowNoField options={cowNoOptions} value={form.cowNo} onChange={(cowNo) => setForm({ ...form, cowNo })} required />
      <label className="form-field">
        图像类型
        <select
          value={form.imageType}
          onChange={(event) => setForm({ ...form, imageType: event.target.value as ImageAnnotation["imageType"] })}
        >
          <option value="眼肌图">眼肌图</option>
          <option value="背膘图">背膘图</option>
        </select>
      </label>
      <FormField
        label="图像命名"
        value={form.displayName}
        onChange={(displayName) => setForm({ ...form, displayName })}
        placeholder="例如 眼肌1 或 201454眼肌"
      />
      <FileField
        accept="image/*"
        file={form.file}
        label="上传图像文件"
        onChange={(file) =>
          setForm({
            ...form,
            file,
            displayName: form.displayName || file?.name.replace(/\.[^.]+$/, "") || "",
          })
        }
        required
      />
      <FormField
        label={form.imageType === "眼肌图" ? "眼肌面积 cm2" : "背膘厚度 mm"}
        type="number"
        value={form.measurementValue}
        onChange={(measurementValue) => setForm({ ...form, measurementValue })}
        placeholder="留空则标记待定"
      />
      <FormField label="标注时间" value={form.annotatedAt} onChange={(annotatedAt) => setForm({ ...form, annotatedAt })} />
      {error ? <p className="form-error">{error}</p> : null}
      <DialogActions disabled={isSubmitting} onClose={onClose} submitText={isSubmitting ? "保存中" : "保存图像"} />
    </form>
  );
}

function isKnownCowNo(cowNoOptions: string[], cowNo: string) {
  const normalizedCowNo = cowNo.trim();
  return cowNoOptions.includes(normalizedCowNo);
}

function CowNoField({
  onChange,
  options,
  required,
  value,
}: {
  onChange: (value: string) => void;
  options: string[];
  required?: boolean;
  value: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const filteredOptions = useMemo(() => {
    const keyword = value.trim().toLowerCase();
    if (!keyword) {
      return options.slice(0, 8);
    }
    return options.filter((cowNo) => cowNo.toLowerCase().includes(keyword)).slice(0, 8);
  }, [options, value]);

  return (
    <label className="form-field cow-no-field">
      牛编号
      <div className="cow-select">
        <input
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="搜索牛编号"
          required={required}
        />
        <button className="cow-select-toggle" type="button" onClick={() => setIsOpen((current) => !current)}>
          <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
            <path d="m7 10 5 5 5-5" />
          </svg>
        </button>
        {isOpen ? (
          <div className="cow-select-menu">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((cowNo) => (
                <button
                  key={cowNo}
                  className={cowNo === value ? "cow-select-option cow-select-option-active" : "cow-select-option"}
                  type="button"
                  onClick={() => {
                    onChange(cowNo);
                    setIsOpen(false);
                  }}
                >
                  <span>{cowNo}</span>
                </button>
              ))
            ) : (
              <span className="cow-select-empty">没有匹配的已登记牛编号</span>
            )}
          </div>
        ) : null}
      </div>
      <span className="form-help">只能使用牛只档案中已登记的 cow_no。</span>
    </label>
  );
}

function DialogHeading({ eyebrow, title, onClose }: { eyebrow: string; title: string; onClose: () => void }) {
  return (
    <div className="dialog-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
      </div>
      <button className="icon-button" onClick={onClose} type="button" aria-label="关闭">
        <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>
    </div>
  );
}

function FormField({
  label,
  value,
  onChange,
  placeholder,
  required,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="form-field">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
      />
    </label>
  );
}

function FileField({
  accept,
  file,
  label,
  onChange,
  required,
}: {
  accept: string;
  file: File | null;
  label: string;
  onChange: (file: File | null) => void;
  required?: boolean;
}) {
  return (
    <label className="form-field file-field">
      {label}
      <input
        accept={accept}
        type="file"
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
        required={required}
      />
      <span>{file ? `${file.name} / ${(file.size / 1024 / 1024).toFixed(2)} MB` : "未选择文件"}</span>
    </label>
  );
}

function DialogActions({
  disabled,
  onClose,
  submitText,
}: {
  disabled?: boolean;
  onClose: () => void;
  submitText: string;
}) {
  return (
    <div className="dialog-actions">
      <button className="secondary-button" disabled={disabled} onClick={onClose} type="button">
        取消
      </button>
      <button className="primary-button" disabled={disabled} type="submit">
        {submitText}
      </button>
    </div>
  );
}

function ModuleSkeleton() {
  return (
    <div className="module-page" aria-label="加载中">
      <div className="skeleton toolbar-skeleton" />
      <div className="skeleton table-skeleton" />
    </div>
  );
}
