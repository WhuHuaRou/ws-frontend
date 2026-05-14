import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const initialData = window.prototypeData || {};
const state = {
  view: "command-center",
  activeModule: "cow-basic",
  keyword: "",
  pointField: "x",
  selectedPointCloudId: "",
  dialogKind: null,
  data: cloneData(initialData),
};

const moduleMeta = {
  "cow-basic": { label: "牛只档案", tableName: "cow_basic", primaryAction: "新增牛只" },
  dataset: { label: "数据集", tableName: "cow_dataset", primaryAction: "新增数据集" },
  "point-cloud": { label: "点云数据", tableName: "cow_point_cloud", primaryAction: "导入点云" },
  image: { label: "图像标注", tableName: "cow_image", primaryAction: "上传图片" },
  "live-video": { label: "实时视频", tableName: "video_stream_access", primaryAction: "刷新视频" },
  archive: { label: "视频备份", tableName: "video_archive_segment", primaryAction: "导出备份" },
};

const pointFieldDescriptions = {
  x: { name: "X 坐标", detail: "点在三维空间中的横向位置，用于还原牛体轮廓。" },
  y: { name: "Y 坐标", detail: "点在三维空间中的纵向位置，与 x、z 共同构成点云坐标。" },
  z: { name: "Z 坐标", detail: "点在三维空间中的高度或深度位置，用于体尺分析。" },
  r: { name: "R 颜色通道", detail: "点云颜色中的红色通道值。" },
  g: { name: "G 颜色通道", detail: "点云颜色中的绿色通道值。" },
  b: { name: "B 颜色通道", detail: "点云颜色中的蓝色通道值。" },
  label: { name: "Label 标签", detail: "点所属的业务标签，可映射到牛体不同区域。" },
};

const labelPalette = [
  new THREE.Color("#4e79ff"),
  new THREE.Color("#ff5370"),
  new THREE.Color("#59d67d"),
  new THREE.Color("#ffc84d"),
  new THREE.Color("#9d6bff"),
  new THREE.Color("#ff8a37"),
  new THREE.Color("#22c7e8"),
  new THREE.Color("#eb4fa4"),
  new THREE.Color("#62dfc2"),
  new THREE.Color("#d96d2f"),
];

const colorModeText = {
  label: "按 label 上色",
  rgb: "按 RGB 上色",
  height: "按高度渐变",
};

const pointCloudCache = new Map();
const pointViewer = {
  renderer: null,
  scene: null,
  camera: null,
  controls: null,
  frameId: null,
  resizeObserver: null,
  initialView: null,
  abortController: null,
};

function cloneData(data) {
  return JSON.parse(JSON.stringify(data));
}

function escapeHtml(str) {
  if (str === null || str === undefined) {
    return "";
  }
  const div = document.createElement("div");
  div.textContent = String(str);
  return div.innerHTML;
}

function formatCompact(value) {
  if (value >= 10000) {
    return (value / 10000).toFixed(1) + "万";
  }
  return String(value);
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("zh-CN");
}

function formatFileSize(sizeMb) {
  if (sizeMb >= 1024) {
    return (sizeMb / 1024).toFixed(1) + "GB";
  }
  return sizeMb.toFixed(1) + "MB";
}

function formatStatus(status) {
  if (status === "warning") {
    return "待复核";
  }
  if (status === "offline") {
    return "离线";
  }
  return "正常";
}

function createLineChart(values) {
  if (!values.length) {
    return '<svg class="command-line-chart" viewBox="0 0 100 100" preserveAspectRatio="none"><polyline points="0,92 100,92" fill="none" stroke="currentColor" stroke-width="3" vector-effect="non-scaling-stroke"></polyline></svg>';
  }
  const max = Math.max.apply(null, values);
  const min = Math.min.apply(null, values);
  const points = values
    .map(function (value, index) {
      const x = values.length === 1 ? 50 : (index / (values.length - 1)) * 100;
      const y = 92 - ((value - min) / (max - min || 1)) * 74;
      return x + "," + y;
    })
    .join(" ");

  return (
    '<svg class="command-line-chart" viewBox="0 0 100 100" preserveAspectRatio="none">' +
    '<polyline points="' +
    points +
    '" fill="none" stroke="currentColor" stroke-width="3" vector-effect="non-scaling-stroke"></polyline>' +
    '<polygon points="0,100 ' +
    points +
    ' 100,100" fill="currentColor" opacity="0.18"></polygon>' +
    "</svg>"
  );
}

function getModules() {
  const data = state.data;
  const totalDatasetFiles = data.datasets.reduce(function (sum, item) {
    return sum + item.fileCount;
  }, 0);
  const totalPointCount = data.pointClouds.reduce(function (sum, item) {
    return sum + item.pointCount;
  }, 0);
  const totalPointFileSizeMb = data.pointClouds.reduce(function (sum, item) {
    return sum + item.fileSizeMb;
  }, 0);
  const archiveSizeGb = data.archives.reduce(function (sum, item) {
    return sum + item.fileSizeGb;
  }, 0);
  const measuredImages = data.images.filter(function (item) {
    return item.measurement;
  }).length;

  return [
    { id: "cow-basic", label: "牛只档案", tableName: "cow_basic", value: String(data.cows.length), unit: "头", detail: "牛编号、栏位、品种、状态" },
    { id: "dataset", label: "数据集", tableName: "cow_dataset", value: String(data.datasets.length), unit: "组", detail: totalDatasetFiles + " 个文件已归入数据集记录" },
    { id: "point-cloud", label: "点云数据", tableName: "cow_point_cloud", value: formatCompact(totalPointCount), unit: "点", detail: data.pointClouds.length + " 个 TXT 文件，" + formatFileSize(totalPointFileSizeMb) },
    { id: "image", label: "图像标注", tableName: "cow_image", value: String(data.images.length), unit: "张", detail: measuredImages > 0 ? measuredImages + " 张已录入测量值" : "等待眼肌图、背膘图接入" },
    { id: "live-video", label: "实时视频", tableName: "video_stream_access", value: String(data.liveStreams.length), unit: "路", detail: "摄像头、栏位、播放地址" },
    { id: "archive", label: "视频备份", tableName: "video_archive_segment", value: archiveSizeGb.toFixed(1), unit: "GB", detail: data.archives.length + " 个小时分段" },
  ];
}

