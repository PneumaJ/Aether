# 对话上下文 — Aether 项目完整上下文（公开版）

> **生成日期**：2026-06-11  
> **涵盖阶段**：项目初始化（骨架搭建）→ 设置窗口与系统功能 → UI 打磨与 Bug 修复 → 打包发布  
> **当前状态**：**已构建并打包为 NSIS/MSI 安装程序，核心功能全部完成，零已知 bug**

---

## 📋 项目概览

### 项目信息
| 项目 | 详情 |
|------|------|
| **名称** | Aether |
| **标识符** | `com.aether.desktop` |
| **类型** | Tauri v2 + React 18 + TypeScript 桌面应用 |
| **定位** | 轻量、简洁的半透明悬浮每日计划追踪器，毛玻璃美学，系统托盘驻留 |
| **平台** | Windows 10+ x64 |
| **技术栈** | Tauri v2.11.2、React 18、TypeScript 5、Tailwind CSS v4、Vite 5、Zustand、SQLite、dnd-kit |
| **包管理** | pnpm v10.33.0 |
| **开发命令** | `pnpm tauri dev` |
| **构建命令** | `pnpm tauri build` |

### 数据模型
```sql
CREATE TABLE plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,       -- YYYY-MM-DD
    content TEXT NOT NULL,
    done INTEGER DEFAULT 0,   -- 0/1 boolean
    sort_order INTEGER DEFAULT 0,
    is_daily INTEGER NOT NULL DEFAULT 0
);
```

---

## 🔴 核心问题（全部已解决）

| # | 问题 | 根因 | 解决方案 | 阶段 |
|---|------|------|----------|------|
| 1 | 从零搭建 Tauri v2 + React 项目 | 对话中无法执行交互式 CLI | 手动精确创建全部 33 个源文件 | 初始化 |
| 2 | 设置窗口无法唤出 | Tauri v2 中 `visible: false` 的配置窗口 webview 未正确初始化 | Rust `setup()` 中用 `WebviewWindowBuilder` 显式创建 | 设置 |
| 3 | 设置窗口关闭后所有操作无效 | 关闭窗口被销毁而非隐藏，后续 `getByLabel` 返回 null | `CloseRequested` 也拦截 settings 窗口，改为隐藏 | 设置 |
| 4 | 字体颜色设置不生效 | `@theme` 颜色值为编译时硬编码，不响应运行时 CSS 变量 | 改为 `var(--settings-font-color)` + `color-mix()` | 设置 |
| 5 | 托盘"显示 Aether"无法唤出窗口 | 缺少 `unminimize()` 调用 | 添加 `window.unminimize()` | 设置 |
| 6 | 右键/托盘"退出"无效 | `ExitRequested` 处理器无条件 `prevent_exit()` | 移除该处理器 | 设置 |
| 7 | 安装后报错找不到 WebView2Loader.dll | NSIS 打包器未自动包含该 DLL | `tauri.conf.json` 显式声明 resources | 打包 |
| 8 | 顶部 Resize 手柄与关闭按钮重叠 | 手柄覆盖按钮区域 | 边缘条 6px + 角方块 12×12，Titlebar z-[60] | 打磨 |
| 9 | 隐藏后重新显示，按钮 hover/active 状态残留 | CSS 伪类无法感知窗口显隐状态变化 | React `useState` + DOM 事件替代 CSS `:hover`/`:active`，失焦时清除状态 | 打磨 |
| 10 | 任务栏失焦后仍有图标 | 未调用 `setSkipTaskbar` | `useWindow.ts` 中 `onFocusChanged` 调用 `setSkipTaskbar(!focused)` | 打磨 |
| 11 | 最小化和关闭按钮功能冗余 | 两者都隐藏到托盘 | 移除关闭按钮，只保留"−"隐藏按钮 | 打磨 |
| 12 | 拖拽计划项向下导致窗口无限扩展 | dnd-kit `autoScroll` 默认启用 | `DndContext` 添加 `autoScroll={false}` | 打磨 |
| 13 | 窗口位置保存不准确 | ① JS `outerPosition()` 返回物理坐标但 Rust 用 `LogicalPosition` 恢复 ② `close()` 未 `await persistPosition()` 导致竞态 | ① Rust 改用 `PhysicalPosition` ② `close` 改为 async 并在隐藏前 await | 打磨 |
| 14 | 窗口大小未恢复 | 后端只恢复了位置未恢复大小 | Rust `setup()` 中添加 `set_size(PhysicalSize)` 且在 `set_position` 之前执行 | 打磨 |
| 15 | 背景图片选择器简陋 | 纯文本输入无浏览功能 | 重写为 `@tauri-apps/plugin-dialog` 文件对话框 + `<img>` 缩略图 + 路径省略号截断 | 打磨 |
| 16 | 设置界面字体大小被主窗口设置影响 | `applyCssSettings` 在每个 `updateSetting` 时将 CSS 变量写入设置窗口 DOM | ① SettingsApp `useEffect` 锁定 `documentElement.fontSize = "14px"` ② `applyCssSettings` 检测 webview label 非 "main" 时直接跳过 | 打磨 |
| 17 | 应用启动后非聚焦状态 | 未主动调用 `setFocus()` | `lib.rs` setup 中调用 `window.set_focus()` | 打磨 |
| 18 | 设置保存后不关闭 | 缺少关闭逻辑 | `handleSave` 中 `await save()` 后 `appWindow.close()` | 打磨 |

