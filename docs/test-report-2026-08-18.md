# Aether 测试报告（v0.1.2）

> 执行日期：2026-08-18 至 2026-08-19 | 目标版本：Aether v0.1.2（master @ 83e0983）
> 依据：docs/superpowers/specs/2026-08-18-aether-comprehensive-testing-design.md
> 执行方式：子代理驱动执行（过程中因沙箱子代理消息投递失效切换为内联执行，计划内容不变）

## 总体结论

| 项 | 结果 |
|----|------|
| 静态基线 `pnpm build` | ✅ 通过（含在 `pnpm tauri build --debug --no-bundle` 的 beforeBuildCommand 中验证） |
| 静态基线 `cargo check` | ✅ 通过（debug/release 均编译成功） |
| Vitest 单元测试 | ✅ 13 个测试文件、55 个用例全部通过 |
| Rust 单元测试 | ⚠️ 4 个用例已编写且编译通过；沙箱内测试二进制无法启动（环境阻断，见下），需在本机运行 `pnpm test:rust` 验证 |
| 覆盖率（all files） | 行 26.5% / 分支 75.98% / 函数 57.6%（详见分层明细） |
| E2E（WebdriverIO + tauri-driver + WebView2 v151） | ✅ 6/6 通过；拖拽排序转人工清单 |
| 人工功能验证清单 | 📋 已创建（tests/manual-checklist.md），待用户执行 |
| 审计发现 | 15 条：致命 0 / 高 0 / 中 1 / 低 1 / 建议 13 |

## 关键发现摘要（Top 5）

1. **F-001（中）** 右键菜单"显示 Aether"直接 `show()+setFocus()`，未走 `show_and_focus` 的 NOACTIVATE 解除闭环；失焦后窗口可能显示但不获焦点。建议改调 `activate_main_window`。
2. **F-002（建议/安全）** `assetProtocol.scope: ["**"]` 过宽，建议收窄到应用资源目录与用户选择的图片路径。
3. **F-003（建议/安全）** `csp: null` 完全关闭内容安全策略，建议设置 CSP。
4. **F-004（建议/安全）** capabilities 同时授予 main 与 settings 两个窗口，settings 实际不需要 SQL 等权限，建议按窗口拆分。
5. **F-005（建议/性能）** `usePlans` / `useSettings` 整 store 订阅，建议拆分为 selector 精细订阅。

完整清单见 [docs/audit-findings.md](D:/Pneuma/Workspace/Aether/docs/audit-findings.md)（F-001、F-008 已现场复核，行号与代码一致）。

## 单元测试（Vitest）

13 个测试文件 / 55 用例全部通过：

| 文件 | 用例数 |
|------|--------|
| src/lib/date.test.ts | 7 |
| src/stores/planStore.test.ts | 9 |
| src/stores/settingsStore.test.ts | 12 |
| src/stores/uiStore.test.ts | 5 |
| src/hooks/useWindow.test.tsx | 2 |
| src/hooks/usePlans.test.tsx | 1 |
| src/components/plan/AddPlan.test.tsx | 3 |
| src/components/plan/PlanItem.test.tsx | 4 |
| src/components/plan/DateGroup.test.tsx | 4 |
| src/components/plan/PlanList.test.tsx | 3 |
| src/components/layout/AppShell.test.tsx | 2 |
| src/components/layout/Titlebar.test.tsx | 2 |
| src/test/smoke.test.ts | 1 |

测试过程中修复的测试自身问题：
- `vitest.config.ts` 增加 `exclude: ["e2e/**", ...]`，避免 vitest 误把 E2E spec 当单元套件。
- `DateGroup.test.tsx` 改为动态日期（`today()` / `shiftDate`），修复跨午夜后 "Today" 断言失效的日期脆弱性。

### 覆盖率分层明细（关键模块）

