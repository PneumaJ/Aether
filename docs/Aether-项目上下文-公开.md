# 对话上下文 — Aether 设置窗口、右键菜单、Resize 手柄与打包

> 生成日期：2026-06-11  
> 当前状态：**功能已实现并打包，存在 4 个已知待处理项**

---

## 📋 问题背景

### 项目信息
| 项目 | 详情 |
|------|------|
| **名称** | Aether |
| **类型** | Tauri v2 + React 18 + TypeScript 桌面应用 |
| **功能** | 半透明浮动日常计划追踪器，毛玻璃美学，系统托盘驻留 |
| **平台** | Windows 10+ x64 |
| **技术栈** | Tauri v2.11.2、React 18、TypeScript 5、Tailwind CSS v4、Vite 5、Zustand、SQLite、dnd-kit |
| **包管理** | pnpm v10.33.0 |
| **开发命令** | `pnpm tauri dev` |
| **构建命令** | `pnpm tauri build` |

### 当前状态
应用已可完整构建并打包为 NSIS 安装程序（~2.6 MB），用户可通过安装包在任意 Windows 10+ 机器上运行。核心功能（计划管理、设置、托盘、右键菜单、窗口缩放）均已实现。

### 涉及组件
- **前端**：React 组件（AppShell、Titlebar、PlanList、PlanItem、DateGroup、AddPlan）、设置组件（ColorPicker、SliderField、CheckboxField、ImagePicker）
- **状态管理**：Zustand stores（planStore、uiStore、settingsStore）
- **后端**：Rust 模块（settings.rs、commands.rs、lib.rs）
- **配置**：tauri.conf.json、capabilities/default.json、Cargo.toml

---

## 🔴 核心问题（已解决）

| # | 问题 | 根因 | 解决方案 |
|---|------|------|----------|
| 1 | 设置窗口无法唤出 | Tauri v2 中 `visible: false` 的配置窗口 webview 未正确初始化 | Rust `setup()` 中用 `WebviewWindowBuilder` 显式创建 |
| 2 | 设置窗口关闭后所有操作无效 | 关闭窗口被销毁而非隐藏，后续 `getByLabel` 返回 null | `CloseRequested` 也拦截 settings 窗口，改为隐藏 |
| 3 | 字体颜色设置不生效 | `@theme` 颜色值为编译时硬编码，不响应运行时 CSS 变量 | 改为 `var(--settings-font-color)` + `color-mix()` |
| 4 | 托盘"显示 Aether"无法唤出窗口 | 缺少 `unminimize()` 调用 | 添加 `window.unminimize()` |
| 5 | 右键/托盘"退出"无效 | `ExitRequested` 处理器无条件 `prevent_exit()` | 移除该处理器 |
| 6 | 安装后报错找不到 WebView2Loader.dll | NSIS 打包器未自动包含该 DLL | `tauri.conf.json` 显式声明 resources |
| 7 | 顶部 Resize 手柄与关闭按钮重叠 | 手柄 20x20 与 Titlebar 按钮区域完全重叠 | 手柄增大到 28x28，按钮容器提升到 z-[60] |

---

## 🎯 实现目标

### 主要目标（全部已完成）
- [x] 设置窗口（从托盘右键或窗口右键打开）
- [x] 字体颜色、大小、背景透明度（聚焦/失焦）动态设置
- [x] 背景图片设置
- [x] 鼠标穿透勾选
- [x] 记住窗口位置
- [x] 开机自启
- [x] 窗口任意位置右键菜单（与托盘菜单一致）
- [x] 四角斜向拉伸区域扩大
- [x] 设置修改实时生效
- [x] 打包为 Windows 安装程序

### 具体要求
- 设置界面全中文
- 修改即时反映到主窗口，保存后持久化到磁盘
- 退出功能完整可用

---

## 🔧 技术约束

- **多窗口架构**：main + settings 两个 webview，通过 label 路由
- **关闭行为**：主窗口和设置窗口的 X 按钮只隐藏不销毁
- **事件通信**：`app://settings-changed` 全局事件在窗口间同步设置
- **持久化**：JSON 文件存储在 `app_config_dir()` 下的 `aether_settings.json`
- **CSS 变量**：`--settings-font-color` 等变量在 `:root` 上动态注入
- **WebView2**：`WebView2Loader.dll` 必须与 exe 同目录
- **窗口大小**：默认 380×560，最小 250×350（可由用户修改 `tauri.conf.json`）

---

## 🚫 已尝试的方案（失败）

| 方案 | 问题 | 原因 |
|------|------|------|
| 依赖 `tauri.conf.json` 自动创建设置窗口 | 窗口不存在 | Tauri v2 可能不创建 `visible: false` 的非首窗口 |
| `cargo run --release` 启动应用 | localhost 连接拒绝 | release 模式需使用 `frontendDist`，但未正确设置 |
| 在 JS 侧 `emit` 事件同步设置 | 需要额外权限 | 改用 Rust `save_settings(persist: false)` 广播 |
| 灰色设置界面 | 用户不满意 | 改回蓝色 |

---

## ✅ 当前方案/最终方案

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
    ├── 本地 applyCssSettings()（即时视觉反馈）
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

## 📝 关键代码变更

