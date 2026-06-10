# 对话上下文 — Aether 项目初始化 — 骨架搭建已完成

> **生成时间**: 2026-06-10
> **会话状态**: 项目骨架代码全部完成，等待 Rust 安装后进行构建验证
> **快速恢复**: 将此文档内容作为新对话的第一条消息发送给 Claude，即可恢复上下文

---

## 📋 问题背景

### 项目信息
- **项目名称**: Aether
- **项目路径**: `[项目根目录]`
- **项目定位**: 轻量、简洁、好用的桌面半透明悬浮小组件，用于列出每日计划和完成情况
- **当前状态**: 项目骨架搭建完成（33个源文件），前端依赖已安装，TypeScript 类型检查零错误，等待 Rust 环境就绪后构建运行

### 技术栈
| 层 | 选型 | 版本 |
|----|------|------|
| 桌面壳 | Tauri v2 | ^2.0.0 |
| 前端框架 | React 18 + TypeScript | ^18.3.1 |
| 构建工具 | Vite 5 | ^5.4.0 |
| CSS | Tailwind CSS v4 (Vite 插件) | ^4.0.0 |
| 状态管理 | Zustand | ^4.5.0 |
| 本地存储 | SQLite (tauri-plugin-sql) | ^2.0.0 |
| 工具库 | clsx + tailwind-merge | ^2.x |

### 数据模型
```sql
CREATE TABLE plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,       -- YYYY-MM-DD
    content TEXT NOT NULL,
    done INTEGER DEFAULT 0,   -- 0/1 boolean
    sort_order INTEGER DEFAULT 0
);
```

---

## 🔴 核心问题

**需要从头搭建一个完整的 Tauri v2 + React 18 桌面应用**，包含以下核心技术点：
1. 无边框透明窗口（`decorations: false`, `transparent: true`）
2. 毛玻璃 UI 效果（`backdrop-filter: blur(12px)`，含 GPU 降级策略）
3. 窗口始终置顶（`alwaysOnTop: true`）
4. 关闭按钮隐藏到系统托盘（而非退出进程）
5. 系统托盘左键切换显隐、右键菜单（Show / Quit）
6. SQLite 本地持久化，按日期分组查询

---

## 🎯 实现目标

### 主要目标
- 搭建可编译运行的 Tauri v2 + React + TypeScript 项目
- 实现透明毛玻璃悬浮窗 UI
- 实现计划 CRUD（增删改查 + 完成切换）
- 实现按日期分组导航（前一天/今天/后一天）
- 系统托盘集成（关闭隐藏 / 托盘菜单退出）

### 具体要求
- 打包体积 8-15MB
- 乐观更新：UI 即时响应，DB 异步落盘
- 组件分层清晰：Component → Hook → Store → DB
- 中文友好（字体含 PingFang SC / Microsoft YaHei）

### 约束条件
- 操作系统: Windows 10 Pro
- 包管理器: pnpm
- 对话中无法执行 `pnpm create tauri-app`（交互式 CLI），故采用手动创建方案

---

## 🔧 技术约束

### 必须遵守的原则
1. **数据流单向分层**: Component → Hook → Store → DB 层（组件不直接调 Store 或 DB）
2. **乐观更新**: Zustand store 先更新 state，DB 层异步写入（失败时不回滚 UI）
3. **SQL 参数化查询**: 全部使用 `$1, $2` 占位符，禁止字符串拼接
4. **DB 单例**: `database.ts` 是唯一导入 `@tauri-apps/plugin-sql` 的模块
5. **关闭≠退出**: Rust 层 `CloseRequested` → `prevent_close()` + `hide()`，`ExitRequested` → `prevent_exit()`
6. **Tailwind v4**: 使用 `@tailwindcss/vite` 插件，无 PostCSS / tailwind.config.js

### 关键文件
| 文件 | 作用 | 优先级 |
|------|------|--------|
| `src-tauri/tauri.conf.json` | 窗口配置（透明/无边框/置顶/托盘） | 🔴 核心 |
| `src-tauri/src/lib.rs` | Rust 后端：SQL 迁移、托盘、窗口事件 | 🔴 核心 |
| `src-tauri/capabilities/default.json` | Tauri v2 权限声明 | 🔴 核心 |
| `src/db/database.ts` | SQLite CRUD 单例 | 🟡 重要 |
| `src/stores/planStore.ts` | 计划状态 + 乐观更新 actions | 🟡 重要 |
| `src/stores/uiStore.ts` | UI 状态（日期、加载态） | 🟢 一般 |
| `src/index.css` | Tailwind 导入 + 玻璃主题 + 降级策略 | 🟡 重要 |
| `src/hooks/usePlans.ts` | 编排 hook（store + DB 同步） | 🟡 重要 |
| `src/hooks/useWindow.ts` | Tauri 窗口控制封装 | 🟢 一般 |