---

## 🎯 实现目标

### 阶段一：项目初始化（已完成）
- [x] 无边框透明窗口（`decorations: false`, `transparent: true`）
- [x] 毛玻璃 UI 效果（`backdrop-filter: blur(12px)`，含 GPU 降级策略）
- [x] 窗口始终置顶（`alwaysOnTop: true`）
- [x] 关闭按钮隐藏到系统托盘（而非退出进程）
- [x] 系统托盘左键切换显隐、右键菜单
- [x] SQLite 本地持久化，按日期分组查询
- [x] 计划 CRUD（增删改查 + 完成切换）
- [x] 日期导航（前一天/今天/后一天）
- [x] 组件分层：Component → Hook → Store → DB

### 阶段二：设置窗口与系统功能（已完成）
- [x] 设置窗口（从托盘右键或窗口右键打开）
- [x] 字体颜色、大小、背景透明度（聚焦/失焦）动态设置
- [x] 背景图片设置（文件对话框浏览、缩略图预览、路径省略号截断）
- [x] 鼠标穿透勾选
- [x] 记住窗口位置 + 大小
- [x] 开机自启
- [x] 窗口任意位置右键菜单（中文）
- [x] Resize 手柄（边缘条 6px + 角方块 12×12）
- [x] 设置修改实时生效
- [x] 打包为 Windows 安装程序（NSIS + MSI）

### 阶段三：UI 打磨与 Bug 修复（已完成）
- [x] 按钮 hover/active 状态残留（React state 替代 CSS 伪类）
- [x] 失焦时从任务栏隐藏（`setSkipTaskbar`）
- [x] 简化按钮：仅保留"−"隐藏到托盘
- [x] 拖拽无限扩展（`autoScroll={false}`）
- [x] 窗口位置坐标系统修正（PhysicalPosition + async close）
- [x] 窗口大小恢复（PhysicalSize before PhysicalPosition）
- [x] 背景图片完善（文件对话框 + 缩略图 + 路径截断）
- [x] 设置字体大小隔离（主窗口可变 / 设置窗口固定 14px）
- [x] 设置保存后关闭窗口
- [x] 启动默认聚焦

---

## 🏗️ 架构设计