### 新增文件
| 文件 | 行数 | 用途 |
|------|------|------|
| `src-tauri/src/settings.rs` | ~62 | 设置数据模型 + JSON 持久化 |
| `src-tauri/src/commands.rs` | ~30 | Tauri 命令（get/save/quit） |
| `src/types/settings.ts` | ~29 | TypeScript 类型 + 默认值 |
| `src/stores/settingsStore.ts` | ~88 | Zustand 设置状态管理 |
| `src/hooks/useSettings.ts` | ~14 | 设置加载 Hook |
| `src/hooks/useContextMenu.ts` | ~87 | 右键上下文菜单 |
| `src/MainApp.tsx` | ~21 | 主应用布局 |
| `src/SettingsApp.tsx` | ~118 | 设置界面 |
| `src/components/settings/ColorPicker.tsx` | ~26 | 颜色选择器组件 |
| `src/components/settings/SliderField.tsx` | ~31 | 滑块组件 |
| `src/components/settings/CheckboxField.tsx` | ~25 | 复选框组件 |
| `src/components/settings/ImagePicker.tsx` | ~30 | 图片选择器组件 |
| `src/App.tsx` | — | 多窗口路由器 |

### 修改文件
| 文件 | 变更 |
|------|------|
| `src-tauri/src/lib.rs` | settings 窗口创建、托盘菜单、关闭事件、退出事件 |
| `src-tauri/Cargo.toml` | 添加 `tauri-plugin-autostart` |
| `src-tauri/tauri.conf.json` | 窗口尺寸、WebView2Loader.dll 资源 |
| `src-tauri/capabilities/default.json` | 窗口权限列表 |
| `src/index.css` | CSS 变量、动态主题色、背景图伪元素、字体大小继承 |
| `src/components/layout/AppShell.tsx` | Resize 手柄 28x28 |
| `src/components/layout/Titlebar.tsx` | z-[60] 避免手柄覆盖按钮 |
| `src/hooks/useWindow.ts` | 位置追踪 + 防抖持久化 |
| `src/stores/planStore.ts` | 四组隔离排序 |

---

## 🎯 当前进度

### 已完成
- [x] 设置窗口全功能（外观、背景、行为）
- [x] 右键上下文菜单（中文）
- [x] 四角 Resize 手柄 28x28
- [x] 设置实时生效 + 保存持久化
- [x] 退出功能正常
- [x] Windows 安装包（NSIS + MSI）
- [x] WebView2Loader.dll 打包

### 待处理
- [ ] 记住窗口大小（后端未恢复宽高）
- [ ] 背景图片功能完善（文件浏览器、预览）
- [ ] 拖拽元素下滑导致页面无限拖动
- [ ] 记住窗口位置 bug

---

## 💡 使用方法

### 开发运行
```bash
cd [项目根目录]
pnpm tauri dev
```

### 构建安装包
```bash
pnpm tauri build
# 输出:
#   src-tauri\target\release\bundle\nsis\Aether_0.1.0_x64-setup.exe
#   src-tauri\target\release\bundle\msi\Aether_0.1.0_x64_en-US.msi
```

### 注意事项
1. 开发时用 `pnpm tauri dev`，不要用 `cargo run --release`
2. 修改 `index.css` 或组件后 Vite HMR 自动热更新
3. 修改 Rust 代码后需重新 `cargo build`
4. 打包前确保 `dist/` 目录有最新前端构建产物
5. 设置 JSON 文件路径：`%APPDATA%\com.aether.desktop\aether_settings.json`

---

## 🐛 已知问题和待解决

| # | 问题 | 优先级 | 位置 |
|---|------|--------|------|
| 1 | **记住窗口大小**：`window_width/height` 已保存但 Rust 启动时未恢复 | 中 | `lib.rs:48-53` |
| 2 | **背景图片功能**：缺少文件浏览对话框，图片填充模式不可选 | 低 | `ImagePicker.tsx` |
| 3 | **拖拽无限扩展**：dnd-kit 拖拽元素向下时页面/窗口被无限拉长 | 高 | `PlanList.tsx` DndContext |
| 4 | **记住窗口位置 bug**：位置保存/恢复在某些场景下不准确 | 高 | `useWindow.ts`、`lib.rs` |

---

## 🚀 下一步计划

1. 修复拖拽无限扩展 bug（检查 dnd-kit autoScroll 配置）
2. 修复记住窗口位置 bug（坐标类型、保存时机）
3. 添加记住窗口大小（Rust 端 set_size）
4. 完善背景图片选择器（Tauri 文件对话框）

---

## 📝 备注

### 开发心得
- Tauri v2 多窗口架构：辅助窗口应在 Rust `setup()` 中用 `WebviewWindowBuilder` 显式创建，不要依赖配置文件中的 `visible: false`
- NSIS 打包器可能不自动包含所有 DLL，`tauri.conf.json` 的 `bundle.resources` 是可靠的回退方案
- CSS `color-mix()` 在 Tauri/WebView2 中可用（基于 Chromium），是实现动态主题色的好方案

### 关键文件索引
| 用途 | 路径 |
|------|------|
| 窗口配置 | `src-tauri/tauri.conf.json` |
| Rust 入口 | `src-tauri/src/lib.rs` |
| Rust 设置模型 | `src-tauri/src/settings.rs` |
| Rust 命令 | `src-tauri/src/commands.rs` |
| 权限配置 | `src-tauri/capabilities/default.json` |
| 全局样式 | `src/index.css` |
| 设置存储 | `src/stores/settingsStore.ts` |
| 设置类型 | `src/types/settings.ts` |
| 主应用 | `src/MainApp.tsx` |
| 设置应用 | `src/SettingsApp.tsx` |
| 右键菜单 | `src/hooks/useContextMenu.ts` |
| 窗口管理 | `src/hooks/useWindow.ts` |
| AppShell | `src/components/layout/AppShell.tsx` |
| Titlebar | `src/components/layout/Titlebar.tsx` |