function renderModuleRecord(record) {
  const toneClass =
    record.tone === "normal"
      ? "module-record-value-normal"
      : record.tone === "muted"
        ? "module-record-value-muted"
        : "";

  return (
    '<div class="module-record">' +
    "<strong>" +
    escapeHtml(record.title) +
    "</strong>" +
    "<span>" +
    escapeHtml(record.meta) +
    "</span>" +
    '<em class="module-record-value ' +
    toneClass +
    '">' +
    escapeHtml(record.value) +
    "</em>" +
    "</div>"
  );
}

function renderPanel(title, action, content, moduleId) {
  return (
    '<article class="command-panel">' +
    "<header>" +
    "<h2>" +
    escapeHtml(title) +
    "</h2>" +
    '<div class="command-panel-actions">' +
    "<span>" +
    escapeHtml(action) +
    "</span>" +
    (moduleId ? '<button class="command-panel-link" data-module="' + moduleId + '" type="button">进入</button>' : "") +
    "</div>" +
    "</header>" +
    content +
    "</article>"
  );
}

function renderCommandCenter() {
  const data = state.data;
  const modules = getModules();
  const selectedCow = data.cows[0];
  const latestDataset = data.datasets[0];
  const primaryPointCloud = data.pointClouds[0];
  const latestArchive = data.archives[0];
  const primaryStream = data.liveStreams[0];
  const totalDatasetFiles = data.datasets.reduce(function (sum, item) {
    return sum + item.fileCount;
  }, 0);
  const archiveSizeGb = data.archives.reduce(function (sum, item) {
    return sum + item.fileSizeGb;
  }, 0);

  const kpiHtml = modules
    .map(function (module, index) {
      return (
        '<article class="command-kpi" style="--index:' +
        index +
        '">' +
        "<span>" +
        module.label +
        "</span>" +
        "<strong>" +
        module.value +
        "<small>" +
        module.unit +
        "</small></strong>" +
        "<em>" +
        module.tableName +
        "</em>" +
        "</article>"
      );
    })
    .join("");

  const leftStack =
    renderPanel(
      "牛只档案",
      data.cows.length + "头",
      '<div class="module-record-list">' +
        data.cows
          .map(function (cow) {
            return renderModuleRecord({
              title: cow.cowNo,
              meta: cow.farmName + " / " + cow.penNo + " / " + cow.breed,
              value: cow.status,
              tone: cow.status === "正常" ? "normal" : "muted",
            });
          })
          .join("") +
        "</div>",
      "cow-basic",
    ) +
    renderPanel(
      "数据集",
      totalDatasetFiles + "文件",
      '<div class="module-record-list">' +
        data.datasets
          .map(function (dataset) {
            return renderModuleRecord({
              title: dataset.datasetCode,
              meta: dataset.cowNo + " / " + dataset.collectedAt,
              value: dataset.fileCount + "文件",
              tone: dataset.status === "normal" ? "normal" : "muted",
            });
          })
          .join("") +
        "</div>",
      "dataset",
    );

  const rightStack =
    renderPanel(
      "点云数据",
      data.pointClouds.length + "个文件",
      '<div class="point-module">' +
        createLineChart(
          data.pointClouds.map(function (item) {
            return Math.round(item.pointCount / 1000);
          }),
        ) +
        '<div class="module-record-list">' +
        data.pointClouds
          .slice(0, 4)
          .map(function (cloud) {
            return renderModuleRecord({
              title: cloud.pointCloudNo,
              meta: cloud.cowNo + " / " + cloud.fileFormat + " / " + cloud.labelCount + "类label",
              value: formatCompact(cloud.pointCount) + "点",
            });
          })
          .join("") +
        "</div></div>",
      "point-cloud",
    ) +
    renderPanel(
      "图像标注",
      data.images.length + "张",
      data.images.length
        ? '<div class="module-record-list">' +
            data.images
              .slice(0, 3)
              .map(function (image) {
                return renderModuleRecord({
                  title: image.fileName,
                  meta: image.cowNo + " / " + image.imageType,
                  value: image.measurement,
                  tone: image.status === "normal" ? "normal" : "muted",
                });
              })
              .join("") +
            "</div>"
        : '<div class="empty-module"><strong>暂无图像标注数据</strong><span>该模块只展示眼肌图、背膘图和对应测量值。</span></div>',
      "image",
    ) +
    renderPanel(
      "实时视频",
      data.liveStreams.length + "路",
      '<div class="module-record-list">' +
        data.liveStreams
          .map(function (stream) {
            return renderModuleRecord({
              title: stream.cameraName,
              meta: stream.cowNo + " / " + stream.pen,
              value: "播放地址",
              tone: stream.status === "normal" ? "normal" : "muted",
            });
          })
          .join("") +
        "</div>",
      "live-video",
    );

  const heroPanel =
    '<div class="command-hero-topline">' +
    "<div>" +
    "<span>cow_no / " +
    escapeHtml(selectedCow.cowNo) +
    "</span>" +
    "<strong>" +
    escapeHtml(selectedCow.farmName) +
    " · " +
    escapeHtml(selectedCow.penNo) +
    "</strong></div>" +
    '<div class="command-hero-tags">' +
    "<span>" +
    escapeHtml(selectedCow.breed) +
    "</span>" +
    "<span>" +
    escapeHtml(selectedCow.gender) +
    "</span>" +
    "<span>" +
    escapeHtml(selectedCow.status) +
    "</span>" +
    "</div></div>" +
    '<div class="command-orbit">' +
    '<img class="command-hero-image" src="assets/cattle-digital-twin.png" alt="整牛多模态数字孪生主视觉">' +
    '<div class="command-hero-vignette"></div>' +
    '<div class="command-orbit-ring command-orbit-ring-outer"></div>' +
    '<div class="command-orbit-ring command-orbit-ring-middle"></div>' +
    '<div class="command-orbit-ring command-orbit-ring-inner"></div>' +
    '<div class="command-radar-sweep"></div>' +
    modules
      .map(function (module) {
        return (
          '<div class="asset-badge badge-' +
          module.id +
          '">' +
          "<span>" +
          module.label +
          "</span>" +
          "<strong>" +
          module.value +
          module.unit +
          "</strong></div>"
        );
      })
      .join("") +
    "</div>" +
    '<div class="command-core-strip">' +
    "<div><span>资产链路</span><strong>" +
    escapeHtml(selectedCow.cowNo) +
    "</strong><small>cow_no 贯穿档案、数据集、图像和视频记录</small></div>" +
    "<div><span>采集批次</span><strong>" +
    escapeHtml(latestDataset.datasetCode) +
    "</strong><small>" +
    latestDataset.fileCount +
    " 文件 / " +
    escapeHtml(latestDataset.collectedAt) +
    "</small></div>" +
    "<div><span>点云字段</span><strong>" +
    escapeHtml(primaryPointCloud.pointCloudNo) +
    "</strong><small>" +
    escapeHtml(primaryPointCloud.fieldSchema.join(" / ")) +
    "</small></div>" +
    "<div><span>视频归档</span><strong>" +
    archiveSizeGb.toFixed(2) +
    "GB</strong><small>" +
    escapeHtml(latestArchive.startTime) +
    " 起</small></div></div>";

  const dataChain = [
    { label: "牛只", value: selectedCow.cowNo },
    { label: "数据集", value: latestDataset.datasetCode },
    { label: "点云", value: primaryPointCloud.pointCloudNo },
    { label: "图像", value: data.images.length + "张" },
    { label: "视频", value: primaryStream.cameraName },
    { label: "备份", value: latestArchive.id },
  ];

  const bottomHtml =
    renderPanel(
      "视频备份",
      data.archives.length + "段",
      '<div class="module-record-list command-archive-grid">' +
        data.archives
          .map(function (archive) {
            return renderModuleRecord({
              title: archive.cameraName,
              meta: archive.startTime + " - " + archive.endTime,
              value: archive.fileSizeGb + "GB",
              tone: archive.archiveStatus === "normal" ? "normal" : "muted",
            });
          })
          .join("") +
        "</div>",
      "archive",
    ) +
    '<div class="command-panel"><header><h2>六模块资产链路</h2><div class="command-panel-actions"><span>' +
    escapeHtml(selectedCow.cowNo) +
    '</span></div></header><div class="command-chain">' +
    dataChain
      .map(function (item) {
        return "<span><small>" + item.label + "</small><strong>" + escapeHtml(item.value) + "</strong></span>";
      })
      .join("") +
    "</div></div>";

  return (
    '<main class="command-center">' +
    '<div class="command-stars"></div><div class="command-scan-grid"></div>' +
    '<header class="command-header">' +
    '<div class="command-status-mark"><span>Command View</span><strong>多模态资产总览</strong></div>' +
    '<div class="command-title-frame"><span></span><h1>整牛多模态数据驾驶舱</h1><span></span></div>' +
    '<div class="command-ops"><span>在线运行</span><strong id="clock">00:00:00</strong></div>' +
    "</header>" +
    '<section class="command-kpis">' +
    kpiHtml +
    "</section>" +
    '<section class="command-grid"><aside class="command-stack command-stack-left">' +
    leftStack +
    '</aside><section class="command-hero-panel">' +
    heroPanel +
    '</section><aside class="command-stack command-stack-right">' +
    rightStack +
    "</aside></section>" +
    '<section class="command-bottom-grid-six">' +
    bottomHtml +
    "</section></main>"
  );
}