### 数据流分层
```
┌──────────────────────────────────────────┐
│  React Components                        │
│  Titlebar / AppShell / DateGroup         │
│  PlanList / PlanItem / AddPlan           │
│  Settings App + 4 Settings Components    │
├──────────────────────────────────────────┤
│  Custom Hooks                            │
│  usePlans / useWindow / useSettings      │
│  useContextMenu                          │
├──────────────────────────────────────────┤
│  Zustand Stores (3 个)                   │
│  planStore / uiStore / settingsStore     │
├──────────────────────────────────────────┤
│  DB Layer (database.ts)                  │
│  SQLite CRUD (fetch/insert/update/delete)│
├──────────────────────────────────────────┤
│  Rust Backend                            │
│  commands.rs / settings.rs / lib.rs      │
└──────────────────────────────────────────┘
```

### 组件树（主窗口）
```
<App>
  <AppShell>              ← 毛玻璃容器
    <Titlebar />          ← 拖拽区域 + − 按钮
    <DateGroup />         ← ◀ 日期 ▶ 导航
    <PlanList>            ← 可滚动列表 (空状态提示)
      <PlanItem />        ← □ 复选框 + 文本(双击编辑) + ✕ 删除
    </PlanList>
    <AddPlan />           ← 底部输入框
  </AppShell>
</App>
```

### 多窗口架构
- **main** + **settings** 两个 webview，通过 label 路由
- settings 窗口由 Rust `setup()` 中用 `WebviewWindowBuilder` 显式创建（hidden）
- 关闭行为：主窗口和设置窗口的 X 按钮只隐藏不销毁
- 事件通信：`app://settings-changed` 全局事件在窗口间同步设置

---

## 🔧 技术约束与核心机制

### 必须遵守的原则
1. **数据流单向分层**: Component → Hook → Store → DB（组件不直接调 Store 或 DB）
2. **乐观更新**: Zustand store 先更新 state，DB 层异步写入（失败时不回滚 UI）
3. **SQL 参数化查询**: 全部使用 `$1, $2` 占位符，禁止字符串拼接
4. **DB 单例**: `database.ts` 是唯一导入 `@tauri-apps/plugin-sql` 的模块
5. **关闭≠退出**: Rust 层 `CloseRequested` → 隐藏窗口；设置窗口同理
6. **Tailwind v4**: 使用 `@tailwindcss/vite` 插件，无 PostCSS / tailwind.config.js

### 毛玻璃降级策略
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

### 设置窗口生命周期
```
Rust setup() → WebviewWindowBuilder 创建（hidden）
     ↓
用户右键/托盘 → getByLabel → show() + setFocus()
     ↓
用户点 X → CloseRequested → prevent_close() + hide()
     ↓
再次右键/托盘 → show() + setFocus()
```

### 设置实时生效机制
```
用户调整滑块 → updateSetting()
    ├── 本地 applyCssSettings()（即时视觉反馈，仅 main 窗口）
    └── invoke("save_settings", { persist: false })
         ├── Rust 端应用 click_through
         ├── emit("app://settings-changed") → 主窗口接收 → applyCssSettings()
         └── 不写磁盘

用户点保存 → save()
    └── invoke("save_settings", { persist: true })
         ├── 写入 aether_settings.json
         └── 处理 autostart
```

### 字体颜色动态化
```css
/* index.css @theme */
--color-glass-text: var(--settings-font-color);
--color-glass-text-muted: color-mix(in srgb, var(--settings-font-color) 55%, transparent);
--color-glass-text-done: color-mix(in srgb, var(--settings-font-color) 35%, transparent);
```

### 设置窗口字体大小隔离机制（最终方案）

```
applyCssSettings() 入口检测：
    getCurrentWebviewWindow().label !== "main" → 直接 return

效果：
    设置窗口 DOM 中 --settings-font-size 始终保持 :root 默认值 14px
    所有 rem 基准的 Tailwind 类均使用 14px × 倍数 = 稳定尺寸
    主窗口正常响应字体大小设置变更
```

### 窗口位置/大小保存与恢复

