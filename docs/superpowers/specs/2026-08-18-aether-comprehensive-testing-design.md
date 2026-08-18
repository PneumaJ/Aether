# Aether 全面测试设计（审计 + 自动化测试体系）

> 日期：2026-08-18
> 目标版本：Aether v0.1.2（master @ 83e0983）
> 状态：待用户审阅

## 1. 背景与目标

Aether 是 Tauri v2 + React 18 + TypeScript + Tailwind CSS v4 + Zustand + SQLite 的桌面半透明悬浮每日计划追踪器，目前 v0.1.2。项目文档宣称经过 33 项修复后"零已知 bug"，但仓库内目前没有任何自动化测试（无 test 脚本、无测试文件），"零 bug"结论尚未被测试体系验证。

本次工作的目标：

1. 对 Aether v0.1.2 做一次有证据、可复现的全面测试：代码层面（静态检查 + 逐层人工审查）+ 功能层面（真实应用 E2E + 人工验证清单）。
2. 在仓库内建立可持续的自动化测试体系（单元测试 + Rust 测试 + E2E），让以后的改动可以自动回归。
3. 交付中文测试报告与问题清单；审计发现的问题只进清单，不自动修复。

## 2. 范围

### 范围内

- 全部前端源码（`src/` 下约 30 个文件）：组件、hooks、stores、db 层、lib 工具。
- 全部 Rust 源码：`lib.rs`、`commands.rs`、`settings.rs`。
- 关键配置：`vite.config.ts`、`tsconfig.json`、`src-tauri/tauri.conf.json`、`src-tauri/capabilities/default.json`。
- SQLite schema 与 CRUD 行为、设置持久化、窗口与托盘行为。
- 功能覆盖：计划增删改查、完成切换、日期导航、拖拽排序、设置（颜色/字号/透明度/背景图/鼠标穿透/开机自启/窗口位置大小记忆）、托盘菜单、设置窗口生命周期、聚焦与任务栏行为。

### 范围外（本阶段不做）

- 不修复审计发现的问题（只写入问题清单）。
- 不新增产品功能。
- 不做 macOS/Linux 适配验证。
- 不重新打包安装程序；仅验证 `pnpm build` 与 `cargo check` 通过，打包流程相关问题写入清单。

## 3. 合规约束（AGENTS.md / CLAUDE.md）

本设计及后续实施必须遵守仓库根目录 `AGENTS.md`（与 `CLAUDE.md` 内容一致）的四条行为准则：

1. **Think Before Coding**：实施前明确假设、不藏疑惑、有歧义先问；已有三节设计逐节确认作为依据。
2. **Simplicity First**：不引入投机性方案。Playwright 降级路径是 **M0 决策点**——仅当 tauri-driver 实际安装失败时才启用，预先不安装任何 Playwright 依赖。
3. **Surgical Changes**：只新增测试文件、配置与依赖；**不修改任何生产代码逻辑**。测试尽量只走公开接口（store / hook / 组件）。若某纯函数必须修改生产文件才能测试，不擅自改动，作为"建议"级发现写入问题清单征求用户同意。新文件遵循仓库现有 Prettier 与 TypeScript 严格风格。
4. **Goal-Driven Execution**：每个里程碑都有明确验证点（见第 9 节），先定义成功标准再执行。

## 4. 测试架构（四层）

### 4.1 静态检查 + 人工审查

- 运行 `pnpm build`（`tsc && vite build`）与 `cargo check`，建立静态基线。
- 按 组件 → Hook → Store → DB → Rust 分层人工通读全部源码。
- 审查时对照项目自身约束逐条核查：单向数据流、SQL 参数化、DB 单例、乐观更新不回滚、无动态 Tailwind 类名、窗口隐藏不销毁、设置仅显式保存时落盘。

### 4.2 单元测试（Vitest + React Testing Library）

- 测试文件与源码同目录（`*.test.ts(x)`），遵循仓库 Prettier / TS 风格。
- Mock 策略：`@tauri-apps/api` 与 `@tauri-apps/plugin-sql` 全部 mock；真实 SQL 行为留给 E2E。
- 覆盖目标：
  - `src/lib/date.ts`：`fmtDate` / `today` / `shiftDate` 及日期边界。
  - `src/stores/planStore.ts`：CRUD 乐观更新、`reorderPlan` 批量排序持久化、四组隔离排序。
  - `src/stores/settingsStore.ts`：`hexToRgba`（alpha 约束、3 位 hex 展开）、`applyCssSettings` 的 webview label 守卫。
  - `src/stores/uiStore.ts`：日期导航状态。
  - hooks 与组件：AddPlan 受控提交、PlanItem 双击编辑/删除/完成切换、DateGroup 日期导航、PlanList 空状态与分组、AppShell / Titlebar 交互。

### 4.3 Rust 单元测试（cargo test）

- 通过 `#[cfg(test)]` 模块新增测试，不改生产代码。
- 覆盖 `settings.rs`：serde 默认值、JSON 读写（临时文件）、非法输入容错。
- 覆盖 `commands.rs` 中不依赖 Tauri runtime 的纯逻辑；窗口相关逻辑不测（依赖原生 runtime）。

### 4.4 功能 E2E（WebdriverIO + tauri-driver）

- 驱动真实 Tauri 应用，运行核心场景（清单见第 6 节）。
- 明确不自动化的原生行为：托盘右键菜单、聚焦抢占断言、任务栏闪现——这些进入人工验证清单（见第 7 节），避免产出必抖的测试。