function renderWorkspace() {
  const meta = moduleMeta[state.activeModule];
  return (
    '<main class="prototype-shell">' +
    renderSidebar() +
    '<section class="prototype-main">' +
    '<header class="workspace-header">' +
    '<div class="workspace-title-group">' +
    '<button class="workspace-back-button" type="button" data-action="back-to-home">返回总览</button>' +
    '<div><p class="workspace-eyebrow">' +
    escapeHtml(meta.tableName) +
    '</p><h1>' +
    escapeHtml(meta.label) +
    "</h1></div></div>" +
    '<div class="workspace-header-actions"><button class="workspace-primary-button" type="button" data-action="open-dialog">' +
    escapeHtml(meta.primaryAction) +
    "</button></div></header>" +
    renderWorkspaceBody() +
    "</section>" +
    (state.dialogKind ? renderDialog() : "") +
    "</main>"
  );
}

function renderSidebar() {
  const modules = getModules();
  return (
    '<aside class="prototype-sidebar">' +
    '<div class="prototype-sidebar-head"><span>Command Center</span><strong>多模态工作台</strong></div>' +
    '<nav class="prototype-nav">' +
    modules
      .map(function (module, index) {
        const activeClass = module.id === state.activeModule ? "prototype-nav-item prototype-nav-item-active" : "prototype-nav-item";
        return (
          '<button class="' +
          activeClass +
          '" type="button" data-action="switch-module" data-module="' +
          module.id +
          '">' +
          '<small>' +
          String(index + 1).padStart(2, "0") +
          '</small><span>' +
          escapeHtml(module.label) +
          '</span><em>' +
          escapeHtml(module.value + module.unit) +
          "</em></button>"
        );
      })
      .join("") +
    "</nav>" +
    "</aside>"
  );
}

function renderWorkspaceBody() {
  if (state.activeModule === "cow-basic") {
    return renderCowBasicModule();
  }
  if (state.activeModule === "dataset") {
    return renderDatasetModule();
  }
  if (state.activeModule === "point-cloud") {
    return renderPointCloudModule();
  }
  if (state.activeModule === "image") {
    return renderImageModule();
  }
  if (state.activeModule === "live-video") {
    return renderLiveVideoModule();
  }
  return renderArchiveModule();
}

function renderCowBasicModule() {
  const keyword = state.keyword.trim().toLowerCase();
  const rows = state.data.cows.filter(function (cow) {
    if (!keyword) {
      return true;
    }
    return [cow.cowNo, cow.cowName, cow.farmName, cow.penNo, cow.breed]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(keyword);
  });

  return (
    '<section class="workspace-panel workspace-toolbar">' +
    '<div><p class="workspace-eyebrow">cow_basic</p><h2>牛只基础档案</h2></div>' +
    '<label class="workspace-search"><span>档案检索</span><input id="cow-search" value="' +
    escapeHtml(state.keyword) +
    '" placeholder="牛编号 / 名称 / 栏位"></label></section>' +
    renderTable(
      ["牛编号", "牛只名称", "养殖场", "栏位", "品种", "性别", "出生日期", "状态", "备注"],
      rows.map(function (cow) {
        return [
          "<strong>" + escapeHtml(cow.cowNo) + "</strong>",
          escapeHtml(cow.cowName || "-"),
          escapeHtml(cow.farmName || "-"),
          escapeHtml(cow.penNo || "-"),
          escapeHtml(cow.breed || "-"),
          escapeHtml(cow.gender),
          escapeHtml(cow.birthDate || "-"),
          escapeHtml(cow.status),
          escapeHtml(cow.remark || "-"),
        ];
      }),
    )
  );
}