```
保存（useWindow.ts）：
    onMoved / onResized 事件 → 1s 防抖 → persistPosition()
        ├── outerPosition() → window_x, window_y（物理坐标）
        ├── innerSize() → window_width, window_height（物理尺寸）
        └── invoke("save_settings") 写入 JSON

关闭前（useWindow.ts）：
    close() async → await persistPosition() → appWindow.close()
    （必须先 await 再关闭，否则 persistPosition 在窗口销毁后执行）

恢复（lib.rs setup）：
    先 set_size(PhysicalSize) → 再 set_position(PhysicalPosition)
    （顺序重要：先设大小再设位置，避免位置依赖旧尺寸的偏移）
```

### 打包配置
```json
// tauri.conf.json
"bundle": {
  "resources": {
    "target/release/WebView2Loader.dll": "./"
  }
}
```

---

## 📝 关键文件清单

### 新增文件（阶段二/三）
| 文件 | 用途 |
|------|------|
| `src-tauri/src/settings.rs` | 设置数据模型 + JSON 持久化 |
| `src-tauri/src/commands.rs` | Tauri 命令（get/save/quit） |
| `src/types/settings.ts` | TypeScript 设置类型 + 默认值 |
| `src/stores/settingsStore.ts` | Zustand 设置状态管理 |
| `src/hooks/useSettings.ts` | 设置加载 Hook |
| `src/hooks/useContextMenu.ts` | 右键上下文菜单 |
| `src/MainApp.tsx` | 主应用布局 |
| `src/SettingsApp.tsx` | 设置界面 |
| `src/components/settings/ColorPicker.tsx` | 颜色选择器组件 |
| `src/components/settings/SliderField.tsx` | 滑块组件 |
| `src/components/settings/CheckboxField.tsx` | 复选框组件 |
| `src/components/settings/ImagePicker.tsx` | 图片选择器组件（含文件对话框、缩略图） |