---

## 🚫 已尝试的方案

> 无失败方案。本项目为绿色字段（Greenfield）项目，从头搭建。

### 方案调研阶段（已完成）
- **调研了 Tauri v2 脚手架 CLI**: 使用 `pnpm create tauri-app` 可交互式创建项目，但对话中无法执行交互命令，改用手动精确创建所有文件
- **调研了 Tailwind v4 配置**: 确认 v4 使用 `@tailwindcss/vite` 插件，无需 PostCSS 和 tailwind.config.js
- **调研了 tauri-plugin-sql**: 确认使用 Migration API 初始化表，前端通过 `Database.load("sqlite:aether.db")` 连接

---

## ✅ 当前方案/最终方案

### 架构设计

```
┌──────────────────────────────────────────┐
│  React Components (6 个功能组件)         │
│  Titlebar / AppShell / DateGroup         │
│  PlanList / PlanItem / AddPlan           │
├──────────────────────────────────────────┤
│  Custom Hooks (2 个)                     │
│  usePlans (数据编排) / useWindow (窗口)  │
├──────────────────────────────────────────┤
│  Zustand Stores (2 个)                   │
│  planStore (乐观更新) / uiStore (UI状态) │
├──────────────────────────────────────────┤
│  DB Layer (database.ts)                  │
│  fetchPlansByDate / insertPlan           │
│  updatePlan / deletePlan                 │
├──────────────────────────────────────────┤
│  tauri-plugin-sql → SQLite (aether.db)   │
└──────────────────────────────────────────┘

Rust Backend (lib.rs):
├── SQLite 迁移 (version 1: CREATE TABLE plans)
├── 系统托盘 (左键切换显隐 / 右键 Show|Quit)
├── 窗口事件 (CloseRequested → hide to tray)
└── 退出拦截 (ExitRequested → prevent_exit)
```

### 核心机制

**1. 毛玻璃降级策略**
```css
/* 默认（GPU 不支持 backdrop-filter） */
.glass-shell {
  background: rgba(30, 30, 30, 0.55);
}
/* GPU 支持时使用毛玻璃 */
@supports (backdrop-filter: blur(12px)) {
  .glass-shell {
    background: rgba(255, 255, 255, 0.12);
    backdrop-filter: blur(12px) saturate(1.2);
  }
}
```

**2. 关闭到托盘流程**
```
用户点击关闭按钮 → appWindow.close()
  → JS 触发 Tauri close 事件
  → Rust WindowEvent::CloseRequested
  → api.prevent_close() + window.hide()
  → 窗口隐藏，进程保持（托盘图标活跃）
  → 用户左键托盘 → window.show() + set_focus()
```

**3. 乐观更新流程**
```
用户操作 → Store 方法调用
  ├── 1. set() 立即更新 React state → UI 刷新
  └── 2. await DB 操作 → 异步持久化
      （失败时静默忽略，不回滚 UI）
```

### 组件树
```
<App>
  <AppShell>              ← 毛玻璃容器
    <Titlebar />          ← 拖拽区域 + ─ ✕ 按钮
    <DateGroup />         ← ◀ 日期  ▶ 导航
    <PlanList>            ← 可滚动列表 (空状态提示)
      <PlanItem />        ← □ 复选框 + 文本(双击编辑) + ✕ 删除
    </PlanList>
    <AddPlan />           ← 底部输入框
  </AppShell>
</App>
```

---

## 📝 关键代码变更

### 已创建文件清单（33个）