function renderDatasetModule() {
  return renderTable(
    ["数据集编号", "牛编号", "文件数", "访问地址", "采集时间", "状态"],
    state.data.datasets.map(function (dataset) {
      return [
        "<strong>" + escapeHtml(dataset.datasetCode) + '</strong><span class="workspace-subline">' + escapeHtml(dataset.id) + "</span>",
        escapeHtml(dataset.cowNo),
        String(dataset.fileCount),
        escapeHtml(dataset.datasetUrl),
        escapeHtml(dataset.collectedAt),
        renderStatusPill(dataset.status),
      ];
    }),
    "cow_dataset",
    "牛只数据集",
  );
}

function renderPointCloudModule() {
  const pointClouds = state.data.pointClouds;
  const selected = pointClouds.find(function (item) {
    return item.id === state.selectedPointCloudId;
  }) || pointClouds[0];
  const field = pointFieldDescriptions[state.pointField] || pointFieldDescriptions.x;

  return (
    '<section class="point-cloud-layout">' +
    '<aside class="workspace-panel point-sidebar">' +
    '<div class="workspace-panel-head"><div><p class="workspace-eyebrow">cow_point_cloud</p><h2>点云目录</h2></div></div>' +
    '<div class="point-list">' +
    pointClouds
      .map(function (item) {
        const activeClass = item.id === selected.id ? "point-item point-item-active" : "point-item";
        return (
          '<button class="' +
          activeClass +
          '" type="button" data-action="select-point" data-point-id="' +
          item.id +
          '">' +
          "<strong>" +
          escapeHtml(item.pointCloudNo) +
          "</strong><span>" +
          escapeHtml(item.cowNo) +
          "</span><em>" +
          formatCompact(item.pointCount) +
          " 点</em></button>"
        );
      })
      .join("") +
    "</div></aside>" +
    '<section class="workspace-panel point-detail">' +
    '<div class="workspace-panel-head"><div><p class="workspace-eyebrow">' +
    escapeHtml(selected.cowNo) +
    '</p><h2>' +
    escapeHtml(selected.pointCloudNo) +
    '</h2></div><span class="workspace-note">' +
    escapeHtml(selected.processedAt) +
    "</span></div>" +
    '<div class="point-cloud-file">' +
    '<span><small>文件名</small><strong>' +
    escapeHtml(selected.fileName) +
    "</strong></span>" +
    '<span><small>路径</small><strong>' +
    escapeHtml(selected.filePath) +
    "</strong></span></div>" +
    '<div class="point-cloud-summary">' +
    "<span><strong>" +
    escapeHtml(selected.fileFormat) +
    "</strong>文件格式</span>" +
    "<span><strong>" +
    formatNumber(selected.pointCount) +
    "</strong>点数量</span>" +
    "<span><strong>" +
    selected.fileSizeMb +
    " MB</strong>文件大小</span></div>" +
    renderPointViewer(selected) +
    '<div class="field-chip-row">' +
    selected.fieldSchema
      .map(function (fieldName) {
        const activeClass = fieldName === state.pointField ? "field-chip field-chip-active" : "field-chip";
        return '<button class="' + activeClass + '" type="button" data-action="select-field" data-field="' + fieldName + '">' + fieldName + "</button>";
      })
      .join("") +
    "</div>" +
    '<div class="field-detail-box"><strong>' +
    escapeHtml(field.name) +
    "</strong><span>" +
    escapeHtml(field.detail) +
    "</span></div>" +
    '<div class="part-bars">' +
    selected.labelStats
      .map(function (item) {
        return (
          '<div class="part-row"><span>' +
          escapeHtml(item.label) +
          '</span><div class="part-track"><span style="width:' +
          item.ratio +
          '%"></span></div><strong>' +
          item.ratio +
          "%</strong></div>"
        );
      })
      .join("") +
    "</div></section></section>"
  );
}

function renderPointViewer(pointCloud) {
  return (
    '<div class="point-viewer-shell">' +
    '<div class="point-viewer-canvas" id="point-viewer-canvas">' +
    '<div class="point-viewer-state point-viewer-state-loading" id="point-viewer-state">' +
    "<strong>正在加载点云文件</strong>" +
    "<span>" +
    escapeHtml(pointCloud.fileName) +
    "</span></div></div>" +
    '<div class="point-viewer-footer">' +
    '<div id="point-viewer-meta"><strong>三维预览</strong><span>正在加载点云文件</span></div>' +
    '<button class="viewer-reset-button" type="button" id="point-viewer-reset" disabled>重置视角</button>' +
    "</div></div>"
  );
}

function renderImageModule() {
  return (
    '<section class="workspace-panel workspace-panel-head-only"><div class="workspace-panel-head"><div><p class="workspace-eyebrow">cow_image</p><h2>眼肌与背膘展示</h2></div></div></section>' +
    '<section class="image-grid">' +
    state.data.images
      .map(function (image) {
        return (
          '<article class="workspace-panel image-card">' +
          '<div class="image-preview"><img src="' +
          escapeHtml(image.fileUrl) +
          '" alt="' +
          escapeHtml(image.cowNo + " " + image.imageType) +
          '"></div><div><p class="workspace-eyebrow">' +
          escapeHtml(image.cowNo) +
          '</p><h2>' +
          escapeHtml(image.imageType) +
          '</h2></div><div class="image-metric"><small>' +
          escapeHtml(image.metricLabel) +
          "</small><strong>" +
          escapeHtml(image.metricValue) +
          '</strong></div><p class="image-summary">' +
          escapeHtml(image.measurement) +
          '</p><div class="image-card-foot"><span>' +
          escapeHtml(image.annotatedAt) +
          "</span>" +
          renderStatusPill(image.status) +
          "</div></article>"
        );
      })
      .join("") +
    "</section>"
  );
}