### 初始文件清单（阶段一，33 个源文件）
| 类别 | 文件 |
|------|------|
| **根配置** | `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `index.html`, `.prettierrc`, `.gitignore` |
| **Tauri** | `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`, `src-tauri/capabilities/default.json`, `src-tauri/src/lib.rs`, `src-tauri/src/main.rs`, `src-tauri/build.rs` |
| **前端核心** | `src/main.tsx`, `src/App.tsx`, `src/index.css`, `src/vite-env.d.ts` |
| **类型** | `src/types/plan.ts` |
| **工具** | `src/lib/cn.ts` |
| **DB** | `src/db/database.ts` |
| **Store** | `src/stores/uiStore.ts`, `src/stores/planStore.ts` |
| **Hook** | `src/hooks/useWindow.ts`, `src/hooks/usePlans.ts` |
| **组件** | `src/components/layout/AppShell.tsx`, `src/components/layout/Titlebar.tsx`, `src/components/plan/DateGroup.tsx`, `src/components/plan/PlanList.tsx`, `src/components/plan/PlanItem.tsx`, `src/components/plan/AddPlan.tsx`, `src/components/common/IconButton.tsx` |
| **图标** | `src-tauri/icons/tray-icon.png`, `public/tray-icon.png` |

### 修改文件（阶段二/三）
| 文件 | 变更 |
|------|------|
| `src-tauri/src/lib.rs` | settings 窗口创建、托盘菜单、关闭事件、位置/大小恢复（PhysicalPosition/PhysicalSize）、默认聚焦 |
| `src-tauri/Cargo.toml` | 添加 `tauri-plugin-autostart`、`tauri-plugin-dialog`、`protocol-asset` feature |
| `src-tauri/tauri.conf.json` | 窗口尺寸、WebView2Loader.dll 资源、assetProtocol scope |
| `src-tauri/capabilities/default.json` | 窗口权限、`core:window:allow-set-skip-taskbar`、`dialog:default` |
| `src/index.css` | CSS 变量、动态主题色（color-mix）、背景图伪元素、字体大小继承 |
| `src/components/layout/AppShell.tsx` | Resize 手柄重构：边缘条 6px + 角方块 12×12，z-index 分层 |
| `src/components/layout/Titlebar.tsx` | 简化为单一"−"按钮、React state 替代 CSS 伪类、失焦清除状态 |
| `src/hooks/useWindow.ts` | async close + await persistPosition、onMoved/onResized 防抖保存、setSkipTaskbar |
| `src/stores/planStore.ts` | 四组隔离排序 |
| `src/stores/settingsStore.ts` | applyCssSettings 仅作用于 main 窗口（webview label 检测） |
| `src/SettingsApp.tsx` | 保存后关闭窗口、字体大小锁定（useEffect inline style） |
| `src/components/plan/PlanList.tsx` | `autoScroll={false}` 防止拖拽无限扩展 |
| `src/components/settings/ImagePicker.tsx` | 完全重写：文件对话框 + `<img>` 缩略图 + 路径省略号 |
| `package.json` | 添加 `@tauri-apps/plugin-dialog` |

---

## 🐛 已知问题和待解决

| # | 问题 | 优先级 | 位置 | 状态 |
|---|------|--------|------|------|
| — | 无已知问题 | — | — | 全部功能正常，零 bug |

---

## 💡 使用方法

### 新对话恢复上下文
将本文档的**全部内容**复制，作为新对话的第一条消息发送给 Claude：
> "请阅读这份对话上下文文档，了解 Aether 项目的当前状态，然后继续推进剩余工作。"

### 开发运行
```bash
pnpm tauri dev
```

### 构建安装包
```bash
pnpm tauri build
# 输出:
#   src-tauri/target/release/bundle/nsis/Aether_0.1.0_x64-setup.exe
#   src-tauri/target/release/bundle/msi/Aether_0.1.0_x64_en-US.msi
```

### 注意事项
1. 开发时用 `pnpm tauri dev`，不要用 `cargo run --release`
2. 修改 `index.css` 或组件后 Vite HMR 自动热更新
3. 修改 Rust 代码后需重新 `cargo build`
4. 打包前确保 `dist/` 目录有最新前端构建产物
5. **WebView2 Runtime**: Windows 10+ 自带，无需额外安装
6. **esbuild**: 首次运行 `pnpm install` 后需 `pnpm approve-builds esbuild` 批准 postinstall 脚本

### 窗口配置（tauri.conf.json）
```json
{
  "decorations": false,
  "transparent": true,
  "alwaysOnTop": true,
  "shadow": false,
  "width": 380,
  "height": 560,
  "minWidth": 250,
  "minHeight": 350
}
```

---

## 🚫 已尝试的失败方案

| 方案 | 问题 | 原因 |
|------|------|------|
| 依赖 `tauri.conf.json` 自动创建设置窗口 | 窗口不存在 | Tauri v2 可能不创建 `visible: false` 的非首窗口 |
| `cargo run --release` 启动应用 | localhost 连接拒绝 | release 模式需使用 `frontendDist`，但未正确设置 |
| 在 JS 侧 `emit` 事件同步设置 | 需要额外权限 | 改用 Rust `save_settings(persist: false)` 广播 |
| 灰色设置界面 | 用户不满意 | 改回蓝色 |
| SettingsApp 用 `text-[14px]` class 锁定字体大小 | 无效 | rem 单位相对于 `<html>` 根元素，不是父元素 |
| SettingsApp 用 `style={{ fontSize: 14 }}` 锁定字体大小 | 无效 | 同上，子元素 rem 仍读取 `<html>` 的 `font-size` |
| 将 `font-size: var(--settings-font-size)` 从 `html,body,#root` 移到 `.glass-shell` 并设 `html { font-size: 16px }` | **主窗口字体大小完全失效** | 所有 rem 基准的 Tailwind 类使用固定 16px，CSS 变量不再影响任何元素 |
| SettingsApp 仅用 `useEffect` 锁定 `documentElement.style.fontSize` | 部分有效但仍有高度抖动 | `applyCssSettings` 在每个 `updateSetting` 时设置 CSS 变量 inline style，导致部分布局计算不稳定 |

---

