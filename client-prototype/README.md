# 整牛多模态数据原型 - 驾驶舱

纯前端原型，不依赖后端，使用原生 HTML/CSS/JS 实现。

## 文件结构

```
client-prototype/
├── index.html       # 入口页面
├── styles.css       # 全部样式（深色驾驶舱风格）
├── mock-data.js     # Mock 数据（牛只、数据集、点云、图像、视频等）
├── app.js           # 渲染逻辑
└── assets/          # 静态资源
    ├── cattle-digital-twin.png
    ├── eye-muscle-1.png
    └── backfat-1.png
```

## 运行方式

直接在浏览器中打开 `index.html` 即可演示。

## 部署

如果部署到 GitHub Pages，可以访问：

```
https://WhuHuaRou.github.io/ws-frontend/client-prototype/
```

## Mock 数据

包含 3 头牛只的完整多模态数据：
- 牛只档案（编号、品种、栏位、状态）
- 数据集（采集时间、文件数量）
- 点云数据（点数、文件大小、标签分布）
- 图像标注（眼肌图、背膘图及测量值）
- 实时视频流（摄像头、播放地址）
- 视频备份（归档时间段、大小）

## 模块说明

| 模块 | 表名 | 说明 |
|------|------|------|
| 牛只档案 | cow_basic | 牛编号、栏位、品种、状态 |
| 数据集 | cow_dataset | 文件采集记录 |
| 点云数据 | cow_point_cloud | TXT 点云文件 |
| 图像标注 | cow_image | 眼肌图、背膘图 |
| 实时视频 | video_stream_access | RTSP 流 |
| 视频备份 | video_archive_segment | 小时分段备份 |

## 功能特性

- 实时时钟显示
- 六模块 KPI 指标面板
- 数字孪生主视觉（旋转轨道动画）
- 从总览进入六模块工作台
- 牛只档案检索
- 点云字段说明与 label 分布展示
- 图像、视频、备份卡片与表格展示
- 新增牛只、数据集、点云、图像的前端 mock 弹窗
- 响应式布局