function renderLiveVideoModule() {
  return (
    '<section class="card-grid">' +
    state.data.liveStreams
      .map(function (stream) {
        return (
          '<article class="workspace-panel video-card">' +
          '<div class="video-placeholder"><span></span><span class="short"></span></div>' +
          '<div class="workspace-panel-head"><div><p class="workspace-eyebrow">' +
          escapeHtml(stream.cowNo) +
          '</p><h2>' +
          escapeHtml(stream.cameraName) +
          "</h2></div>" +
          renderStatusPill(stream.status) +
          '</div><div class="record-meta"><span>栏位：' +
          escapeHtml(stream.pen) +
          "</span><span>播放：" +
          escapeHtml(stream.playUrl) +
          "</span><span>数据集：" +
          escapeHtml(stream.datasetUrl) +
          "</span></div></article>"
        );
      })
      .join("") +
    "</section>"
  );
}

function renderArchiveModule() {
  return renderTable(
    ["分段编号", "牛编号", "摄像头", "开始时间", "结束时间", "大小", "状态"],
    state.data.archives.map(function (archive) {
      return [
        "<strong>" + escapeHtml(archive.id) + "</strong>",
        escapeHtml(archive.cowNo),
        escapeHtml(archive.cameraName),
        escapeHtml(archive.startTime),
        escapeHtml(archive.endTime),
        archive.fileSizeGb + " GB",
        renderStatusPill(archive.archiveStatus),
      ];
    }),
    "video_archive_segment",
    "视频备份分段",
  );
}

function renderTable(headers, rows, eyebrow, title) {
  return (
    '<section class="workspace-panel">' +
    (title
      ? '<div class="workspace-panel-head"><div><p class="workspace-eyebrow">' + escapeHtml(eyebrow || "") + '</p><h2>' + escapeHtml(title) + "</h2></div></div>"
      : "") +
    '<div class="workspace-table-wrap"><table class="workspace-table"><thead><tr>' +
    headers
      .map(function (header) {
        return "<th>" + escapeHtml(header) + "</th>";
      })
      .join("") +
    "</tr></thead><tbody>" +
    rows
      .map(function (row) {
        return (
          "<tr>" +
          row
            .map(function (cell) {
              return "<td>" + cell + "</td>";
            })
            .join("") +
          "</tr>"
        );
      })
      .join("") +
    "</tbody></table></div></section>"
  );
}

function renderStatusPill(status) {
  const cls =
    status === "warning"
      ? "workspace-status workspace-status-warning"
      : status === "offline"
        ? "workspace-status workspace-status-offline"
        : "workspace-status workspace-status-normal";
  return '<span class="' + cls + '">' + formatStatus(status) + "</span>";
}

function renderDialog() {
  const title = moduleMeta[state.dialogKind].primaryAction;
  return (
    '<div class="dialog-backdrop">' +
    '<section class="dialog-card" role="dialog" aria-modal="true">' +
    '<div class="dialog-head"><div><p class="workspace-eyebrow">' +
    escapeHtml(moduleMeta[state.dialogKind].tableName) +
    '</p><h2>' +
    escapeHtml(title) +
    '</h2></div><button class="dialog-close" type="button" data-action="close-dialog">关闭</button></div>' +
    renderDialogForm() +
    "</section></div>"
  );
}

function renderDialogForm() {
  if (state.dialogKind === "cow-basic") {
    return (
      '<form class="dialog-form" id="prototype-form">' +
      inputField("cowNo", "牛编号", "例如 CN-250001") +
      inputField("cowName", "牛只名称", "例如 D01-250001") +
      inputField("farmName", "养殖场", "例如 华中示范牛舍") +
      inputField("penNo", "栏位编号", "例如 A-01") +
      inputField("breed", "品种", "例如 西门塔尔") +
      inputField("gender", "性别", "公 / 母 / 未知") +
      inputField("birthDate", "出生日期", "2025-01-08") +
      inputField("remark", "备注", "当前批次新增") +
      dialogActions("保存牛只") +
      "</form>"
    );
  }

  if (state.dialogKind === "dataset") {
    return (
      '<form class="dialog-form" id="prototype-form">' +
      inputField("cowNo", "牛编号", "例如 CN-240317") +
      inputField("datasetCode", "数据集编号", "例如 DS-CN250001-0514") +
      inputField("datasetUrl", "访问地址", "/datasets/CN-250001/20260514") +
      inputField("collectedAt", "采集时间", "2026-05-14 15:30") +
      inputField("fileCount", "文件数", "24") +
      dialogActions("保存数据集") +
      "</form>"
    );
  }

  if (state.dialogKind === "point-cloud") {
    return (
      '<form class="dialog-form" id="prototype-form">' +
      inputField("cowNo", "牛编号", "例如 CN-240317") +
      inputField("pointCloudNo", "点云命名", "例如 D88_1.txt") +
      inputField("fileName", "文件名", "例如 D88_1.txt") +
      inputField("pointCount", "点数量", "245000") +
      inputField("fileSizeMb", "文件大小 MB", "11.8") +
      dialogActions("保存点云") +
      "</form>"
    );
  }

  return (
    '<form class="dialog-form" id="prototype-form">' +
    inputField("cowNo", "牛编号", "例如 CN-240317") +
    inputField("imageType", "图像类型", "眼肌图 / 背膘图") +
    inputField("fileName", "图像命名", "例如 eye-muscle-2.png") +
    inputField("measurementValue", "测量值", "例如 88.1 cm2 或 8.4 mm") +
    inputField("annotatedAt", "标注时间", "2026-05-14 16:10") +
    dialogActions("保存图像") +
    "</form>"
  );
}

function inputField(name, label, placeholder) {
  return (
    '<label class="dialog-field"><span>' +
    escapeHtml(label) +
    '</span><input name="' +
    name +
    '" placeholder="' +
    escapeHtml(placeholder) +
    '"></label>'
  );
}

function dialogActions(submitText) {
  return (
    '<div class="dialog-actions"><button class="workspace-secondary-button" type="button" data-action="close-dialog">取消</button>' +
    '<button class="workspace-primary-button" type="submit">' +
    escapeHtml(submitText) +
    "</button></div>"
  );
}

