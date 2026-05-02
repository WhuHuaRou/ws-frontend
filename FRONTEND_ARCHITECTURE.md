# 前端架构说明

## 目标

当前前端先作为“牛只多模态数据展示与后续接口接入”的基础骨架。业务围绕 `cow_no` 牛编号组织，页面优先稳定牛只主档、数据集、点云、图片标注、实时视频和视频备份的模块边界，后续再把 `mocks` 替换为若依后端接口。

## 技术路线

- Vite + React + TypeScript：负责应用开发、类型约束和构建。
- CSS 变量 + 模块化目录：当前不依赖 UI 组件库，方便在依赖安装前直接维护页面。
- API 适配层：`src/api` 统一承接 mock 或后端 REST API。
- Mock 数据层：`src/mocks` 存放展示数据，后续可逐步删除。
- 原型静态资源：`front/public/prototype-data` 存放当前原型点云、眼肌图片和背膘图片，供浏览器直接访问。

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
- 眼肌与背膘展示，当前使用原型 PNG 图片，按 `眼肌图` 和 `背膘图` 分别展示眼肌面积或背膘厚度。
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

### 点云三维原型

当前前端已加入 Three.js 点云三维查看原型，示例文件放在：

```text
front/public/prototype-data/point-cloud/
```

原型阶段由 `src/mocks/dashboard.ts` 给每条点云记录提供 `fileUrl`，页面通过静态 URL 加载文本点云文件，例如：

```text
/ws-frontend/prototype-data/point-cloud/D67_3.txt
```

原始示例数据来自项目根目录：

```text
原型数据示例/dy/
```

点云页面只保留一个三维查看器。用户在左侧点云目录中查询、分页并选择点云，右侧展示当前选中点云的文件信息、三维预览和 label 统计。未选中的点云不会加载文件，避免一次性渲染多个大文件。

当前文本点云解析规则：

- 支持空格、Tab 或英文逗号分隔。
- 至少支持 `x y z` 三列。
- 支持 `x y z label`、`x y z r g b`、`x y z r g b label`。
- 有 `label` 时优先按 `label` 上色。
- 无 `label` 但有 `r g b` 时按 RGB 上色。
- 只有 `x y z` 时按 `z` 高度渐变上色。

后续接入后端时，不需要改页面渲染逻辑，只需要让后端点云元数据接口返回可访问的 `fileUrl`。该 URL 可以来自若依文件服务或专门的点云文件服务，前端继续按文本点云格式读取并渲染。

## 眼肌背膘页面约定

`image-annotation/` 分界面当前用于展示眼肌与背膘超声图。每条图片记录必须明确归类为 `眼肌图` 或 `背膘图`，不能用混合类型代替。原型图片放在：

```text
front/public/prototype-data/image-annotation/
```

原始示例数据来自项目根目录：

```text
原型数据示例/眼肌背膘数据示例/
```

页面由 `src/mocks/dashboard.ts` 提供 `fileUrl`、图片类型、对应指标和标注时间。`眼肌图` 记录只展示 `eyeMuscleAreaCm2`，`背膘图` 记录只展示 `backfatThicknessMm`。当前指标值仍是原型展示口径；后续接入真实算法或人工标注结果时，只需要替换 mock 或后端返回字段，页面继续按 `cow_image` 模型展示图片、文件名、状态和对应标注值。

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

## 原型新增能力

当前顶部主按钮中的 `新增数据集`、`导入点云`、`上传图片` 已接入原型弹窗。提交后只写入当前浏览器页面的 React 内存状态，用于演示新增交互和列表即时更新；刷新页面后会重新回到 `src/mocks/dashboard.ts` 的初始 mock 数据。

原型阶段的 `导入点云` 和 `上传图片` 使用浏览器文件选择框。用户先选择本地文件，再填写点云号或图片展示名称；页面通过 `URL.createObjectURL(file)` 生成临时访问地址，因此可以立即预览本次选择的点云或图片。

当前不会真正上传文件到磁盘，也不会写入后端数据库。临时文件 URL 只在当前浏览器页面生命周期内有效；刷新页面后，上传文件和新增记录都会丢失。后续接入后端时，应将文件上传到若依文件服务或专门的点云文件服务，再由接口返回持久化后的 `fileUrl`。

## GitHub Pages 部署

当前前端可以直接以静态站形式部署到 GitHub Pages。演示原型时不配置 `VITE_API_BASE_URL`，页面会自动使用 mock 数据。

发布前先在本地执行 `npm run build` 自检，确认通过后再推送到 GitHub。GitHub Actions 仍会执行 `npm install` 和 `npm run build`，构建通过后把生成的 `dist/` 作为 GitHub Pages artifact 上传。

构建命令中的 `tsc -b` 会执行严格类型检查。`tsconfig.node.json` 需要显式声明 `target` 和 `lib`，避免检查 Vite 配置及依赖类型时缺少 `Promise.finally`、`Iterable`、`Map`、`Set` 等现代 JavaScript 类型。

点云三维预览依赖 Three.js 及其 TypeScript 类型声明。部署环境会全新安装依赖后执行严格类型检查，因此 `package.json` 需要同时声明 `three` 和 `@types/three`，避免本地开发服务器可运行但 GitHub Pages 构建被 `tsc -b` 拦截。