| 类别 | 文件 | 行数(估) |
|------|------|----------|
| **根配置** | `package.json` | 35 |
| | `vite.config.ts` | 25 |
| | `tsconfig.json` | 22 |
| | `tsconfig.node.json` | 15 |
| | `index.html` | 17 |
| | `.prettierrc` | 7 |
| | `.gitignore` | 19 |
| **Tauri** | `src-tauri/Cargo.toml` | 26 |
| | `src-tauri/tauri.conf.json` | 46 |
| | `src-tauri/capabilities/default.json` | 22 |
| | `src-tauri/src/lib.rs` | 94 |
| | `src-tauri/src/main.rs` | 5 |
| | `src-tauri/build.rs` | 3 |
| **前端核心** | `src/main.tsx` | 10 |
| | `src/App.tsx` | 15 |
| | `src/index.css` | 119 |
| | `src/vite-env.d.ts` | 1 |
| **类型** | `src/types/plan.ts` | 18 |
| **工具** | `src/lib/cn.ts` | 7 |
| **DB** | `src/db/database.ts` | 86 |
| **Store** | `src/stores/uiStore.ts` | 37 |
| | `src/stores/planStore.ts` | 69 |
| **Hook** | `src/hooks/useWindow.ts` | 20 |
| | `src/hooks/usePlans.ts` | 29 |
| **组件** | `src/components/layout/AppShell.tsx` | 10 |
| | `src/components/layout/Titlebar.tsx` | 30 |
| | `src/components/plan/DateGroup.tsx` | 45 |
| | `src/components/plan/PlanList.tsx` | 28 |
| | `src/components/plan/PlanItem.tsx` | 99 |
| | `src/components/plan/AddPlan.tsx` | 38 |
| | `src/components/common/IconButton.tsx` | 21 |
| **图标** | `src-tauri/icons/tray-icon.png` | 162B |
| | `public/tray-icon.png` | 162B |

### 关键配置摘要

**tauri.conf.json 窗口配置**:
```json
{
  "decorations": false,    // 无原生标题栏
  "transparent": true,     // 透明背景
  "alwaysOnTop": true,     // 窗口置顶
  "shadow": false,         // 无原生阴影（CSS 玻璃效果替代）
  "width": 380,            // 默认宽度
  "height": 560,           // 默认高度
  "minWidth": 300,         // 最小宽度
  "minHeight": 400         // 最小高度
}
```

**Cargo.toml 关键依赖**:
```toml
tauri = { version = "2", features = ["tray-icon"] }
tauri-plugin-sql = { version = "2", features = ["sqlite"] }
```

---

## 🎯 当前进度

### 已完成 ✅
| 阶段 | 内容 | 状态 |
|------|------|------|
| P1 | 项目骨架手动搭建（33个源文件） | ✅ |
| P2 | Tauri 后端配置（config / capabilities / Rust） | ✅ |
| P3 | 前端基础（Tailwind / 类型 / DB 层） | ✅ |
| P4 | Zustand stores（planStore / uiStore） | ✅ |
| P5 | Custom hooks（useWindow / usePlans） | ✅ |
| P6 | React 组件（6个功能组件 + 1个通用组件） | ✅ |
| P7 | 构建优化配置（[profile.release] / Vite tweaks） | ✅ |
| --- | **前端依赖安装（pnpm install）** | ✅ |
| --- | **TypeScript 类型检查** | ✅ 零错误 |

### 进行中 🔄
- 无（等待 Rust 安装后进入构建验证阶段）

### 待处理 ⬜
| 项目 | 说明 |
|------|------|
| **P0: 安装 Rust** | 用户需手动执行 `winget install Rustlang.Rustup` |
| **生成应用图标** | `pnpm tauri icon` 从 1024x1024 源图生成全平台图标（需 Rust） |
| **Tauri 编译验证** | `pnpm tauri dev` 启动开发模式（需 Rust） |
| **功能测试** | 在开发模式下验证全部交互 |
| **打包构建** | `pnpm tauri build` 生成 MSI（需 Rust） |

---

## 💡 使用方法

### 新对话恢复上下文
将本文档的**全部内容**复制，作为新对话的第一条消息发送给 Claude，附上：
> "请阅读这份对话上下文文档，了解 Aether 项目的当前状态，然后继续推进剩余工作。"

### 环境准备（当前待执行）
```bash
# 1. 安装 Rust（必须！）
winget install Rustlang.Rustup
# 重启终端后验证：
rustc --version
cargo --version

# 2. 安装前端依赖（已完成，无需重复）
cd [项目根目录]
pnpm install

# 3. 生成应用图标（需先有 1024x1024 源图放入 src-tauri/icons/icon.png）
pnpm tauri icon src-tauri/icons/icon.png

# 4. 启动开发模式
pnpm tauri dev

# 5. 构建发布包
pnpm tauri build
```