function syncPointSelection() {
  if (!state.data.pointClouds.length) {
    state.selectedPointCloudId = "";
    return;
  }
  const exists = state.data.pointClouds.some(function (item) {
    return item.id === state.selectedPointCloudId;
  });
  if (!exists) {
    state.selectedPointCloudId = state.data.pointClouds[0].id;
  }
}

function renderApp() {
  disposePointViewer();
  syncPointSelection();
  const app = document.getElementById("app");
  if (!app) {
    return;
  }
  app.innerHTML = state.view === "command-center" ? renderCommandCenter() : renderWorkspace();
  bindEvents();
  if (state.view === "workspace" && state.activeModule === "point-cloud") {
    mountPointViewer();
  }
  updateClock();
}

function bindEvents() {
  const search = document.getElementById("cow-search");
  if (search) {
    search.addEventListener("input", function (event) {
      state.keyword = event.target.value;
      renderApp();
    });
  }

  bindAll('[data-action="switch-module"]', function (button) {
    button.addEventListener("click", function () {
      state.activeModule = button.getAttribute("data-module");
      state.keyword = "";
      state.dialogKind = null;
      renderApp();
    });
  });

  bindAll(".command-panel-link", function (button) {
    button.addEventListener("click", function () {
      state.view = "workspace";
      state.activeModule = button.getAttribute("data-module");
      state.dialogKind = null;
      renderApp();
    });
  });

  bindAll('[data-action="back-to-home"]', function (button) {
    button.addEventListener("click", function () {
      state.view = "command-center";
      state.dialogKind = null;
      renderApp();
    });
  });

  bindAll('[data-action="open-dialog"]', function (button) {
    button.addEventListener("click", function () {
      if (state.activeModule === "live-video" || state.activeModule === "archive") {
        return;
      }
      state.dialogKind = state.activeModule;
      renderApp();
    });
  });

  bindAll('[data-action="close-dialog"]', function (button) {
    button.addEventListener("click", function () {
      state.dialogKind = null;
      renderApp();
    });
  });

  bindAll('[data-action="select-point"]', function (button) {
    button.addEventListener("click", function () {
      state.selectedPointCloudId = button.getAttribute("data-point-id");
      renderApp();
    });
  });

  bindAll('[data-action="select-field"]', function (button) {
    button.addEventListener("click", function () {
      state.pointField = button.getAttribute("data-field");
      renderApp();
    });
  });

  const resetButton = document.getElementById("point-viewer-reset");
  if (resetButton) {
    resetButton.addEventListener("click", resetPointViewer);
  }

  const form = document.getElementById("prototype-form");
  if (form) {
    form.addEventListener("submit", handleDialogSubmit);
  }
}

function bindAll(selector, fn) {
  Array.prototype.forEach.call(document.querySelectorAll(selector), fn);
}

async function mountPointViewer() {
  const pointCloud = getSelectedPointCloud();
  const canvasContainer = document.getElementById("point-viewer-canvas");
  if (!pointCloud || !canvasContainer) {
    return;
  }

  if (!pointCloud.fileUrl) {
    setPointViewerState("error", "缺少点云文件访问地址", pointCloud.fileName || "");
    return;
  }

  setPointViewerState("loading", "正在加载点云文件", pointCloud.fileName || "");
  pointViewer.abortController = new AbortController();

  try {
    let parsed = pointCloudCache.get(pointCloud.fileUrl);
    if (!parsed) {
      const response = await fetch(pointCloud.fileUrl, { signal: pointViewer.abortController.signal });
      if (!response.ok) {
        throw new Error("文件加载失败（HTTP " + response.status + "）");
      }
      const text = await response.text();
      parsed = parsePointCloudText(text, pointCloud.fieldSchema);
      pointCloudCache.set(pointCloud.fileUrl, parsed);
    }

    if (!parsed.pointCount) {
      setPointViewerState("empty", "文件中没有可渲染的点", pointCloud.fileName || "");
      return;
    }

    mountPointViewerScene(canvasContainer, parsed);
    setPointViewerMeta(parsed);
  } catch (error) {
    if (pointViewer.abortController && pointViewer.abortController.signal.aborted) {
      return;
    }
    setPointViewerState("error", error instanceof Error ? error.message : "点云解析失败", pointCloud.fileName || "");
  }
}

function getSelectedPointCloud() {
  return (
    state.data.pointClouds.find(function (item) {
      return item.id === state.selectedPointCloudId;
    }) || state.data.pointClouds[0]
  );
}

function mountPointViewerScene(container, parsed) {
  disposePointViewerScene();

  const width = Math.max(container.clientWidth, 1);
  const height = Math.max(container.clientHeight, 1);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#f8faf8");

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(parsed.positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(parsed.colors, 3));
  geometry.computeBoundingSphere();

  const size = parsed.bounds.getSize(new THREE.Vector3());
  const maxSize = Math.max(size.x, size.y, size.z, 1);
  const material = new THREE.PointsMaterial({
    size: Math.max(maxSize / 420, 1.6),
    sizeAttenuation: true,
    vertexColors: true,
  });
  const points = new THREE.Points(geometry, material);
  scene.add(points);

  const grid = new THREE.GridHelper(maxSize * 1.2, 8, "#bdc9c8", "#e1e7e5");
  grid.position.y = -size.y / 2;
  scene.add(grid);

  const axes = new THREE.AxesHelper(maxSize * 0.28);
  axes.position.set(-size.x / 2, -size.y / 2, -size.z / 2);
  scene.add(axes);

  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, maxSize * 12);
  const initialPosition = new THREE.Vector3(maxSize * 0.95, maxSize * 0.78, maxSize * 1.2);
  camera.position.copy(initialPosition);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.screenSpacePanning = true;
  controls.minDistance = maxSize * 0.12;
  controls.maxDistance = maxSize * 5;
  controls.target.set(0, 0, 0);
  controls.update();

  const resizeObserver = new ResizeObserver(function () {
    const nextWidth = Math.max(container.clientWidth, 1);
    const nextHeight = Math.max(container.clientHeight, 1);
    renderer.setSize(nextWidth, nextHeight);
    camera.aspect = nextWidth / nextHeight;
    camera.updateProjectionMatrix();
  });
  resizeObserver.observe(container);

  pointViewer.renderer = renderer;
  pointViewer.scene = scene;
  pointViewer.camera = camera;
  pointViewer.controls = controls;
  pointViewer.resizeObserver = resizeObserver;
  pointViewer.initialView = {
    cameraPosition: initialPosition.clone(),
    target: new THREE.Vector3(0, 0, 0),
  };

  const animate = function () {
    pointViewer.frameId = window.requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  };
  animate();
}