| 模块 | 行 | 函数 | 分支 |
|------|-----|------|------|
| src/lib/date.ts | 100% | 100% | 100% |
| src/stores/planStore.ts | 98% | 76.4% | 85.7% |
| src/stores/settingsStore.ts | 81.9% | 88.2% | 62.5% |
| src/stores/uiStore.ts | 93.5% | 83.3% | 66.7% |
| src/components/plan（合计） | 92.5% | 93.8% | 80.8% |
| src/components/layout AppShell/Titlebar | 81.6% / 94.2% | — | — |
| src/hooks（usePlans/useWindow） | 90.2% / 76.7% | — | — |
| 入口/DB/设置组件（App、MainApp、SettingsApp、database.ts、settings/*、useContextMenu、useSettings） | 0%（单元层） | — | — |

说明：All files 汇总（行 26.5%）被入口与 DB/设置组件拉低；这些模块的真实行为由 E2E 与人工清单覆盖，不属于单元层缺口。

## E2E 场景结果（WebView2 v151.0.4129.86）

| 场景 | 结果 | 备注 |
|------|------|------|
| smoke 启动与主窗口 | ✅ 1/1 | |
| 计划增删改查 + 完成切换 + 编辑 + 删除 | ✅ 1/1 | 测试后自动删除自身数据 |
| 日期导航与空状态 | ✅ 1/1 | |
| 设置窗口打开/修改/保存/落盘校验 | ✅ 1/1 | 设置文件 JSON 断言 font_size=18 |
| 跨重启持久化（两轮会话） | ✅ 2/2 | seed 写入 → 新会话 verify 读到 |
| 拖拽排序 | ⏭ 转人工 | dnd-kit 拖拽在 WebDriver 下不稳定，wdio.conf.cjs 中 exclude，场景进入 tests/manual-checklist.md |
| 测试数据清理 | ✅ 1/1 | e2e/specs/_cleanup.spec.ts 删除 e2e-test-plan* 与 survives-restart |

运行方式：`pnpm tauri build --debug --no-bundle` + vite dev（5173）+ tauri-driver + `pnpm test:e2e -- --spec <spec>`。

## 人工清单结果

`tests/manual-checklist.md` 已创建，覆盖托盘、聚焦/任务栏、窗口行为、渲染、设置窗口、拖拽、多显示器/DPI。**尚未执行**——原生行为（托盘右键、聚焦抢占、任务栏闪现、毛玻璃渲染）需在真实桌面逐项勾选。

## 环境阻断与降级记录

1. **Rust 测试二进制无法在本沙箱启动**：`cargo test` 编译成功，但测试进程启动即退出 `0xC0000139 (STATUS_ENTRYPOINT_NOT_FOUND)`；已排查 DLL 架构（x64 匹配）、VC++ 运行库（齐全）、webview2-com-sys 重建（无效）。判断为沙箱对 WebView2Loader 相关导入的环境限制。settings.rs 的 4 个 `#[cfg(test)]` 用例已就位，用户在本机执行 `pnpm test:rust` 即可验证（如遇同类报错，可将 `src-tauri\target\debug` 加入 PATH）。
2. **拖拽排序 E2E 不稳定**：按计划兜底转为人工清单（wdio.conf.cjs 中 exclude 并注释原因）。
3. **子代理消息投递失效**：执行中途沙箱子代理无法接收任务内容，按 writing-plans 技能切换到 executing-plans 内联执行；计划与交付物不变。
4. **测试副作用提示**：settings E2E 会把 `font_size` 保存为 18（用户可自行在设置里改回偏好值）；测试产生的计划数据已由清理脚本删除。仓库根目录新增 `.pnpm-store/`（本地 pnpm store）与 `.cargo-config-tmp.toml`（cargo 镜像临时文件），均不应提交。

## 提交指引（用户执行）

在 `D:\Pneuma\Workspace\Aether` 下执行：

```powershell
git switch -c test/audit-v0.1.2
git add docs/ src/ src-tauri/src/settings.rs tests/ e2e/ vitest.config.ts package.json pnpm-lock.yaml pnpm-workspace.yaml
git commit -m "test: Aether 全面测试（审计 + 自动化测试体系）"
```

不建议提交：`.pnpm-store/`、`.cargo-config-tmp.toml`、`coverage/`、`e2e/.logs/`（均为本地产物）。