### 开发命令
| 命令 | 说明 |
|------|------|
| `pnpm dev` | 仅启动 Vite 前端（无 Tauri 窗口） |
| `pnpm tauri dev` | 启动 Vite + Tauri 窗口 |
| `pnpm build` | 仅构建前端（tsc + vite build） |
| `pnpm tauri build` | 构建完整 MSI 安装包 |
| `npx tsc --noEmit` | TypeScript 类型检查 |

### 关键注意事项

1. **Rust 是硬依赖**: 所有 `pnpm tauri *` 命令都需要 Rust 工具链
2. **WebView2 Runtime**: Windows 10+ 自带，无需额外安装
3. **Tauri v2 tray-icon feature**: `Cargo.toml` 中必须显式声明，否则 `TrayIconBuilder` 不可用
4. **DB URL 一致性**: `lib.rs` 和 `database.ts` 中的 `DB_URL` 必须相同 (`"sqlite:aether.db"`)
5. **权限声明**: `capabilities/default.json` 中需显式声明每个 `sql:allow-*` 和 `core:window:allow-*` 权限
6. **esbuild**: 首次运行 `pnpm install` 后需 `pnpm approve-builds esbuild` 批准 postinstall 脚本

---

## 🐛 已知问题和待解决

### 当前问题
1. **Rust 未安装**: 环境变量中无 `rustc` / `cargo`，所有 Tauri 命令无法执行
2. **应用图标未生成**: 需要一张 1024x1024 PNG 源图标，然后运行 `pnpm tauri icon` 生成全平台图标
3. **Tauri CLI 尚未安装 Rust 依赖**: `src-tauri/` 下的 Cargo 依赖（tauri、tauri-plugin-sql 等）需要通过 `cargo build` 下载编译

### 潜在风险
1. **backdrop-filter 兼容性**: 部分老旧 GPU / 虚拟机可能不支持，已通过 `@supports` 降级处理
2. **Windows 透明窗口**: Tauri v2 在 Windows 上使用 `transparent: true` 可能有边缘渲染问题
3. **Tauri plugin-sql 迁移表**: 插件内部使用 `_sqlx_migrations` 表追踪迁移版本，需确认其创建逻辑

---

## 🚀 下一步计划

### 第1步（用户操作）
```bash
winget install Rustlang.Rustup
```

### 第2步（用户告知 Claude 后继续）
```bash
# 下载 Rust 依赖并首次编译（可能需 5-15 分钟）
cd [项目根目录]
pnpm tauri dev
```

### 第3步（功能验证）
- [ ] 透明毛玻璃窗口是否正常显示
- [ ] 添加计划 → 切换完成 → 编辑 → 删除
- [ ] 日期导航（前一天/后一天/今天）
- [ ] 拖拽标题栏移动窗口
- [ ] 关闭窗口 → 系统托盘图标存在 → 左键/右键托盘交互
- [ ] 窗口大小约束（min 300x400）

### 第4步（发布）
- [ ] 准备 1024x1024 应用图标
- [ ] `pnpm tauri build` 生成 MSI
- [ ] 在干净环境测试安装包

---

## 📝 备注

### 开发心得
- **手动创建优于脚手架**: 对于有明确架构设计的项目，手动创建所有文件比 `create-tauri-app` 更精准，避免大量脚手架修改
- **Tailwind v4 Vite 插件**: 比 v3 的 PostCSS 方案简洁得多，`@import "tailwindcss"` 一行搞定
- **Tauri v2 的 tray-icon feature**: 这是一个容易遗漏的点，未启用时 `TrayIconBuilder` 完全无法使用
- **乐观更新心智模型**: Zustand store 先 set 后 await DB，失败时不回滚。这对于本地 SQLite（几乎不会失败）是合理的简化

### 参考资料
- [Tauri v2 窗口自定义](https://tauri.app/learn/window-customization/)
- [Tauri v2 配置 Schema](https://schema.tauri.app/config/2)
- [tauri-plugin-sql 文档](https://v2.tauri.app/plugin/sql)
- [Tailwind CSS v4 文档](https://tailwindcss.com/docs/v4-beta)
- [Zustand 最佳实践](https://feature-sliced.design/blog/zustand-simple-state-guide)

### 项目标识
- **identifier**: `com.aether.desktop`
- **数据库文件**: `aether.db`（SQLite，位于 Tauri app data 目录）