function setPointViewerState(status, title, subtitle) {
  const stateNode = document.getElementById("point-viewer-state");
  const metaNode = document.getElementById("point-viewer-meta");
  const resetButton = document.getElementById("point-viewer-reset");
  if (stateNode) {
    stateNode.className = "point-viewer-state point-viewer-state-" + status;
    stateNode.style.display = "";
    stateNode.innerHTML = "<strong>" + escapeHtml(title) + "</strong><span>" + escapeHtml(subtitle || "") + "</span>";
  }
  if (metaNode) {
    metaNode.innerHTML = "<strong>三维预览</strong><span>" + escapeHtml(title) + "</span>";
  }
  if (resetButton) {
    resetButton.disabled = true;
  }
}

function setPointViewerMeta(parsed) {
  const stateNode = document.getElementById("point-viewer-state");
  const metaNode = document.getElementById("point-viewer-meta");
  const resetButton = document.getElementById("point-viewer-reset");
  if (stateNode) {
    stateNode.style.display = "none";
  }
  if (metaNode) {
    metaNode.innerHTML =
      "<strong>" +
      formatNumber(parsed.pointCount) +
      " 点</strong><span>" +
      escapeHtml(
        colorModeText[parsed.colorMode] +
          " / " +
          parsed.schemaText +
          (parsed.skippedRows > 0 ? " / 跳过 " + parsed.skippedRows + " 行" : ""),
      ) +
      "</span>";
  }
  if (resetButton) {
    resetButton.disabled = false;
  }
}

function resetPointViewer() {
  if (!pointViewer.camera || !pointViewer.controls || !pointViewer.initialView) {
    return;
  }
  pointViewer.camera.position.copy(pointViewer.initialView.cameraPosition);
  pointViewer.controls.target.copy(pointViewer.initialView.target);
  pointViewer.controls.update();
}

function disposePointViewer() {
  if (pointViewer.abortController) {
    pointViewer.abortController.abort();
    pointViewer.abortController = null;
  }
  disposePointViewerScene();
}

function disposePointViewerScene() {
  if (pointViewer.frameId !== null) {
    window.cancelAnimationFrame(pointViewer.frameId);
    pointViewer.frameId = null;
  }

  if (pointViewer.resizeObserver) {
    pointViewer.resizeObserver.disconnect();
    pointViewer.resizeObserver = null;
  }

  if (pointViewer.controls) {
    pointViewer.controls.dispose();
    pointViewer.controls = null;
  }

  if (pointViewer.scene) {
    pointViewer.scene.traverse(function (object) {
      if (object.geometry) {
        object.geometry.dispose();
      }
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach(function (material) {
            material.dispose();
          });
        } else {
          object.material.dispose();
        }
      }
    });
  }

  if (pointViewer.renderer) {
    pointViewer.renderer.dispose();
    pointViewer.renderer.domElement.remove();
  }

  pointViewer.renderer = null;
  pointViewer.scene = null;
  pointViewer.camera = null;
  pointViewer.initialView = null;
}

function parsePointCloudText(text, fieldSchema) {
  const rows = text.split(/\r?\n/);
  const positions = [];
  const labels = [];
  const rgbValues = [];
  let skippedRows = 0;
  let schema = null;
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;

  rows.forEach(function (row) {
    const trimmed = row.trim();
    if (!trimmed) {
      return;
    }

    const columns = trimmed.split(/[\s,]+/);
    if (!schema) {
      schema = inferSchema(columns.length, fieldSchema);
    }
    if (!schema || columns.length <= Math.max(schema.x, schema.y, schema.z)) {
      skippedRows += 1;
      return;
    }

    const x = Number(columns[schema.x]);
    const y = Number(columns[schema.y]);
    const z = Number(columns[schema.z]);
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
      skippedRows += 1;
      return;
    }

    positions.push(x, y, z);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    minZ = Math.min(minZ, z);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    maxZ = Math.max(maxZ, z);

    if (schema.label !== undefined && columns[schema.label] !== undefined) {
      labels.push(columns[schema.label]);
    }

    if (schema.r !== undefined && schema.g !== undefined && schema.b !== undefined) {
      rgbValues.push(Number(columns[schema.r]), Number(columns[schema.g]), Number(columns[schema.b]));
    }
  });

  const pointCount = positions.length / 3;
  const centeredPositions = new Float32Array(positions.length);
  const colors = new Float32Array(positions.length);
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const centerZ = (minZ + maxZ) / 2;
  const hasLabel = labels.length === pointCount;
  const hasRgb = rgbValues.length === pointCount * 3;
  const colorMode = hasLabel ? "label" : hasRgb ? "rgb" : "height";
  const labelIndex = new Map();
  const zRange = Math.max(maxZ - minZ, 1);

  for (let index = 0; index < pointCount; index += 1) {
    const positionIndex = index * 3;
    const x = positions[positionIndex];
    const y = positions[positionIndex + 1];
    const z = positions[positionIndex + 2];
    centeredPositions[positionIndex] = x - centerX;
    centeredPositions[positionIndex + 1] = z - centerZ;
    centeredPositions[positionIndex + 2] = -(y - centerY);

    if (colorMode === "label") {
      const label = labels[index];
      if (!labelIndex.has(label)) {
        labelIndex.set(label, labelIndex.size);
      }
      const color = labelPalette[(labelIndex.get(label) || 0) % labelPalette.length];
      colors[positionIndex] = color.r;
      colors[positionIndex + 1] = color.g;
      colors[positionIndex + 2] = color.b;
    } else if (colorMode === "rgb") {
      colors[positionIndex] = normalizeRgb(rgbValues[positionIndex]);
      colors[positionIndex + 1] = normalizeRgb(rgbValues[positionIndex + 1]);
      colors[positionIndex + 2] = normalizeRgb(rgbValues[positionIndex + 2]);
    } else {
      const color = heightGradient((z - minZ) / zRange);
      colors[positionIndex] = color.r;
      colors[positionIndex + 1] = color.g;
      colors[positionIndex + 2] = color.b;
    }
  }

  return {
    positions: centeredPositions,
    colors: colors,
    bounds: new THREE.Box3(
      new THREE.Vector3(minX - centerX, minZ - centerZ, -(maxY - centerY)),
      new THREE.Vector3(maxX - centerX, maxZ - centerZ, -(minY - centerY)),
    ),
    colorMode: colorMode,
    schemaText: schema ? schema.schemaText : "x y z",
    pointCount: pointCount,
    skippedRows: skippedRows,
  };
}

