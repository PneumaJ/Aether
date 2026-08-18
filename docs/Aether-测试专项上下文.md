# Aether 测试专项上下文（公开版）

> **生成日期**：2026-08-18 / 2026-08-19
> **涵盖阶段**：完整测试（代码审计 + 功能验证）→ 自动化测试体系建设（单元 / Rust / E2E）→ 测试收尾与交接
> **目标版本**：**v0.1.2**（master @ 83e0983）
> **用途**：在新对话中快速恢复本测试专项上下文；配套文档为 `docs/Aether-项目上下文-公开.md` 与 `docs/audit-findings.md`
> **公开版说明**：本文件为可进版本库的公开版，不含本机路径与隐私信息；含本机细节的完整版见 `docs/对话上下文-Aether测试专项.md`（仅本地维护，不提交）。

---

## 📋 专项概览

### 专项信息
| 项 | 详情 |
|----|------|
| **项目** | Aether（Tauri v2 + React 18 + TypeScript + Zustand + SQLite 桌面应用） |
| **专项性质** | 纯测试：只审计与验证，**不修复生产代码** |
| **设计文档** | `docs/superpowers/specs/2026-08-18-aether-comprehensive-testing-design.md` |
| **实施计划** | `docs/superpowers/plans/2026-08-18-aether-comprehensive-testing.md` |
| **测试报告** | `docs/test-report-2026-08-18.md` |
| **问题清单** | `docs/audit-findings.md`（15 条，只记录未修复） |
| **执行方式** | 计划为子代理驱动；执行中沙箱子代理消息投递失效，切换为内联执行（计划内容不变） |

### 专项范围

- **范围内**：全部前端（组件/Hook/Store/DB/lib）、全部 Rust（lib/commands/settings）、关键配置（tauri.conf、capabilities、vite、tsconfig）、SQLite CRUD、设置持久化、窗口与托盘行为。
- **范围外（本专项不做）**：不修复审计发现；不新增功能；不做 macOS/Linux 适配；不重打安装包。

---

## 🏗️ 测试体系架构

### 四层结构
1. **静态检查 + 人工审查**：`pnpm build`、`cargo check`、按 组件 → Hook → Store → DB → Rust 分层通读，产出 `docs/audit-findings.md`。
2. **单元测试（Vitest + React Testing Library）**：与源码同目录的 `*.test.ts(x)`，mock 掉全部 Tauri API 与 SQL。
3. **Rust 单元测试（cargo test）**：`src-tauri/src/settings.rs` 末尾 `#[cfg(test)] mod tests`，4 个用例（默认值 / serde 往返 / 缺失字段 / 坏 JSON）。
4. **功能 E2E（WebdriverIO + tauri-driver）**：真实 WebView2（v151）驱动，覆盖核心流程；拖拽排序因自动化不稳定转人工清单。

### 目录与脚本

```
vitest.config.ts                     # 单元测试配置（jsdom，exclude e2e/**）
src/test/setup.ts                    # matchMedia polyfill
src/**/*.test.ts(x)                  # 11 个单元测试文件（55 用例）
e2e/wdio.conf.cjs                    # E2E 配置（application 指向 debug exe）
e2e/specs/                           # smoke / plans / settings / persistence-seed / persistence-verify / drag / _cleanup
tests/manual-checklist.md            # 人工功能验证清单（未执行）
docs/audit-findings.md               # 15 条审计发现
docs/test-report-2026-08-18.md       # 测试报告
```

脚本：`pnpm test`（单测）、`pnpm test:coverage`、`pnpm test:rust`、`pnpm test:e2e -- --spec e2e/specs/<file>.spec.ts`。

---

## ✅ 已验证结果

| 项 | 结果 |
|----|------|
| 单元测试 | 13 文件 / **55 用例全部通过** |
| 覆盖率（all files） | 行 26.5% / 分支 75.98% / 函数 57.6%；核心逻辑模块 81–100%（date/planStore/uiStore/组件） |
| E2E | **6/6 通过**：smoke 1、计划 CRUD 1、日期导航 1、设置保存落盘 1、跨重启持久化 2 |
| 构建/编译 | `pnpm build`、`cargo check`、`pnpm tauri build --debug --no-bundle` 通过 |
| Rust 测试 | 4 个用例编译通过；**运行被沙箱环境阻断**（0xC0000139），需本机 `pnpm test:rust` |
| 人工清单 | 已创建未执行（托盘/聚焦/渲染等原生行为） |

### 测试中修复的测试自身问题

