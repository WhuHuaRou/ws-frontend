# 前端架构说明

## 目标

当前前端先作为“数据展示与后续接口接入”的基础骨架。业务字段未最终确定时，页面优先稳定布局、数据模型和模块边界，后续再把 `mocks` 替换为若依后端接口。

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
  pages/               页面入口
  types/               业务数据类型
```

## 当前页面

`src/pages/DataDisplayPage.tsx` 是预留的数据展示页面，已经包含：

- 关键指标区。
- 指标筛选。
- 实时传感器数据表。
- 温湿度趋势图。
- 今日重点任务。
- 加载、空数据、错误状态。

## 接口接入方式

当前 `src/api/dashboard.ts` 会在没有 `VITE_API_BASE_URL` 时读取 mock 数据。后续接入后端时，在 `.env.development` 中设置：

```text
VITE_API_BASE_URL=http://localhost:8080
```

然后让后端提供：

```text
GET /dashboard/overview
```

返回结构可以是若依标准：

```json
{
  "code": 200,
  "msg": "操作成功",
  "data": {}
}
```

也可以直接返回页面所需的数据对象。页面模型定义在 `src/types/dashboard.ts`。
