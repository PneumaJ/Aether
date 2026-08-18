# Aether 审计问题清单

> 生成日期：2026-08-18 | 目标版本：v0.1.2 | 状态：持续更新，只记录不修复

## 严重级别
- 致命：数据丢失 / 崩溃 / 功能不可用
- 高：明确的功能错误
- 中：边界条件缺陷
- 低：体验或代码质量问题
- 建议：改进机会

## 类别
逻辑 / 性能 / 安全 / 可维护性 / UX

## 发现

| ID | 严重级别 | 类别 | 位置 | 证据 | 建议 |
|----|----------|------|------|------|------|
| F-001 | 中 | 逻辑 | `src/hooks/useContextMenu.ts:16-20` | 右键菜单"显示 Aether"直接 `win.show()` + `win.setFocus()`；而设计约定显式唤出必须先关闭 WS_EX_NOACTIVATE（见 `src-tauri/src/lib.rs:38-44` 的 `show_and_focus`）。主窗口失焦后已重新启用 NOACTIVATE，此时 `setFocus` 可能被系统忽略，窗口显示但不获得键盘焦点 | 改为调用 `activate_main_window` 命令（内部走 `show_and_focus`），与托盘唤出路径一致 |
| F-002 | 建议 | 安全 | `src-tauri/tauri.conf.json`（`app.security.assetProtocol.scope`） | `"scope": ["**"]` 允许 asset 协议读取任意本地文件；结合 `csp: null` 时若存在 XSS，可被用于读取本地文件 | 收窄 scope 至应用资源目录与用户选择的背景图路径（如 `$APPDATA/**` 中的图片）；设置窗口与主窗口分开授权 |
| F-003 | 建议 | 安全 | `src-tauri/tauri.conf.json`（`app.security.csp`） | `"csp": null` 完全关闭内容安全策略 | 设置 CSP，例如 `default-src 'self'; img-src 'self' asset: data:; style-src 'self' 'unsafe-inline'` |
| F-004 | 建议 | 安全 | `src-tauri/capabilities/default.json` | `sql:allow-load/execute/select/close`、`dialog:default`、`autostart:*` 等权限同时授予 `main` 与 `settings` 两个窗口；设置窗口实际不需要 SQL 与部分窗口控制权限 | 按窗口拆分 capability（main 保留 SQL/窗口控制；settings 仅需 `core:default`、event、`get_settings/save_settings` 对应权限） |
| F-005 | 建议 | 性能 | `src/hooks/usePlans.ts:8`、`src/hooks/useSettings.ts:5` | `useUIStore()` 与 `useSettingsStore()` 为整 store 订阅（无 selector）；窗口焦点、headerText 等无关状态变化会触发依赖组件全量重渲染 | 改用 selector 订阅所需字段（如 `useUIStore((s) => s.selectedDate)`），`useSettings` 拆分出 `settings/loaded/load` 的精细订阅 |
| F-006 | 建议 | 逻辑 | `src/stores/settingsStore.ts:93-97` | `load()` 内 `win.listen("app://settings-changed", ...)` 未保存 unlisten 句柄；`load()` 被重复调用（如 React StrictMode 开发双挂载）时会累积监听器 | 保存 unlisten 并在重复调用/组件卸载时清理 |
| F-007 | 建议 | 可维护性 | `src-tauri/src/settings.rs:75-77` | `save_settings` 用 `fs::write` 直接写设置文件，非原子写；写入中途崩溃可能留下损坏文件（`load_settings` 会回退默认值，数据不致命） | 先写临时文件再 `rename`（同目录原子替换） |
| F-008 | 建议 | 可维护性 | `src/stores/planStore.ts:13,25`、`src/stores/uiStore.ts:21,38`、`src/stores/settingsStore.ts:13,67` | `setPlans`、`setSelectedDate`、`updateSettings` 在生产代码中无任何调用点（仅定义） | 删除，或在注释中声明为测试/未来功能保留的公开 API |
| F-009 | 建议 | UX | `src/components/plan/PlanItem.tsx:59-78`、`src/components/plan/AddPlan.tsx:23-31` | 完成勾选按钮（含 SVG 对勾的 `<button>`）无可访问名称；AddPlan 的 Today/Daily 切换按钮同样只有文本 | 为勾选按钮添加 `aria-label`（如 "Toggle done"），为模式切换按钮添加 `aria-label` |
| F-010 | 建议 | UX | `src/components/layout/Titlebar.tsx:56`、`src/components/settings/ImagePicker.tsx` 等 | 界面硬编码中英混排：计划区英文（"Add a plan..."、"Today"、"Daily"），设置窗口与标题栏中文（"隐藏到托盘"、"选择图片 +"、"更换"、"移除"） | 引入 i18n 文案表统一语言，或至少在交互元素上统一 |
| F-011 | 建议 | 逻辑 | `src/components/plan/PlanItem.tsx:41-45,91-95` | Enter 提交后输入框卸载理论上可能再次触发 `onBlur→commitEdit`；M3 组件测试（`toHaveBeenCalledTimes(1)`）在 jsdom 中未复现双写，实际浏览器行为因引擎而异，属理论风险 | 若需彻底防御，提交后置重入标志（如 `committedRef`） |
| F-012 | 低 | 逻辑 | `src/hooks/usePlans.ts:14-17` | `loadPlans(selectedDate).finally(...)` 无 catch；DB 读取失败时产生未处理的 promise rejection，UI 无错误状态 | 增加 catch，设置错误状态并展示重试提示 |
| F-013 | 建议 | 逻辑 | `src/stores/settingsStore.ts:113-115` | `save()` 失败仅 `console.error`，UI 无提示，用户可能误以为已保存 | 返回/抛出错误，由设置窗口显示保存失败提示 |
| F-014 | 建议 | 可维护性 | `src/db/database.ts:44-52` | `bulkUpdateSortOrders` 逐条 UPDATE 且无事务；排序批量写入中途失败会留下部分更新的排序 | 使用单条事务（多条 SQL 在一个 `execute` 或事务内提交） |
| F-015 | 建议 | UX | `src/components/plan/AddPlan.tsx:23-31` | 模式按钮文案显示的是"当前模式"（Today/Daily）而非将要执行的动作，且与下方输入框 placeholder 联动切换，语义不够清晰 | 改为明确动作文案（如 "Add daily" / "Add today"）或加 tooltip |

