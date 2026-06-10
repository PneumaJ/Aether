# Aether — 桌面半透明悬浮计划组件

## 项目概述
轻量、简洁、好用的桌面半透明悬浮小组件，用于列出每日计划和完成情况。

## 技术栈

| 层 | 选型 | 说明 |
|----|------|------|
| 桌面壳 | Tauri v2 | ~5MB 起步，Rust 后端，原生透明无边框窗口 |
| 前端 | React 18 + Tailwind CSS | 组件化 + 毛玻璃效果 (backdrop-blur) |
| 状态管理 | Zustand | 轻量状态管理 |
| 本地存储 | SQLite (tauri-plugin-sql) | 结构化存储，按天分组查询 |

## 数据模型

表: plans
- id: INTEGER PRIMARY KEY
- date: TEXT (YYYY-MM-DD)
- content: TEXT
- done: BOOLEAN (default false)
- sort_order: INTEGER

## 核心技术点

1. **无边框透明窗口**: Tauri windowConfig → `transparent: true`, `decorations: false`
2. **毛玻璃效果**: CSS `rgba(255,255,255,0.15)` + `backdrop-filter: blur(12px)`
3. **窗口置顶 + 拖拽**: `alwaysOnTop: true` + `-webkit-app-region: drag`
4. **系统托盘**: 关闭 → 最小化到托盘而非退出

## 打包体积目标
~8-15MB