## 5. 目录与脚本

- 单元测试：与源码同目录。
- E2E：新建 `e2e/` 目录。
- 人工验证清单：`tests/manual-checklist.md`。
- 问题清单：`docs/audit-findings.md`。
- 测试报告：`docs/test-report-2026-08-18.md`。
- `package.json` 新增脚本：`test`（Vitest）、`test:e2e`（WebdriverIO）、`test:rust`（cargo test）。
- 新增依赖：vitest、@testing-library/react、@testing-library/user-event、jsdom、WebdriverIO 套件、msedgedriver；cargo 侧安装 tauri-driver。
- 只新增测试文件/配置/依赖，不修改生产代码逻辑。

## 6. E2E 场景清单

1. 启动 → 主窗口出现、计划列表加载、空状态提示。
2. 添加计划 → 显示并持久化。
3. 完成切换 → 样式与分组变化。
4. 双击编辑 → 内容更新并持久化。
5. 删除计划 → 从列表移除并持久化。
6. 日期导航 → 前一天 / 今天 / 后一天切换及各自空状态。
7. 拖拽排序 → 顺序变化，重启后保持。
8. 设置窗口打开 → 修改颜色/透明度 → 保存 → 重启后持久化。
9. 设置修改后取消 → 主窗口 CSS 预览回滚。
10. 设置窗口开合多次 → 生命周期稳定（无卡死/白屏）。
11. 窗口位置/大小记忆 → 移动/缩放后重启恢复。

## 7. 人工验证清单（手动勾选）

- 托盘左键显隐切换、右键菜单项、退出。
- 聚焦行为：点击输入框可正常输入（NOACTIVATE 解除闭环）、关闭/最小化其他窗口时不抢焦点、任务栏无图标闪现。
- 毛玻璃与透明度渲染、背景图显示。
- 多显示器 / DPI 场景（视用户环境而定）。

## 8. 审计重点清单（按层）

- 前端：数据流合规（组件不直连 DB）、SQL 参数化、Zustand selector 订阅粒度、事件监听清理（cancelled 标志）、乐观更新一致性、动态类名、无谓重渲染、死代码。
- 安全面：`assetProtocol.scope: "**"` 是否过宽、`csp: null`、capabilities 最小权限、命令暴露面。
- Rust：窗口生命周期（隐藏不销毁、CloseRequested）、NOACTIVATE 闭环（点击激活 → 失焦恢复 → 托盘唤出）、位置/大小恢复顺序、设置 JSON 读写容错（损坏/半写）、路径处理。
- 配置/打包：版本号三处一致性（package.json / tauri.conf.json / Cargo.toml）、`bundle.resources`、`.gitignore`、构建产物。

## 9. 实施顺序与验证点

| 里程碑 | 内容 | 验证点 |
|--------|------|--------|
| M0 | 环境准备：申请网络权限，安装 Vitest / WebdriverIO / tauri-driver / msedgedriver | `pnpm tauri dev` 能启动；若 tauri-driver 安装失败 → 决策是否启用 Playwright 降级（仅此时才安装） |
| M1 | 静态基线 | `pnpm build`、`cargo check` 通过，记录基线结果 |
| M2 | 代码审计（逐层） | 产出 `docs/audit-findings.md`，每条含严重级别/类别/位置/证据/建议 |
| M3 | 单元测试（Vitest + Rust） | 全部测试通过，产出覆盖率摘要 |
| M4 | E2E 实现与运行 | 核心场景全部通过；只修测试自身问题，不碰产品代码 |
| M5 | 人工清单 | 与用户共同过一遍原生行为勾选清单 |
| M6 | 汇总 | `docs/test-report-2026-08-18.md` + 问题清单 + 覆盖率全部产出，并提供 git 命令清单供用户提交到 `test/audit-v0.1.2` 分支 |

**版本控制说明**：当前沙箱环境无法写入 `D:\Pneuma\Workspace\Aether\.git`（权限策略限制，非人为选择），因此分支创建与提交由用户执行。实施完成后会提供完整 git 命令清单（目标分支：`test/audit-v0.1.2`），所有产物以文件形式落盘在仓库内，不依赖 git 状态。

## 10. 报告与问题清单格式

### 问题清单（docs/audit-findings.md）

每条含：ID、严重级别（致命 / 高 / 中 / 低 / 建议）、类别（逻辑 / 性能 / 安全 / 可维护性 / UX）、位置（文件:行）、证据、修复建议。只记录，不修复。

### 测试报告（docs/test-report-2026-08-18.md）

- 总体结论、通过率、关键发现摘要。
- E2E 场景结果表（场景 / 结果 / 备注）。
- 人工清单结果。
- Vitest 覆盖率摘要。

## 11. 风险与兜底

- **网络受限**：实施时先申请网络权限；tauri-driver 装不上时按 M0 决策点降级为 Playwright 前端集成测试 + 人工清单兜底。
- **GUI 会话问题**：E2E 需要真实桌面会话；启动失败同样走降级路径，不硬撑。
- **E2E 稳定性**：拖拽、焦点类测试限量保留，宁少勿抖。
- **版本兼容**：按 Tauri v2 + WebdriverIO 官方模板对齐依赖版本。

## 12. 非目标重申

- 不修复审计发现的问题。
- 不修改生产代码逻辑（含为测试所需的任何导出调整，均先征求同意）。
- 不新增产品功能。
- 不重打安装包。