- `vitest.config.ts` 增加 `exclude: ["e2e/**", ...]`（避免 vitest 误把 E2E spec 当单测套件）。
- `DateGroup.test.tsx` 改为动态日期（`today()`/`shiftDate`），修复跨午夜 "Today" 断言失效。

---

## 🐛 审计发现（只记录，未修复）

15 条，见 `docs/audit-findings.md`。严重级别分布：致命 0 / 高 0 / 中 1 / 低 1 / 建议 13。Top 5：

1. **F-001（中）** 右键菜单"显示 Aether"未走 `show_and_focus` 的 NOACTIVATE 解除闭环（`src/hooks/useContextMenu.ts`）。
2. **F-002（建议/安全）** `assetProtocol.scope: ["**"]` 过宽。
3. **F-003（建议/安全）** `csp: null`。
4. **F-004（建议/安全）** capabilities 未按窗口拆分权限。
5. **F-005（建议/性能）** `usePlans`/`useSettings` 整 store 订阅。

<span style="color:red">**这些发现是后续开发/修复 agent 的工作清单；修复后应在测试侧补充/更新回归测试，不得只改代码不补测试。**</span>

---

## <span style="color:red">⚠️ 冲突边界（与开发/修复 agent 协作时）</span>

1. <span style="color:red">`package.json` / `pnpm-lock.yaml`：双方都可能改依赖；改动前先同步，改动后 `pnpm install` + `pnpm test`。</span>
2. <span style="color:red">`src-tauri/src/settings.rs` 末尾的 `#[cfg(test)] mod tests` 不得被生产修改删除/覆盖；字段变化须同步更新测试。</span>
3. <span style="color:red">`src/**/*.test.*`、`e2e/`、`vitest.config.ts`、`tests/` 由测试侧维护，开发侧不顺手改动。</span>
4. <span style="color:red">不要两个 agent 在同一工作目录并发；用独立分支 / worktree 或串行，先合并测试分支再合并开发分支。</span>
5. <span style="color:red">提交闸门：`pnpm test` 与 `pnpm test:rust` 必须通过。</span>

---

## 📝 关键文件清单（测试侧）

| 文件 | 用途 |
|------|------|
| `src/lib/date.test.ts` | 日期工具（fmtDate/today/shiftDate 边界） |
| `src/stores/planStore.test.ts` | CRUD 乐观更新、排序分组、批量持久化 |
| `src/stores/settingsStore.test.ts` | hexToRgba、applyCssSettings label 守卫、load/save/autostart |
| `src/stores/uiStore.test.ts` | 日期导航、headerText localStorage |
| `src/components/**/*.test.tsx` | AddPlan/PlanItem/DateGroup/PlanList/AppShell/Titlebar |
| `src/hooks/useWindow.test.tsx`、`usePlans.test.tsx` | 防抖持久化、加载流程 |
| `e2e/specs/*.spec.ts` | 真实应用场景 |
| `docs/audit-findings.md` | 审计发现（修复清单） |

---

## 💡 使用方法

### 前置条件
- `pnpm install` 已完成；测试依赖含 vitest、@wdio/*、edgedriver、ts-node。
- Rust 测试：本机运行（沙箱环境 0xC0000139 阻断；如遇同类问题把 `src-tauri\target\debug` 加入 PATH）。
- E2E：需要 `pnpm tauri build --debug --no-bundle` 产出 debug exe + vite dev（5173）+ `tauri-driver` 监听 4444。

### 常用命令
```bash
pnpm test                # 单元测试（55 用例）
pnpm test:coverage       # 覆盖率
pnpm test:rust           # Rust 单元测试（4 用例）
pnpm test:e2e -- --spec e2e/specs/plans.spec.ts   # 单个 E2E
pnpm test:e2e            # 全部 E2E（drag 已 exclude）
```

---

## 📌 当前状态与待办

- [ ] 本机运行 `pnpm test:rust` 验证 4 个 Rust 用例
- [ ] `tests/manual-checklist.md` 人工功能验证（托盘、聚焦/任务栏、渲染、DPI）
- [ ] 审计发现 15 条由开发侧修复，修复后回补回归测试
- [ ] 提交当前改动到 `test/audit-v0.1.2` 分支并推远程（git 命令见测试报告）
- [ ] 注意：E2E 曾把 `font_size` 保存为 18，如需恢复请改回

---

## 🔄 新对话恢复上下文

请将本文档全部内容连同 `docs/Aether-项目上下文-公开.md` 与 `docs/audit-findings.md` 一起作为新对话首条消息，并附加说明："请阅读这份测试专项上下文文档，了解 Aether 测试体系的当前状态，然后继续推进剩余工作（本机 Rust 测试、人工清单、审计发现修复后的回归验证）。"