## 📐 最终采纳的关键方案

### 设置窗口字体大小隔离（最终方案）
**最终采用双重保护：**
1. `settingsStore.ts` 的 `applyCssSettings` 检测 webview label — 非 "main" 直接 return，**从源头阻止 CSS 变量写入设置窗口 DOM**
2. `SettingsApp.tsx` 的 `useEffect` 设置 `document.documentElement.style.fontSize = "14px"` 作为安全网

**为什么之前的方案失败？**
- Tailwind 的 `rem` 单位始终相对于 `<html>` 根元素的 `font-size`，不受中间父元素影响
- 设置 `container.style.fontSize` 只影响该元素，子元素的 `rem` 仍读取 `<html>`
- 即便 `fontSize` inline style（最高优先级）锁定 html，`applyCssSettings` 持续修改 `--settings-font-size` CSS 变量值，导致部分依赖于该变量的布局计算发生微调

**为什么最终方案正确？**
- 每个 webview 有独立的 DOM 树
- 设置窗口的 `--settings-font-size` 永远不被修改，保持 `:root` 初始值 `14px`
- 主窗口正常响应字体大小变更
- 两窗口完全独立，互不干扰

### 窗口位置/大小持久化（最终方案）
1. **坐标匹配**：JS `outerPosition()` 返回物理坐标 → Rust 用 `PhysicalPosition`（非 `LogicalPosition`）
2. **竞态消除**：`close()` 改为 async，先 `await persistPosition()` 再 `appWindow.close()`
3. **恢复顺序**：先 `set_size(PhysicalSize)` 再 `set_position(PhysicalPosition)`，避免 DPI 缩放导致的位置偏移

---

## 🚀 下一步计划

当前版本（v0.1.0）核心功能已全部完成。可能的后续方向：

1. **功能增强**：每日计划模板、数据导出/导入、多日视图
2. **UI 增强**：更多主题色方案、动画过渡、自定义毛玻璃强度
3. **跨平台**：macOS 适配（需处理 NSWindow 差异和 tray-icon 兼容性）

---

## 📝 开发心得

- **Tauri v2 多窗口架构**：辅助窗口应在 Rust `setup()` 中用 `WebviewWindowBuilder` 显式创建，不要依赖配置文件中的 `visible: false`
- **CSS `rem` 单位的根依赖性**：`rem` 始终相对于 `<html>` 根元素，设置子元素的 `font-size` 不会影响子元素内部使用的 `rem` 值。跨窗口字体大小隔离需从源头阻断 CSS 变量传播
- **Tauri v2 坐标系统**：JS `outerPosition()` 返回物理坐标，Rust 端必须用 `PhysicalPosition` 恢复，`LogicalPosition` 会导致 DPI 缩放偏移
- **关闭窗口的竞态条件**：`close()` 中必须在窗口隐藏前 `await persistPosition()`，否则 JS 的异步调用在窗口销毁后无法读取位置
- **NSIS 打包器**：可能不自动包含所有 DLL，`tauri.conf.json` 的 `bundle.resources` 是可靠的回退方案
- **CSS `color-mix()`**：在 Tauri/WebView2 中可用（基于 Chromium），是实现动态主题色的好方案
- **Tauri v2 tray-icon feature**：`Cargo.toml` 中必须显式声明，否则 `TrayIconBuilder` 完全不可用
- **乐观更新心智模型**：Zustand store 先 set 后 await DB，失败时不回滚——对于本地 SQLite（几乎不会失败）是合理的简化
- **手动创建优于脚手架**：对于有明确架构设计的项目，手动创建所有文件比 `create-tauri-app` 更精准

### 参考资料
- [Tauri v2 窗口自定义](https://tauri.app/learn/window-customization/)
- [Tauri v2 配置 Schema](https://schema.tauri.app/config/2)
- [tauri-plugin-sql 文档](https://v2.tauri.app/plugin/sql)
- [Tailwind CSS v4 文档](https://tailwindcss.com/docs/v4-beta)