## 核查记录（已核查，无问题项）

- DB 单例：`rg "plugin-sql" src` 仅命中 `src/db/database.ts:1`。
- SQL 参数化：`src/db/database.ts` 全部 SQL 使用 `$1/$2` 占位符，无字符串拼接值（`updatePlan` 动态 SET 子句同样使用参数）。
- 组件不直连 DB：`rg "database" src/components` 无命中。
- 乐观更新：`togglePlan`/`removePlan`/`editPlanContent`/`reorderPlan` 均为先更新状态再持久化、失败不回滚（符合项目文档记载的"已知取舍"）；`addPlan` 为悲观写入（先插入再更新状态），失败时状态不变。
- 事件监听清理：`useWindow`（cancelled 标志 + unlisten + 防抖清理）、`useContextMenu`（cancelled + 菜单 close）、`AppShell`（preview 三监听 + timer 清理）均正确；`settingsStore.load` 例外见 F-006。
- 动态类名：`rg 'className=\{`...` src` 无命中（resize 手柄 cursor 为 inline style）。
- PlanList 分组偏移：`dailyDoneOffset/todayUndoneOffset/todayDoneOffset` 与 `planStore.loadPlans` 的四组平铺顺序（daily-undone → daily-done → today-undone → today-done）一致，`reorderPlan` 使用全局索引一致。
- NOACTIVATE 闭环：`show_and_focus`（托盘左键/托盘菜单）正确先关闭 NOACTIVATE 再聚焦；失焦事件重新启用；前端指针按下调用 `activate_main_window` 解除闭环（右键菜单路径例外见 F-001）。
- 位置/大小恢复顺序：`lib.rs` setup 中先 `set_size`（PhysicalSize）再 `set_position`（PhysicalPosition），与保存来源（`outerPosition`/`innerSize`）一致。
- 设置 JSON 容错：`load_settings` 对损坏/缺失文件回退默认值；`save_settings` 非原子（见 F-007）。
- 版本一致性：`package.json` / `src-tauri/tauri.conf.json` / `src-tauri/Cargo.toml` 均为 0.1.2。
- `any` 滥用、遗留 `console.log`、`TODO/FIXME/HACK`：无命中（仅 `console.error` 错误日志）。
- `.gitignore`：测试产物（docs/audit-findings.md、e2e/、tests/、vitest.config.ts）均未被忽略。
- `bundle.resources` 的 `src-tauri/target/release/WebView2Loader.dll` 存在。
- 重复工具函数：日期工具仅 `src/lib/date.ts` 一处定义。

> 审计范围完成：前端数据流/组件、Rust 窗口与设置、安全、性能、可维护性、打包配置。发现数：15 条。