function inferSchema(columnCount, fieldSchema) {
  if (fieldSchema && fieldSchema.length) {
    const x = fieldSchema.indexOf("x");
    const y = fieldSchema.indexOf("y");
    const z = fieldSchema.indexOf("z");
    if (x >= 0 && y >= 0 && z >= 0 && Math.max(x, y, z) < columnCount) {
      const r = fieldSchema.indexOf("r");
      const g = fieldSchema.indexOf("g");
      const b = fieldSchema.indexOf("b");
      const label = fieldSchema.indexOf("label");
      return {
        x: x,
        y: y,
        z: z,
        r: r >= 0 && r < columnCount ? r : undefined,
        g: g >= 0 && g < columnCount ? g : undefined,
        b: b >= 0 && b < columnCount ? b : undefined,
        label: label >= 0 && label < columnCount ? label : undefined,
        schemaText: fieldSchema.filter(function (_, index) {
          return index < columnCount;
        }).join(" "),
      };
    }
  }

  if (columnCount >= 7) {
    return { x: 0, y: 1, z: 2, r: 3, g: 4, b: 5, label: 6, schemaText: "x y z r g b label" };
  }
  if (columnCount === 6) {
    return { x: 0, y: 1, z: 2, r: 3, g: 4, b: 5, schemaText: "x y z r g b" };
  }
  if (columnCount === 4) {
    return { x: 0, y: 1, z: 2, label: 3, schemaText: "x y z label" };
  }
  if (columnCount === 3) {
    return { x: 0, y: 1, z: 2, schemaText: "x y z" };
  }
  return null;
}

function normalizeRgb(value) {
  if (!Number.isFinite(value)) {
    return 0.62;
  }
  return THREE.MathUtils.clamp(value / 255, 0, 1);
}

function heightGradient(ratio) {
  if (ratio < 0.5) {
    return new THREE.Color("#315f90").lerp(new THREE.Color("#2a8a74"), ratio * 2);
  }
  return new THREE.Color("#2a8a74").lerp(new THREE.Color("#c49a3a"), (ratio - 0.5) * 2);
}

function handleDialogSubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);

  if (state.dialogKind === "cow-basic") {
    state.data.cows.unshift({
      cowNo: readText(formData, "cowNo"),
      cowName: readText(formData, "cowName"),
      breed: readText(formData, "breed"),
      gender: readText(formData, "gender") || "未知",
      birthDate: readText(formData, "birthDate"),
      farmName: readText(formData, "farmName"),
      penNo: readText(formData, "penNo"),
      status: "正常",
      remark: readText(formData, "remark"),
    });
  } else if (state.dialogKind === "dataset") {
    state.data.datasets.unshift({
      id: "DS-PROTO-" + Date.now(),
      cowNo: readText(formData, "cowNo"),
      datasetCode: readText(formData, "datasetCode"),
      datasetUrl: readText(formData, "datasetUrl"),
      collectedAt: readText(formData, "collectedAt"),
      fileCount: Number(readText(formData, "fileCount")) || 0,
      status: "normal",
    });
  } else if (state.dialogKind === "point-cloud") {
    state.data.pointClouds.unshift({
      id: "PC-PROTO-" + Date.now(),
      cowNo: readText(formData, "cowNo"),
      pointCloudNo: readText(formData, "pointCloudNo"),
      fileName: readText(formData, "fileName"),
      filePath: "assets/point-cloud/" + readText(formData, "fileName"),
      fileUrl: "",
      fileFormat: extensionOf(readText(formData, "fileName")) || "TXT",
      fileSizeMb: Number(readText(formData, "fileSizeMb")) || 0,
      pointCount: Number(readText(formData, "pointCount")) || 0,
      fieldSchema: ["x", "y", "z", "r", "g", "b", "label"],
      labelCount: 10,
      processedAt: new Date().toLocaleString("zh-CN", { hour12: false }),
      labelStats: [
        { label: "label 0", ratio: 33.5 },
        { label: "label 5", ratio: 24.1 },
        { label: "label 7", ratio: 13.4 },
        { label: "label 9", ratio: 9.8 },
      ],
    });
  } else if (state.dialogKind === "image") {
    const measurementValue = readText(formData, "measurementValue");
    const imageType = readText(formData, "imageType") || "眼肌图";
    state.data.images.unshift({
      id: "IMG-PROTO-" + Date.now(),
      cowNo: readText(formData, "cowNo"),
      imageType: imageType,
      fileName: readText(formData, "fileName"),
      fileUrl: imageType === "背膘图" ? "assets/backfat-1.png" : "assets/eye-muscle-1.png",
      measurement: measurementValue,
      metricLabel: imageType === "背膘图" ? "背膘厚度" : "眼肌面积",
      metricValue: measurementValue,
      annotatedAt: readText(formData, "annotatedAt"),
      status: "normal",
    });
  }

  state.dialogKind = null;
  renderApp();
}

function readText(formData, key) {
  return String(formData.get(key) || "").trim();
}

function extensionOf(fileName) {
  const parts = fileName.split(".");
  return parts.length > 1 ? parts.pop().toUpperCase() : "";
}

function updateClock() {
  const clock = document.getElementById("clock");
  if (clock) {
    clock.textContent = new Date().toLocaleTimeString("zh-CN", { hour12: false });
  }
}

function startClock() {
  updateClock();
  window.setInterval(updateClock, 1000);
}

document.addEventListener("DOMContentLoaded", function () {
  startClock();
  renderApp();
});
