# 前端架构说明

## 目标

当前前端先作为“牛只多模态数据展示与后续接口接入”的基础骨架。业务围绕 `cow_no` 牛编号组织，页面优先稳定牛只主档、数据集、点云、图片标注、实时视频和视频备份的模块边界，后续再把 `mocks` 替换为若依后端接口。

## 技术路线

- Vite + React + TypeScript：负责应用开发、类型约束和构建。
- CSS 变量 + 模块化目录：当前不依赖 UI 组件库，方便在依赖安装前直接维护页面。
- API 适配层：`src/api` 统一承接 mock 或后端 REST API。
- Mock 数据层：`src/mocks` 存放展示数据，后续可逐步删除。

## 目录职责

```text
src/
  api/                 接口适配层，后续统一处理若依返回结构
  components/
    layout/            页面框架、侧边栏、顶部栏
    ui/                可复用展示组件
  lib/                 格式化、状态映射、通用工具
  mocks/               演示数据
  pages/               页面入口，按业务模块拆分文件夹
    data-display/      当前轻量模块切换容器，后续可替换为路由入口
    cow-basic/         牛只主档分界面
    dataset/           数据集分界面
    point-cloud/       点云数据分界面
    image-annotation/  图片标注分界面
    live-video/        实时视频分界面
    video-archive/     视频备份分界面
  types/               业务数据类型
```

## 当前页面

`src/pages/data-display/index.tsx` 当前只作为轻量模块切换容器，不作为最终主界面。现阶段优先建设各个分界面：

- 牛只基础档案。
- 牛只数据集。
- 点云文件台账，文件名即点云号，字段结构为 `x/y/z/r/g/b/label`，字段按钮可点击查看含义。
- 图片与标注结果。
- 实时视频访问。
- 实时视频与每小时备份分段。
- 加载、空数据、错误状态。

## 点云页面约定

`point-cloud/` 分界面按甲方口径处理点云数据：

- 一个点云文件对应一条点云记录。
- 文件名就是点云号，例如 `PCL-240317-09A.ply`。
- 页面展示文件名、文件路径、文件格式、点数量、文件大小。
- 页面不展示坐标系字段。
- `x`、`y`、`z`、`r`、`g`、`b`、`label` 是可点击字段按钮，点击后展示字段含义。
- `label` 统计只是点云文件的附属统计，不再设计“点云集”层级。

## 接口接入方式

当前 `src/api/dashboard.ts` 会在没有 `VITE_API_BASE_URL` 时读取 mock 数据。后续接入后端时，在 `.env.development` 中设置：

```text
VITE_API_BASE_URL=http://localhost:8080
```

然后让后端提供：

```text
GET /cow/dashboard/overview
```

返回结构可以是若依标准：

```json
{
  "code": 200,
  "msg": "操作成功",
  "data": {}
}
```

也可以直接返回页面所需的数据对象。页面模型定义在 `src/types/dashboard.ts`，核心字段与 `database-design.md` 中的 `cow_basic`、`cow_dataset`、`cow_point_cloud`、`cow_image`、`video_stream_access`、`video_archive_segment` 对齐。
