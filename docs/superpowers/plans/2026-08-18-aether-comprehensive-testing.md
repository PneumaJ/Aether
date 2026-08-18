# Aether 全面测试（审计 + 自动化测试体系）实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 对 Aether v0.1.2 完成一次有证据的全面测试（代码审计 + 功能验证），并建立可持续的自动化测试体系（Vitest 单元测试 + Rust 测试 + WebdriverIO E2E）。

**Architecture:** 四层测试——静态检查与逐层人工审计、前端单元测试（Vitest + RTL）、Rust 单元测试（cargo test）、真实应用 E2E（WebdriverIO + tauri-driver）；最后补一份人工验证清单覆盖无法自动断言的原生行为。全部产物落盘到 Aether 仓库，问题只进清单不修复。

**Tech Stack:** Vitest 3、@testing-library/react、jsdom、WebdriverIO 8、tauri-driver、msedgedriver、cargo test。

**Git 说明（重要）：** 沙箱无法写入 `D:\Pneuma\Workspace\Aether\.git`（权限策略限制），因此本计划不含 commit 步骤；所有产物以文件落盘，M6 提供用户执行的 git 命令清单（目标分支 `test/audit-v0.1.2`）。任何被本计划标记为"生产代码"的文件都不许改动；测试若需要触碰生产文件，先记入 `docs/audit-findings.md` 征求用户同意。

---

## 文件结构总览

**新增文件**
- `vitest.config.ts` — Vitest 配置（jsdom + setup 文件）
- `src/test/setup.ts` — 测试环境 polyfill
- `src/test/smoke.test.ts` — 测试基建自检
- `src/lib/date.test.ts` — 日期工具测试
- `src/stores/planStore.test.ts` — 计划 store 测试
- `src/stores/settingsStore.test.ts` — 设置 store 测试
- `src/stores/uiStore.test.ts` — UI store 测试
- `src/components/plan/AddPlan.test.tsx` — 添加计划组件测试
- `src/components/plan/PlanItem.test.tsx` — 计划项组件测试
- `src/components/plan/DateGroup.test.tsx` — 日期导航组件测试
- `src/components/plan/PlanList.test.tsx` — 计划列表组件测试
- `src/components/layout/AppShell.test.tsx` — 外壳组件测试
- `src/components/layout/Titlebar.test.tsx` — 标题栏组件测试
- `src/hooks/useWindow.test.tsx` — 窗口 hook 测试
- `src/hooks/usePlans.test.tsx` — 计划 hook 测试
- `e2e/wdio.conf.ts` — WebdriverIO 配置
- `e2e/tsconfig.json` — E2E TypeScript 配置
- `e2e/specs/smoke.spec.ts` — E2E 连通自检
- `e2e/specs/plans.spec.ts` — 计划 CRUD/日期导航 E2E
- `e2e/specs/settings.spec.ts` — 设置窗口 E2E
- `e2e/specs/persistence-seed.spec.ts` — 重启持久化（第一轮：写入数据）
- `e2e/specs/persistence-verify.spec.ts` — 重启持久化（第二轮：验证数据）
- `e2e/specs/drag.spec.ts` — 拖拽排序 E2E
- `tests/manual-checklist.md` — 人工功能验证清单
- `docs/audit-findings.md` — 审计问题清单
- `docs/test-report-2026-08-18.md` — 测试报告

**修改文件（仅测试基建，不动生产逻辑）**
- `package.json` — 新增 scripts + devDependencies
- `src-tauri/src/settings.rs` — 文件末尾追加 `#[cfg(test)] mod tests`
- `src-tauri/src/commands.rs` — 不修改（无独立可测纯逻辑，见 Task 17 说明）

---

## Task 1: M0 环境准备（网络权限 + 工具链）

**Files:**
- 修改: `package.json`

- [ ] **Step 1: 申请网络权限**

调用 `request_permissions`，请求 `network: enabled`，理由：安装 vitest / webdriverio / msedgedriver / tauri-driver 需要下载依赖。若被拒，停下并向用户说明无法安装测试依赖。

- [ ] **Step 2: 确认基础工具版本**

Run（工作目录 `D:\Pneuma\Workspace\Aether`）：
```powershell
node --version
pnpm --version
cargo --version
rustc --version
```
Expected: node ≥ 18、pnpm ≥ 9、cargo/rustc 正常输出版本号。

- [ ] **Step 3: 查询本机 Edge 主版本（msedgedriver 需匹配）**

Run：
```powershell
(Get-Item 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe').VersionInfo.ProductVersion
```
记下主版本号（如 `130`）。若该路径不存在，用 `Get-Command msedge.exe` 或注册表 `HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\msedge.exe` 定位。

- [ ] **Step 4: 修改 package.json（scripts + devDependencies）**

将 `package.json` 的 `scripts` 改为：
```json
{
  "dev": "vite",
  "build": "tsc && vite build",
  "preview": "vite preview",
  "tauri": "tauri",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage",
  "test:rust": "cargo test --manifest-path src-tauri/Cargo.toml",
  "test:e2e": "wdio run e2e/wdio.conf.ts"
}
```

在 `devDependencies` 中追加（保留已有条目）：
```json
{
  "vitest": "^3.0.0",
  "jsdom": "^25.0.0",
  "@testing-library/react": "^16.0.0",
  "@testing-library/user-event": "^14.5.2",
  "@vitest/coverage-v8": "^3.0.0",
  "@wdio/cli": "^8.40.0",
  "@wdio/local-runner": "^8.40.0",
  "@wdio/mocha-framework": "^8.40.0",
  "@wdio/spec-reporter": "^8.40.0",
  "webdriverio": "^8.40.0",
  "ts-node": "^10.9.2",
  "msedgedriver": "^<Step3得到的主版本>.0.0"
}
```

- [ ] **Step 5: 安装前端依赖**

Run：
```powershell
pnpm install
```
Expected: 无 peer 冲突报错，`node_modules` 出现 vitest、webdriverio 等。

- [ ] **Step 6: 安装 tauri-driver**

Run：
```powershell
cargo install tauri-driver
```
Expected: 编译成功后 `tauri-driver --help` 可运行（默认安装到 `%USERPROFILE%\.cargo\bin`，确认在 PATH 中）。

- [ ] **Step 7: 验证 msedgedriver 可被 tauri-driver 发现**

Run：
```powershell
Get-Command msedgedriver
```
若不在 PATH：将 `node_modules\.bin` 加入当前会话 PATH，或 `pnpm exec msedgedriver --version` 确认可执行，并记下所在路径供 wdio 配置使用。

- [ ] **Step 8: 冒烟启动应用（关键验证点）**

Run：
```powershell
pnpm tauri build --debug --no-bundle
```
Expected: 前端构建成功，`src-tauri\target\debug\aether.exe` 生成。

然后手动运行 `src-tauri\target\debug\aether.exe`，确认窗口出现、无崩溃。

**决策点（M0）：** 若 `cargo install tauri-driver` 或 msedgedriver 无法完成（网络/编译失败），停止 E2E 相关任务，在 `docs/audit-findings.md` 记录环境阻断，并采用降级方案：仅执行 Task 2–17、22、23，其中 E2E 场景改为人工清单执行（在 `tests/manual-checklist.md` 中把 E2E 场景标注为"手工执行"）。不得为了绕过限制修改生产代码。

---

## Task 2: M1 静态基线

**Files:**
- 新增: `docs/audit-findings.md`（仅创建文件头与模板，本任务不填发现）

- [ ] **Step 1: 前端类型检查 + 构建**

Run：
```powershell
pnpm build
```
Expected: `tsc` 无错误，vite 构建完成，`dist/` 更新。若失败：这是审计发现，按 Task 3 的格式记入 `docs/audit-findings.md`，然后继续（不修复）。

- [ ] **Step 2: Rust 编译检查**

Run：
```powershell
cargo check --manifest-path src-tauri/Cargo.toml
```
Expected: `Finished` 无 error。若失败：同样记入发现清单。

- [ ] **Step 3: 创建审计清单文件模板**

创建 `docs/audit-findings.md`，内容：
```markdown
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
```

验证：文件可打开，表头齐全。

---

## Task 3: M2 代码审计 — 前端数据流与状态

**Files:**
- 修改: `docs/audit-findings.md`（追加发现行）

- [ ] **Step 1: 通读数据层文件**

Read（完整阅读）：
- `src/db/database.ts`
- `src/stores/planStore.ts`
- `src/stores/settingsStore.ts`
- `src/stores/uiStore.ts`
- `src/hooks/usePlans.ts`
- `src/hooks/useSettings.ts`
- `src/hooks/useWindow.ts`
- `src/hooks/useContextMenu.ts`

- [ ] **Step 2: 逐条核查约束（每条都给出结论）**

检查项与依据：
1. DB 单例：`rg "plugin-sql" src` 只应命中 `src/db/database.ts` 一处 import。
2. SQL 参数化：`rg "SELECT|INSERT|UPDATE|DELETE" src/db/database.ts` 全部使用 `$1,$2` 占位符，无字符串拼接值。
3. 组件不直连 DB：`rg "database" src/components` 应无命中。
4. 乐观更新：planStore 中 set 是否在 await 之前；失败不回滚是否符合文档说明（记录为"已知取舍"，不算缺陷）。
5. 事件监听清理：useWindow / useContextMenu / AppShell / settingsStore.load 的 listener 是否都有清理；`cancelled` 标志是否覆盖所有 `.then` 回调。
6. selector 订阅粒度：`rg "useUIStore\\(|useSettingsStore\\(" src` 逐个确认没有整 store 订阅导致的全量重渲染（DateGroup 已拆分，检查是否有其他组件回退）。

- [ ] **Step 3: 记录发现**

对每条检查项：发现问题就按格式追加一行到 `docs/audit-findings.md`（ID 从 `F-001` 递增）；无问题则在本任务说明里记录"已核查，无问题"。发现必须包含文件:行号与具体代码证据。

---

## Task 4: M2 代码审计 — 前端组件与样式

**Files:**
- 修改: `docs/audit-findings.md`

- [ ] **Step 1: 通读组件文件**

Read（完整阅读）：
- `src/components/plan/AddPlan.tsx`、`PlanItem.tsx`、`DateGroup.tsx`、`PlanList.tsx`
- `src/components/layout/AppShell.tsx`、`Titlebar.tsx`
- `src/components/settings/ColorPicker.tsx`、`SliderField.tsx`、`CheckboxField.tsx`、`ImagePicker.tsx`
- `src/App.tsx`、`MainApp.tsx`、`SettingsApp.tsx`、`src/main.tsx`、`src/lib/cn.ts`、`src/lib/date.ts`

- [ ] **Step 2: 检查动态类名与 Tailwind v4 兼容**

Run：
```powershell
rg 'className=\{`|className=\{[^}]*\$\{' src
```
Expected: 无命中（动态 cursor 已改为 inline style）。命中即记发现。

- [ ] **Step 3: 检查组件级问题**

检查项：
1. AddPlan 纯受控：不读 `inputRef.current?.value`（`rg "inputRef" src/components/plan/AddPlan.tsx` 只应出现在 focus 调用）。
2. PlanItem 编辑流：空内容提交走删除、Escape 还原、双击进入编辑；`useSortable({ disabled: isEditing })`。
3. PlanList 分组偏移：`dailyDoneOffset` / `todayUndoneOffset` / `todayDoneOffset` 与 reorderPlan 的全局索引是否一致。
4. AppShell resize 手柄 z-index 与 Titlebar `z-[60]` 是否重叠遮挡按钮。
5. 无障碍：可点击元素是否都有可辨识的 aria-label / title（如删除按钮 title="Delete plan"）。缺失记"建议"。
6. 硬编码中英混排文案（placeholder/title），记"建议"。

- [ ] **Step 4: 记录发现**（格式同 Task 3 Step 3，ID 续号）

---

## Task 5: M2 代码审计 — Rust 窗口、设置与安全

**Files:**
- 修改: `docs/audit-findings.md`

- [ ] **Step 1: 通读 Rust 文件**

Read（完整阅读）：
- `src-tauri/src/lib.rs`
- `src-tauri/src/commands.rs`
- `src-tauri/src/settings.rs`
- `src-tauri/tauri.conf.json`
- `src-tauri/capabilities/default.json`

- [ ] **Step 2: 逐条核查（每条给出结论）**

1. 窗口生命周期：`CloseRequested` 是否 prevent_close + hide（main 与 settings 两个窗口）；settings 窗口是否存在"销毁后用同 label 重建"路径（`rg "WebviewWindowBuilder" src-tauri/src`）。
2. NOACTIVATE 闭环：lib.rs 中 `set_window_noactivate` / `show_and_focus` / `activate_main_window` 是否成对；失焦事件是否重新启用 NOACTIVATE；托盘与右键菜单唤出是否走 `show_and_focus`。
3. 位置/大小恢复顺序：setup 中是否先 `set_size` 再 `set_position`，且使用 Physical 坐标。
4. 设置 JSON 容错：`load_settings` 对损坏文件是否回退默认值；`save_settings` 是否原子写（先写临时文件再 rename）——非原子写记"建议"。
5. 安全面：
   - `assetProtocol.scope: "**"` 是否过宽（记"建议"，附 tauri.conf.json 行号）。
   - `csp: null` 是否可接受（记"建议"）。
   - capabilities 权限是否最小化（`sql:allow-execute`、`core:event:allow-emit` 等是否被不必要窗口共享）。
   - `quit_app` / `show_settings_window` 命令是否有越权风险。
6. 版本一致性：`rg "0\.1\.2" package.json src-tauri/tauri.conf.json src-tauri/Cargo.toml` 三处应一致。

- [ ] **Step 3: 记录发现**（格式同 Task 3，ID 续号）

---

## Task 6: M2 代码审计 — 性能、可维护性与打包

**Files:**
- 修改: `docs/audit-findings.md`

- [ ] **Step 1: 运行检索命令**

```powershell
rg ": any|as any" src src-tauri
rg "console\.log" src
rg "setTimeout" src
rg "TODO|FIXME|HACK" src src-tauri/src
```

- [ ] **Step 2: 检查项**

1. `any` 滥用；2. 遗留 console.log；3. 未清理的 setTimeout（对照 useWindow 防抖、AppShell previewTimer）；4. 死代码/未使用导出（`rg "export (function|const|interface)" src` 后逐个确认引用）；5. 重复工具函数（对照 `src/lib/date.ts` 是否还有其他文件重复定义 fmtDate/今天/偏移）；6. `.gitignore` 是否遗漏 `docs/` 生成的测试产物；7. `bundle.resources` 的 WebView2Loader.dll 路径是否存在（`Test-Path src-tauri/target/release/WebView2Loader.dll`）。

- [ ] **Step 3: 记录发现**（ID 续号）。完成后在 `docs/audit-findings.md` 末尾追加：

```markdown
> 审计范围完成：前端数据流/组件、Rust 窗口与设置、安全、性能、可维护性、打包配置。发现数：N 条。
```

---

## Task 7: M3 单元测试基建

**Files:**
- 新增: `vitest.config.ts`、`src/test/setup.ts`、`src/test/smoke.test.ts`

- [ ] **Step 1: 创建 vitest.config.ts**

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    globals: false,
    css: false,
  },
});
```

- [ ] **Step 2: 创建 src/test/setup.ts**

```ts
import { vi } from "vitest";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
```

- [ ] **Step 3: 创建冒烟测试 src/test/smoke.test.ts**

```ts
import { describe, it, expect } from "vitest";

describe("test infrastructure", () => {
  it("runs in jsdom with vitest", () => {
    expect(typeof window).toBe("object");
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 4: 运行验证**

Run：
```powershell
pnpm test
```
Expected: `Test Files 1 passed (1)`、`Tests 1 passed (1)`。

---

## Task 8: M3 单元测试 — src/lib/date.ts

**Files:**
- 新增: `src/lib/date.test.ts`

- [ ] **Step 1: 编写测试 src/lib/date.test.ts**

```ts
import { describe, it, expect, vi, afterEach } from "vitest";
import { fmtDate, today, shiftDate } from "./date";

afterEach(() => {
  vi.useRealTimers();
});

describe("fmtDate", () => {
  it("pads single-digit month/day", () => {
    expect(fmtDate(2026, 1, 3)).toBe("2026-01-03");
  });

  it("keeps two-digit values unchanged", () => {
    expect(fmtDate(2026, 12, 31)).toBe("2026-12-31");
  });
});

describe("shiftDate", () => {
  it("moves forward across month boundary", () => {
    expect(shiftDate("2026-01-31", 1)).toBe("2026-02-01");
  });

  it("moves backward across year boundary", () => {
    expect(shiftDate("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("handles zero delta", () => {
    expect(shiftDate("2026-06-15", 0)).toBe("2026-06-15");
  });

  it("handles leap day", () => {
    expect(shiftDate("2028-02-29", 1)).toBe("2028-03-01");
  });
});

describe("today", () => {
  it("returns local date in YYYY-MM-DD", () => {
    vi.setSystemTime(new Date(2026, 7, 18, 10, 0, 0));
    expect(today()).toBe("2026-08-18");
  });
});
```

- [ ] **Step 2: 运行**

Run：
```powershell
pnpm vitest run src/lib/date.test.ts
```
Expected: 6 个测试全部 PASS。若任何用例失败：把失败现象作为"中/高"发现记入 `docs/audit-findings.md`（证据 = 失败断言），不要修改 `date.ts`。

---

## Task 9: M3 单元测试 — src/stores/planStore.ts

**Files:**
- 新增: `src/stores/planStore.test.ts`

- [ ] **Step 1: 编写测试**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../db/database", () => ({
  fetchPlansByDate: vi.fn(),
  insertPlan: vi.fn(),
  updatePlan: vi.fn(),
  deletePlan: vi.fn(),
  bulkUpdateSortOrders: vi.fn(),
}));

import { usePlanStore } from "./planStore";
import {
  fetchPlansByDate,
  insertPlan,
  updatePlan,
  deletePlan,
  bulkUpdateSortOrders,
} from "../db/database";
import type { Plan } from "../types/plan";

const mFetch = vi.mocked(fetchPlansByDate);
const mInsert = vi.mocked(insertPlan);
const mUpdate = vi.mocked(updatePlan);
const mDelete = vi.mocked(deletePlan);
const mBulk = vi.mocked(bulkUpdateSortOrders);

const plan = (id: number, overrides: Partial<Plan> = {}): Plan => ({
  id,
  date: "daily",
  content: `plan-${id}`,
  done: false,
  sort_order: id,
  is_daily: true,
  ...overrides,
});

beforeEach(() => {
  usePlanStore.setState({ plans: [] });
  vi.clearAllMocks();
});

describe("loadPlans", () => {
  it("orders groups daily-undone → daily-done → today-undone → today-done, sorted by sort_order", async () => {
    mFetch.mockResolvedValue([
      plan(3, { date: "2026-08-18", is_daily: false, done: true, sort_order: 0 }),
      plan(1, { date: "daily", done: false, sort_order: 5 }),
      plan(4, { date: "2026-08-18", is_daily: false, done: false, sort_order: 2 }),
      plan(2, { date: "daily", done: true, sort_order: 1 }),
      plan(5, { date: "daily", done: false, sort_order: 0 }),
    ]);

    await usePlanStore.getState().loadPlans("2026-08-18");

    expect(usePlanStore.getState().plans.map((p) => p.id)).toEqual([5, 1, 4, 3]);
    expect(mFetch).toHaveBeenCalledWith("2026-08-18");
  });
});

describe("addPlan", () => {
  it("appends to today-undone with next sort_order", async () => {
    usePlanStore.setState({
      plans: [
        plan(1, { date: "2026-08-18", is_daily: false, done: false, sort_order: 0 }),
        plan(2, { date: "2026-08-18", is_daily: false, done: true, sort_order: 1 }),
      ],
    });
    mInsert.mockResolvedValue(plan(3, { date: "2026-08-18", is_daily: false, sort_order: 1 }));

    const created = await usePlanStore.getState().addPlan({
      date: "2026-08-18",
      content: "new",
    });

    expect(created.sort_order).toBe(1);
    expect(mInsert).toHaveBeenCalledWith({
      date: "2026-08-18",
      content: "new",
      sort_order: 1,
    });
    expect(usePlanStore.getState().plans.map((p) => p.id)).toEqual([1, 3, 2]);
  });

  it("uses provided sort_order when given", async () => {
    mInsert.mockResolvedValue(plan(9, { sort_order: 42 }));
    await usePlanStore.getState().addPlan({ content: "x", sort_order: 42 });
    expect(mInsert.mock.calls[0][0].sort_order).toBe(42);
  });
});

describe("togglePlan", () => {
  it("moves a plan to bottom of done group and persists new sort_order", async () => {
    usePlanStore.setState({
      plans: [
        plan(1, { done: false, sort_order: 0 }),
        plan(2, { done: false, sort_order: 1 }),
      ],
    });

    await usePlanStore.getState().togglePlan(1);

    const state = usePlanStore.getState().plans;
    expect(state.find((p) => p.id === 1)?.done).toBe(true);
    expect(state.find((p) => p.id === 1)?.sort_order).toBe(1);
    expect(state.map((p) => p.id)).toEqual([2, 1]);
    expect(mUpdate).toHaveBeenCalledWith({ id: 1, done: true, sort_order: 1 });
  });

  it("moves a done plan to bottom of undone group when unchecked", async () => {
    usePlanStore.setState({
      plans: [
        plan(1, { done: true, sort_order: 0 }),
        plan(2, { done: true, sort_order: 1 }),
      ],
    });

    await usePlanStore.getState().togglePlan(1);

    const state = usePlanStore.getState().plans;
    expect(state.find((p) => p.id === 1)?.done).toBe(false);
    expect(state.find((p) => p.id === 1)?.sort_order).toBe(1);
    expect(state.map((p) => p.id)).toEqual([2, 1]);
    expect(mUpdate).toHaveBeenCalledWith({ id: 1, done: false, sort_order: 1 });
  });
});

describe("removePlan / editPlanContent", () => {
  it("removes from state and calls deletePlan", async () => {
    usePlanStore.setState({ plans: [plan(1), plan(2)] });
    await usePlanStore.getState().removePlan(1);
    expect(usePlanStore.getState().plans.map((p) => p.id)).toEqual([2]);
    expect(mDelete).toHaveBeenCalledWith(1);
  });

  it("updates content optimistically and calls updatePlan", async () => {
    usePlanStore.setState({ plans: [plan(1)] });
    await usePlanStore.getState().editPlanContent(1, "edited");
    expect(usePlanStore.getState().plans[0].content).toBe("edited");
    expect(mUpdate).toHaveBeenCalledWith({ id: 1, content: "edited" });
  });
});

describe("reorderPlan", () => {
  it("reorders and persists all sort orders", async () => {
    usePlanStore.setState({
      plans: [plan(1, { sort_order: 0 }), plan(2, { sort_order: 1 }), plan(3, { sort_order: 2 })],
    });

    await usePlanStore.getState().reorderPlan(1, 2);

    expect(usePlanStore.getState().plans.map((p) => p.id)).toEqual([2, 3, 1]);
    expect(usePlanStore.getState().plans.map((p) => p.sort_order)).toEqual([0, 1, 2]);
    expect(mBulk).toHaveBeenCalledWith([
      { id: 2, sort_order: 0 },
      { id: 3, sort_order: 1 },
      { id: 1, sort_order: 2 },
    ]);
  });

  it("no-ops when id not found or index unchanged", async () => {
    await usePlanStore.getState().reorderPlan(999, 0);
    expect(mBulk).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: 运行**

Run：
```powershell
pnpm vitest run src/stores/planStore.test.ts
```
Expected: 全部 PASS。若有失败：先复核测试期望是否与文档描述的数据流一致；确认是产品逻辑问题则记入发现清单，不改产品代码。

---

## Task 10: M3 单元测试 — src/stores/settingsStore.ts

**Files:**
- 新增: `src/stores/settingsStore.test.ts`

- [ ] **Step 1: 编写测试**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
  convertFileSrc: vi.fn((p: string) => `asset://${p}`),
}));

vi.mock("@tauri-apps/api/webviewWindow", () => ({
  getCurrentWebviewWindow: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-autostart", () => ({
  enable: vi.fn(),
  disable: vi.fn(),
}));

import { invoke } from "@tauri-apps/api/core";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { enable, disable } from "@tauri-apps/plugin-autostart";
import { hexToRgba, applyCssSettings, useSettingsStore } from "./settingsStore";
import { DEFAULT_SETTINGS } from "../types/settings";

const mInvoke = vi.mocked(invoke);
const mGetWin = vi.mocked(getCurrentWebviewWindow);
const mEnable = vi.mocked(enable);
const mDisable = vi.mocked(disable);

function fakeWin(label: string) {
  return {
    label,
    listen: vi.fn().mockResolvedValue(() => {}),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  useSettingsStore.setState({ settings: { ...DEFAULT_SETTINGS }, loaded: false });
  document.documentElement.style.cssText = "";
});

describe("hexToRgba", () => {
  it("expands 3-digit hex", () => {
    expect(hexToRgba("#fff", 0.5)).toBe("rgba(255, 255, 255, 0.5)");
  });

  it("parses 6-digit hex", () => {
    expect(hexToRgba("#123456", 1)).toBe("rgba(18, 52, 86, 1)");
  });

  it("clamps alpha to [0,1]", () => {
    expect(hexToRgba("#000000", 1.5)).toBe("rgba(0, 0, 0, 1)");
    expect(hexToRgba("#000000", -0.2)).toBe("rgba(0, 0, 0, 0)");
  });

  it("returns transparent for invalid hex", () => {
    expect(hexToRgba("red", 0.5)).toBe("transparent");
  });
});

describe("applyCssSettings", () => {
  it("does nothing when window label is not main", () => {
    mGetWin.mockReturnValue(fakeWin("settings") as never);
    applyCssSettings(DEFAULT_SETTINGS);
    expect(document.documentElement.style.getPropertyValue("--settings-font-color")).toBe("");
  });

  it("applies CSS variables on main window", () => {
    mGetWin.mockReturnValue(fakeWin("main") as never);
    applyCssSettings({ ...DEFAULT_SETTINGS, font_color: "#ff0000", font_size: 16 });
    expect(document.documentElement.style.getPropertyValue("--settings-font-color")).toBe("#ff0000");
    expect(document.documentElement.style.getPropertyValue("--settings-font-size")).toBe("16px");
    expect(document.documentElement.style.getPropertyValue("--settings-bg-image")).toBe("none");
  });

  it("converts bg image path via convertFileSrc", () => {
    mGetWin.mockReturnValue(fakeWin("main") as never);
    applyCssSettings({ ...DEFAULT_SETTINGS, bg_image_path: "C:\\bg.png" });
    expect(document.documentElement.style.getPropertyValue("--settings-bg-image")).toContain("asset://");
  });
});

describe("updateSetting", () => {
  it("updates store state", () => {
    mGetWin.mockReturnValue(fakeWin("main") as never);
    useSettingsStore.getState().updateSetting("font_size", 20);
    expect(useSettingsStore.getState().settings.font_size).toBe(20);
  });
});

describe("load", () => {
  it("merges fetched settings with defaults and marks loaded", async () => {
    mGetWin.mockReturnValue(fakeWin("main") as never);
    mInvoke.mockResolvedValue({ font_size: 18 });

    await useSettingsStore.getState().load();

    expect(useSettingsStore.getState().loaded).toBe(true);
    expect(useSettingsStore.getState().settings.font_size).toBe(18);
    expect(useSettingsStore.getState().settings.font_color).toBe(DEFAULT_SETTINGS.font_color);
  });

  it("marks loaded on failure without throwing", async () => {
    mGetWin.mockReturnValue(fakeWin("main") as never);
    mInvoke.mockRejectedValue(new Error("boom"));

    await useSettingsStore.getState().load();

    expect(useSettingsStore.getState().loaded).toBe(true);
  });
});

describe("save", () => {
  it("persists and applies autostart", async () => {
    mInvoke.mockResolvedValue(undefined);
    mEnable.mockResolvedValue(undefined);
    mDisable.mockResolvedValue(undefined);
    useSettingsStore.setState({ settings: { ...DEFAULT_SETTINGS, auto_start: true } });

    await useSettingsStore.getState().save();

    expect(mInvoke).toHaveBeenCalledWith("save_settings", {
      settings: expect.objectContaining({ auto_start: true }),
      persist: true,
    });
    expect(mEnable).toHaveBeenCalled();
  });

  it("disables autostart when turned off", async () => {
    mInvoke.mockResolvedValue(undefined);
    mDisable.mockResolvedValue(undefined);
    useSettingsStore.setState({ settings: { ...DEFAULT_SETTINGS, auto_start: false } });

    await useSettingsStore.getState().save();

    expect(mDisable).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: 运行**

Run：
```powershell
pnpm vitest run src/stores/settingsStore.test.ts
```
Expected: 全部 PASS。失败则按既定规则处理（复核期望 → 记入发现清单，不改产品代码）。

---

## Task 11: M3 单元测试 — src/stores/uiStore.ts

**Files:**
- 新增: `src/stores/uiStore.test.ts`

- [ ] **Step 1: 编写测试**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useUIStore } from "./uiStore";

beforeEach(() => {
  localStorage.clear();
  useUIStore.setState({
    selectedDate: "2026-08-18",
    headerText: "",
    isInitialized: false,
    isLoading: false,
    isWindowFocused: true,
  });
});

describe("date navigation", () => {
  it("goes to previous day", () => {
    useUIStore.getState().goToPrevDay();
    expect(useUIStore.getState().selectedDate).toBe("2026-08-17");
  });

  it("goes to next day across month boundary", () => {
    useUIStore.setState({ selectedDate: "2026-08-31" });
    useUIStore.getState().goToNextDay();
    expect(useUIStore.getState().selectedDate).toBe("2026-09-01");
  });

  it("goes back to today", () => {
    useUIStore.setState({ selectedDate: "2026-01-01" });
    useUIStore.getState().goToToday();
    expect(useUIStore.getState().selectedDate).not.toBe("2026-01-01");
  });
});

describe("header text", () => {
  it("persists to localStorage", () => {
    useUIStore.getState().setHeaderText("hello");
    expect(localStorage.getItem("aether-header-text")).toBe("hello");
    expect(useUIStore.getState().headerText).toBe("hello");
  });

  it("reads existing localStorage on fresh store creation", async () => {
    localStorage.setItem("aether-header-text", "restored");
    vi.resetModules();
    const fresh = await import("./uiStore");
    expect(fresh.useUIStore.getState().headerText).toBe("restored");
  });
});
```

- [ ] **Step 2: 运行**

Run：
```powershell
pnpm vitest run src/stores/uiStore.test.ts
```
Expected: 全部 PASS。

---

## Task 12: M3 单元测试 — AddPlan 组件

**Files:**
- 新增: `src/components/plan/AddPlan.test.tsx`

- [ ] **Step 1: 编写测试**

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mAddPlan = vi.fn().mockResolvedValue(undefined);
const mAddDailyPlan = vi.fn().mockResolvedValue(undefined);

vi.mock("../../hooks/usePlans", () => ({
  usePlans: () => ({
    addPlan: mAddPlan,
    addDailyPlan: mAddDailyPlan,
  }),
}));

import { AddPlan } from "./AddPlan";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AddPlan", () => {
  it("adds a trimmed today plan on Enter", async () => {
    const user = userEvent.setup();
    render(<AddPlan />);

    await user.type(screen.getByPlaceholderText("Add a plan..."), "  buy milk  ");
    await user.keyboard("{Enter}");

    expect(mAddPlan).toHaveBeenCalledWith("buy milk");
    expect(mAddDailyPlan).not.toHaveBeenCalled();
  });

  it("switches to daily and adds a daily plan", async () => {
    const user = userEvent.setup();
    render(<AddPlan />);

    await user.click(screen.getByRole("button", { name: "Today" }));
    await user.type(screen.getByPlaceholderText("Add a daily must-do..."), "meditate");
    await user.keyboard("{Enter}");

    expect(mAddDailyPlan).toHaveBeenCalledWith("meditate");
  });

  it("ignores empty input", async () => {
    const user = userEvent.setup();
    render(<AddPlan />);

    await user.type(screen.getByPlaceholderText("Add a plan..."), "   ");
    await user.keyboard("{Enter}");

    expect(mAddPlan).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: 运行**

Run：
```powershell
pnpm vitest run src/components/plan/AddPlan.test.tsx
```
Expected: 全部 PASS。

---

## Task 13: M3 单元测试 — PlanItem 组件

**Files:**
- 新增: `src/components/plan/PlanItem.test.tsx`

- [ ] **Step 1: 编写测试**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@dnd-kit/sortable", () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: () => {},
    transform: null,
    transition: undefined,
    isDragging: false,
  }),
}));

vi.mock("@dnd-kit/utilities", () => ({
  CSS: { Transform: { toString: () => "" } },
}));

import { PlanItem } from "./PlanItem";
import type { Plan } from "../../types/plan";

const plan: Plan = {
  id: 1,
  date: "2026-08-18",
  content: "write tests",
  done: false,
  sort_order: 0,
  is_daily: false,
};

describe("PlanItem", () => {
  it("renders content and calls onToggle on checkbox click", async () => {
    const onToggle = vi.fn();
    const user = userEvent.setup();
    render(<PlanItem plan={plan} onToggle={onToggle} onDelete={vi.fn()} onEdit={vi.fn()} />);

    expect(screen.getByText("write tests")).toBeTruthy();
    const checkbox = screen.getAllByRole("button")[0];
    await user.click(checkbox);
    expect(onToggle).toHaveBeenCalled();
  });

  it("edits content on double click and commits with Enter", async () => {
    const onEdit = vi.fn();
    const user = userEvent.setup();
    render(<PlanItem plan={plan} onToggle={vi.fn()} onDelete={vi.fn()} onEdit={onEdit} />);

    await user.dblClick(screen.getByText("write tests"));
    const input = screen.getByDisplayValue("write tests");
    await user.clear(input);
    await user.type(input, "updated");
    await user.keyboard("{Enter}");

    expect(onEdit).toHaveBeenCalledWith("updated");
  });

  it("deletes when edit becomes empty", async () => {
    const onDelete = vi.fn();
    const user = userEvent.setup();
    render(<PlanItem plan={plan} onToggle={vi.fn()} onDelete={onDelete} onEdit={vi.fn()} />);

    await user.dblClick(screen.getByText("write tests"));
    await user.clear(screen.getByDisplayValue("write tests"));
    await user.keyboard("{Enter}");

    expect(onDelete).toHaveBeenCalled();
  });

  it("calls onDelete from delete button", async () => {
    const onDelete = vi.fn();
    const user = userEvent.setup();
    render(<PlanItem plan={plan} onToggle={vi.fn()} onDelete={onDelete} onEdit={vi.fn()} />);

    await user.click(screen.getByTitle("Delete plan"));
    expect(onDelete).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: 运行**

Run：
```powershell
pnpm vitest run src/components/plan/PlanItem.test.tsx
```
Expected: 全部 PASS。

---

## Task 14: M3 单元测试 — DateGroup 组件

**Files:**
- 新增: `src/components/plan/DateGroup.test.tsx`

- [ ] **Step 1: 编写测试**

```tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useUIStore } from "../../stores/uiStore";
import { DateGroup } from "./DateGroup";

beforeEach(() => {
  useUIStore.setState({ selectedDate: "2026-08-18" });
});

describe("DateGroup", () => {
  it("shows Today label for current date", () => {
    render(<DateGroup />);
    expect(screen.getByRole("button", { name: /Today/ })).toBeTruthy();
  });

  it("navigates to previous day", async () => {
    const user = userEvent.setup();
    render(<DateGroup />);
    await user.click(screen.getByRole("button", { name: "Previous day" }));
    expect(useUIStore.getState().selectedDate).toBe("2026-08-17");
  });

  it("navigates to next day", async () => {
    const user = userEvent.setup();
    render(<DateGroup />);
    await user.click(screen.getByRole("button", { name: "Next day" }));
    expect(useUIStore.getState().selectedDate).toBe("2026-08-19");
  });

  it("returns to today", async () => {
    const user = userEvent.setup();
    render(<DateGroup />);
    await user.click(screen.getByRole("button", { name: /Today/ }));
    expect(useUIStore.getState().selectedDate).toBe("2026-08-18");
  });
});
```

- [ ] **Step 2: 运行**

Run：
```powershell
pnpm vitest run src/components/plan/DateGroup.test.tsx
```
Expected: 全部 PASS。

---

## Task 15: M3 单元测试 — PlanList 组件

**Files:**
- 新增: `src/components/plan/PlanList.test.tsx`

- [ ] **Step 1: 编写测试**

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mToggle = vi.fn();
const mRemove = vi.fn();
const mEdit = vi.fn();
const mReorder = vi.fn();

const defaultReturn = {
  plans: [],
  dailyPlans: [
    { id: 1, date: "daily", content: "daily undone", done: false, sort_order: 0, is_daily: true },
    { id: 2, date: "daily", content: "daily done", done: true, sort_order: 0, is_daily: true },
  ],
  datePlans: [
    { id: 3, date: "2026-08-18", content: "today undone", done: false, sort_order: 0, is_daily: false },
  ],
  selectedDate: "2026-08-18",
  addPlan: vi.fn(),
  addDailyPlan: vi.fn(),
  togglePlan: mToggle,
  removePlan: mRemove,
  editPlanContent: mEdit,
  reorderPlan: mReorder,
};

vi.mock("../../hooks/usePlans", () => ({
  usePlans: vi.fn(() => defaultReturn),
}));

vi.mock("@dnd-kit/sortable", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@dnd-kit/sortable")>();
  return {
    ...mod,
    useSortable: () => ({
      attributes: {},
      listeners: {},
      setNodeRef: () => {},
      transform: null,
      transition: undefined,
      isDragging: false,
    }),
  };
});

vi.mock("@dnd-kit/utilities", () => ({
  CSS: { Transform: { toString: () => "" } },
}));

import { usePlans } from "../../hooks/usePlans";
import { PlanList } from "./PlanList";

const usePlansMock = vi.mocked(usePlans);

beforeEach(() => {
  vi.clearAllMocks();
  usePlansMock.mockReturnValue(defaultReturn);
});

describe("PlanList", () => {
  it("renders grouped sections and items", () => {
    render(<PlanList />);
    expect(screen.getByText("Daily")).toBeTruthy();
    expect(screen.getByText("Today")).toBeTruthy();
    expect(screen.getByText("daily undone")).toBeTruthy();
    expect(screen.getByText("daily done")).toBeTruthy();
    expect(screen.getByText("today undone")).toBeTruthy();
  });

  it("shows empty state when no plans", () => {
    usePlansMock.mockReturnValueOnce({
      ...defaultReturn,
      dailyPlans: [],
      datePlans: [],
    });
    render(<PlanList />);
    expect(screen.getByText("No daily plans yet")).toBeTruthy();
    expect(screen.getByText("No plans for today. Add one below.")).toBeTruthy();
  });

  it("calls togglePlan when clicking a checkbox", async () => {
    const user = userEvent.setup();
    render(<PlanList />);
    const item = screen.getByText("daily undone").closest("[data-plan-id]");
    const checkbox = item!.querySelector("button")!;
    await user.click(checkbox);
    expect(mToggle).toHaveBeenCalledWith(1);
  });
});
```

- [ ] **Step 2: 运行**

Run：
```powershell
pnpm vitest run src/components/plan/PlanList.test.tsx
```
Expected: 全部 PASS。

---

## Task 16: M3 单元测试 — AppShell / Titlebar / hooks

**Files:**
- 新增: `src/components/layout/AppShell.test.tsx`、`src/components/layout/Titlebar.test.tsx`、`src/hooks/useWindow.test.tsx`、`src/hooks/usePlans.test.tsx`

- [ ] **Step 1: 编写 AppShell.test.tsx**

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const mInvoke = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => mInvoke(...args),
}));

vi.mock("@tauri-apps/api/webviewWindow", () => ({
  getCurrentWebviewWindow: () => ({
    label: "main",
    startResizeDragging: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(() => Promise.resolve(() => {})),
}));

import { AppShell } from "./AppShell";
import { useUIStore } from "../../stores/uiStore";

beforeEach(() => {
  vi.clearAllMocks();
  useUIStore.setState({ isWindowFocused: true });
});

describe("AppShell", () => {
  it("invokes activate_main_window on pointer down", () => {
    render(<AppShell><div>child</div></AppShell>);
    fireEvent.pointerDown(screen.getByText("child"));
    expect(mInvoke).toHaveBeenCalledWith("activate_main_window");
  });

  it("toggles glass-focused class with focus state", () => {
    useUIStore.setState({ isWindowFocused: false });
    render(<AppShell><div /></AppShell>);
    const shell = document.querySelector(".glass-shell");
    expect(shell!.className).toContain("glass-blurred");
  });
});
```

- [ ] **Step 2: 编写 Titlebar.test.tsx**

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mClose = vi.fn();

vi.mock("../../hooks/useWindow", () => ({
  useWindow: () => ({ close: mClose, minimize: vi.fn() }),
}));

import { Titlebar } from "./Titlebar";
import { useUIStore } from "../../stores/uiStore";

beforeEach(() => {
  vi.clearAllMocks();
  useUIStore.setState({ headerText: "", isWindowFocused: true });
});

describe("Titlebar", () => {
  it("calls close on hide button click", async () => {
    const user = userEvent.setup();
    render(<Titlebar />);
    await user.click(screen.getByTitle("隐藏到托盘"));
    expect(mClose).toHaveBeenCalled();
  });

  it("updates header text through the store", async () => {
    const user = userEvent.setup();
    render(<Titlebar />);
    await user.type(screen.getByPlaceholderText("Type something..."), "my header");
    expect(useUIStore.getState().headerText).toBe("my header");
  });
});
```

- [ ] **Step 3: 编写 useWindow.test.tsx**

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const mInvoke = vi.fn().mockResolvedValue(undefined);

const fakeWindow = {
  outerPosition: vi.fn().mockResolvedValue({ x: 100, y: 200 }),
  innerSize: vi.fn().mockResolvedValue({ width: 380, height: 560 }),
  onFocusChanged: vi.fn().mockResolvedValue(() => {}),
  onMoved: vi.fn().mockResolvedValue(() => {}),
  onResized: vi.fn().mockResolvedValue(() => {}),
  minimize: vi.fn(),
  close: vi.fn(),
};

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => fakeWindow,
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => mInvoke(...args),
}));

import { useWindow } from "./useWindow";
import { useSettingsStore } from "../stores/settingsStore";
import { DEFAULT_SETTINGS } from "../types/settings";

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  useSettingsStore.setState({
    settings: { ...DEFAULT_SETTINGS, remember_position: true },
    loaded: true,
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useWindow", () => {
  it("persists position after move debounce", async () => {
    renderHook(() => useWindow());

    const movedCb = fakeWindow.onMoved.mock.calls[0][0];
    act(() => movedCb());
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(mInvoke).toHaveBeenCalledWith("save_settings", expect.objectContaining({
      settings: expect.objectContaining({ window_x: 100, window_y: 200 }),
    }));
  });

  it("does not persist when remember_position is off", async () => {
    useSettingsStore.setState({
      settings: { ...DEFAULT_SETTINGS, remember_position: false },
      loaded: true,
    });
    renderHook(() => useWindow());

    const movedCb = fakeWindow.onMoved.mock.calls[0][0];
    act(() => movedCb());
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(mInvoke).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 4: 编写 usePlans.test.tsx**

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

vi.mock("../db/database", () => ({
  fetchPlansByDate: vi.fn().mockResolvedValue([]),
  insertPlan: vi.fn(),
  updatePlan: vi.fn(),
  deletePlan: vi.fn(),
  bulkUpdateSortOrders: vi.fn(),
}));

import { usePlans } from "./usePlans";
import { useUIStore } from "../stores/uiStore";

beforeEach(() => {
  vi.clearAllMocks();
  useUIStore.setState({ selectedDate: "2026-08-18", isLoading: false });
});

describe("usePlans", () => {
  it("loads plans for the selected date", async () => {
    const { result } = renderHook(() => usePlans());
    expect(result.current.selectedDate).toBe("2026-08-18");
    await waitFor(() => expect(useUIStore.getState().isLoading).toBe(false));
  });
});
```

- [ ] **Step 5: 运行全部单元测试**

Run：
```powershell
pnpm test
```
Expected: 所有 `src/**/*.test.*` 通过。失败项按既定规则处理。

---

## Task 17: M3 Rust 单元测试 — settings.rs

**Files:**
- 修改: `src-tauri/src/settings.rs`（仅在文件末尾追加 `#[cfg(test)] mod tests`，不改任何现有代码）

- [ ] **Step 1: 追加测试模块**

在 `src-tauri/src/settings.rs` 末尾追加：

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_settings_have_expected_values() {
        let s = AppSettings::default();
        assert_eq!(s.font_size, 14);
        assert_eq!(s.font_color, "rgba(255, 255, 255, 0.95)");
        assert_eq!(s.bg_opacity_focused, 0.45);
        assert_eq!(s.bg_image_path, None);
        assert!(!s.remember_position);
        assert!(!s.auto_start);
    }

    #[test]
    fn serde_roundtrip_preserves_all_fields() {
        let s = AppSettings {
            font_color: "#123456".into(),
            font_size: 18,
            bg_color_focused: "#000000".into(),
            bg_opacity_focused: 0.5,
            bg_color_blurred: "#FFFFFF".into(),
            bg_opacity_blurred: 0.1,
            bg_image_path: Some("C:/bg.png".into()),
            bg_image_opacity: 0.8,
            bg_image_position_x: 20.0,
            bg_image_position_y: 80.0,
            click_through: true,
            remember_position: true,
            auto_start: true,
            window_x: Some(10.0),
            window_y: Some(20.0),
            window_width: Some(380.0),
            window_height: Some(560.0),
        };
        let json = serde_json::to_string(&s).unwrap();
        let back: AppSettings = serde_json::from_str(&json).unwrap();
        assert_eq!(back.font_color, s.font_color);
        assert_eq!(back.font_size, s.font_size);
        assert_eq!(back.bg_color_focused, s.bg_color_focused);
        assert_eq!(back.bg_opacity_focused, s.bg_opacity_focused);
        assert_eq!(back.bg_color_blurred, s.bg_color_blurred);
        assert_eq!(back.bg_opacity_blurred, s.bg_opacity_blurred);
        assert_eq!(back.bg_image_path, s.bg_image_path);
        assert_eq!(back.bg_image_opacity, s.bg_image_opacity);
        assert_eq!(back.bg_image_position_x, s.bg_image_position_x);
        assert_eq!(back.bg_image_position_y, s.bg_image_position_y);
        assert_eq!(back.click_through, s.click_through);
        assert_eq!(back.remember_position, s.remember_position);
        assert_eq!(back.auto_start, s.auto_start);
        assert_eq!(back.window_x, s.window_x);
        assert_eq!(back.window_y, s.window_y);
        assert_eq!(back.window_width, s.window_width);
        assert_eq!(back.window_height, s.window_height);
    }

    #[test]
    fn missing_fields_fail_to_deserialize() {
        let json = r#"{"font_color":"#fff"}"#;
        assert!(serde_json::from_str::<AppSettings>(json).is_err());
    }

    #[test]
    fn corrupt_json_is_rejected_by_serde() {
        // load_settings 对坏文件通过 .ok() + unwrap_or_default() 回退默认值；
        // 这里验证 serde 层面对坏 JSON 的失败行为，作为该容错路径的依据。
        let json = "{ not valid json ";
        assert!(serde_json::from_str::<AppSettings>(json).is_err());
    }
}
```

- [ ] **Step 2: 运行 Rust 测试**

Run：
```powershell
pnpm test:rust
```
Expected: `test result: ok. 4 passed`。若编译失败，只修测试模块本身，不许改生产代码。

**说明：** `commands.rs` 中 `get_settings` / `save_settings` / `quit_app` / `show_settings_window` 都依赖 `tauri::AppHandle` 或进程副作用，无独立纯逻辑，不做单测；其行为由 Task 19–21 的 E2E 与审计覆盖。

---

## Task 18: M4 E2E 基建

**Files:**
- 新增: `e2e/wdio.conf.ts`、`e2e/tsconfig.json`

- [ ] **Step 1: 创建 e2e/tsconfig.json**

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2021",
    "esModuleInterop": true,
    "strict": false,
    "skipLibCheck": true,
    "types": ["node", "webdriverio/async", "@wdio/mocha-framework"]
  },
  "include": ["./**/*.ts"]
}
```

- [ ] **Step 2: 创建 e2e/wdio.conf.ts**

```ts
import type { Options } from "@wdio/types";

export const config: Options.Testrunner = {
  runner: "local",
  hostname: "127.0.0.1",
  port: 4444,
  path: "/",
  specs: ["./e2e/specs/**/*.spec.ts"],
  exclude: [],
  maxInstances: 1,
  capabilities: [
    {
      maxInstances: 1,
      "tauri:options": {
        application: "../src-tauri/target/debug/aether.exe",
      },
    },
  ],
  logLevel: "info",
  outputDir: "e2e/.logs",
  framework: "mocha",
  mochaOpts: {
    ui: "bdd",
    timeout: 60000,
  },
  reporters: ["spec"],
  autoCompileOpts: {
    tsNodeOpts: {
      project: "./e2e/tsconfig.json",
    },
  },
};
```

注意（执行时按实际环境修正，只改测试配置）：
1. `application` 路径按 wdio 实际运行的工作目录解析；若报"应用路径不存在"，改为绝对路径 `D:\\Pneuma\\Workspace\\Aether\\src-tauri\\target\\debug\\aether.exe`。
2. 若 TS 编译报 `webdriverio/async` 类型找不到，把 `e2e/tsconfig.json` 的 `types` 改为 `["node", "@wdio/globals/types"]` 或安装 `@wdio/globals` 后引用其类型。
3. `tauri-driver` 若提示找不到 WebDriver：确认 msedgedriver 与 Edge 主版本一致，且其目录在 PATH 中。

- [ ] **Step 3: 确保应用为 debug 构建**

Run：
```powershell
pnpm tauri build --debug --no-bundle
```
Expected: `src-tauri\target\debug\aether.exe` 存在且可启动。

- [ ] **Step 4: 启动 tauri-driver 并验证会话**

先启动 driver（独立终端）：
```powershell
tauri-driver
```
Expected: 监听 `127.0.0.1:4444`，无报错。

再运行一个最小 smoke spec 验证连通（先创建 `e2e/specs/smoke.spec.ts`）：
```ts
import { expect } from "@wdio/globals";

describe("Aether smoke", () => {
  it("loads the main window", async () => {
    await browser.pause(3000);
    const title = await browser.getTitle();
    expect(title).toContain("Aether");
  });
});
```

Run：
```powershell
pnpm test:e2e -- --spec e2e/specs/smoke.spec.ts
```
Expected: `1 passing`。若驱动连接失败：检查 tauri-driver 输出与 msedgedriver 路径；只调整 E2E 配置，不改产品代码。若 30 分钟内无法连通，按 M0 决策点降级。

---

## Task 19: M4 E2E — 计划 CRUD 与日期导航

**Files:**
- 新增: `e2e/specs/plans.spec.ts`

- [ ] **Step 1: 编写 plans.spec.ts**

```ts
import { expect } from "@wdio/globals";

async function addPlan(text: string) {
  const input = await $("input[placeholder='Add a plan...']");
  await input.setValue(text);
  await browser.keys("Enter");
}

describe("plans", () => {
  it("adds, toggles, edits and deletes a plan", async () => {
    await addPlan("e2e-test-plan");
    const item = await $(`[data-plan-id]`);
    await expect(item).toBeExisting();
    await expect(item).toHaveText(expect.stringContaining("e2e-test-plan"));

    // toggle done
    const checkbox = await item.$("button");
    await checkbox.click();
    await browser.pause(300);

    // edit via double click
    const textEl = await item.$("span");
    await textEl.doubleClick();
    const input = await item.$("input");
    await input.setValue("e2e-test-plan-edited");
    await browser.keys("Enter");
    await browser.pause(300);
    await expect(item).toHaveText(expect.stringContaining("e2e-test-plan-edited"));

    // delete
    const del = await item.$("button[title='Delete plan']");
    await del.click();
    await browser.pause(300);
    const remaining = await $$("[data-plan-id]");
    const texts = await Promise.all(remaining.map((el) => el.getText()));
    expect(texts.join("\n")).not.toContain("e2e-test-plan-edited");
  });

  it("navigates dates and shows empty state", async () => {
    await browser.$("button[aria-label='Previous day']").click();
    await browser.pause(300);
    await browser.$("button[aria-label='Next day']").click();
    await browser.pause(300);
    const center = await browser.$("button").getText();
    expect(center.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: 运行**

确保 tauri-driver 在运行，然后：
```powershell
pnpm test:e2e -- --spec e2e/specs/plans.spec.ts
```
Expected: `2 passing`。若选择器/时序问题导致失败：调整测试代码（如增加 `browser.pause`、改用 `$$` 过滤），不改产品代码。若某项功能确实异常：记入 `docs/audit-findings.md`（证据 = E2E 失败输出 + 复现步骤）。

---

## Task 20: M4 E2E — 设置窗口与持久化（跨重启两轮）

**Files:**
- 新增: `e2e/specs/settings.spec.ts`、`e2e/specs/persistence-seed.spec.ts`、`e2e/specs/persistence-verify.spec.ts`

- [ ] **Step 1: 编写 settings.spec.ts**

```ts
import { expect } from "@wdio/globals";

describe("settings window", () => {
  it("opens, changes font size, saves, and reloads from disk", async () => {
    // 通过 Tauri 内部 invoke 打开设置窗口（测试专用访问）
    await browser.execute(() =>
      (window as unknown as { __TAURI_INTERNALS__: { invoke: (c: string) => Promise<unknown> } })
        .__TAURI_INTERNALS__.invoke("show_settings_window")
    );
    await browser.pause(1000);

    // 切到 settings 窗口（若只有一个窗口句柄则跳过切换）
    const handles = await browser.getWindowHandles();
    if (handles.length > 1) {
      await browser.switchWindow(handles[handles.length - 1]);
    }

    const fontSlider = await $("input[type='range']");
    await fontSlider.setValue("18");
    await browser.pause(300);
    await $("button*=保存").click();
    await browser.pause(500);

    // 读取设置文件确认落盘
    const fs = await import("node:fs");
    const path = await import("node:path");
    const home = process.env.USERPROFILE!;
    const settingsPath = path.join(
      home,
      "AppData",
      "Roaming",
      "com.aether.desktop",
      "aether_settings.json"
    );
    const raw = fs.readFileSync(settingsPath, "utf8");
    expect(JSON.parse(raw).font_size).toBe(18);
  });
});
```

注意：设置文件实际目录以 `settings_path` 的 `app_config_dir()` 解析结果为准。若上面的路径不对，用 `rg "aether_settings" "$env:APPDATA"` 找到真实位置后修正本测试路径（只改测试）。

- [ ] **Step 2: 编写 persistence-seed.spec.ts（第一轮：写入数据）**

```ts
import { expect } from "@wdio/globals";

describe("persistence seed", () => {
  it("adds a plan that must survive restart", async () => {
    const input = await $("input[placeholder='Add a plan...']");
    await input.setValue("survives-restart");
    await browser.keys("Enter");
    await browser.pause(300);
    await expect($(`[data-plan-id]`)).toBeExisting();
  });
});
```

- [ ] **Step 3: 编写 persistence-verify.spec.ts（第二轮：验证数据）**

```ts
import { expect } from "@wdio/globals";

describe("persistence verify", () => {
  it("finds the plan added in the previous run", async () => {
    const items = await $$("[data-plan-id]");
    const texts = await Promise.all(items.map((el) => el.getText()));
    expect(texts.join("\n")).toContain("survives-restart");
  });
});
```

- [ ] **Step 4: 两轮运行（模拟重启）**

第一次运行（写入）：
```powershell
pnpm test:e2e -- --spec e2e/specs/persistence-seed.spec.ts
```
Expected: `1 passing`。

关闭应用进程，重新启动 tauri-driver（或保持 driver，让 wdio 重新拉起应用），第二次运行（验证）：
```powershell
pnpm test:e2e -- --spec e2e/specs/persistence-verify.spec.ts
```
Expected: `1 passing`（证明数据跨进程持久化）。若失败：先确认 seed 运行时确实写入（重启前 UI 可见），再区分是产品问题还是测试问题；产品问题记入发现清单。

---

## Task 21: M4 E2E — 拖拽排序

**Files:**
- 新增: `e2e/specs/drag.spec.ts`

- [ ] **Step 1: 编写 drag.spec.ts**

```ts
import { expect } from "@wdio/globals";

describe("drag reorder", () => {
  it("reorders two plans via pointer drag", async () => {
    const input = await $("input[placeholder='Add a plan...']");
    await input.setValue("first");
    await browser.keys("Enter");
    await input.setValue("second");
    await browser.keys("Enter");
    await browser.pause(300);

    const items = await $$("[data-plan-id]");
    const before = await Promise.all(items.map((el) => el.getText()));
    expect(before.join(",")).toContain("first");
    expect(before.join(",")).toContain("second");

    const [a, b] = items;
    await a.dragAndDrop(b);
    await browser.pause(500);

    const after = await Promise.all((await $$("[data-plan-id]")).map((el) => el.getText()));
    expect(after.join(",")).not.toBe(before.join(","));
  });
});
```

- [ ] **Step 2: 运行**

```powershell
pnpm test:e2e -- --spec e2e/specs/drag.spec.ts
```
Expected: `1 passing`。若 dragAndDrop 对 dnd-kit 不生效，改用 WebdriverIO Action API：

```ts
const a = await $$("[data-plan-id]")[0];
const b = await $$("[data-plan-id]")[1];
await browser.performActions([
  {
    type: "pointer",
    id: "finger",
    parameters: { pointerType: "mouse" },
    actions: [
      { type: "pointerMove", origin: a, x: 0, y: 0 },
      { type: "pointerDown", button: 0 },
      { type: "pause", duration: 200 },
      { type: "pointerMove", origin: b, x: 0, y: 20, duration: 400 },
      { type: "pointerUp", button: 0 },
    ],
  },
]);
```

若 3 次尝试内仍不稳定：把拖拽场景从 E2E 移到 `tests/manual-checklist.md`（标注"自动不稳定，改人工验证"），并在 `docs/test-report-2026-08-18.md` 记录原因。不改产品代码。

---

## Task 22: M5 人工功能验证清单

**Files:**
- 新增: `tests/manual-checklist.md`

- [ ] **Step 1: 创建清单**

```markdown
# Aether 人工功能验证清单（v0.1.2）

> 用途：覆盖 E2E 无法稳定断言的原生行为。逐项勾选，记录环境与结果。
> 日期：____ | 环境：Windows 10+ / DPI ____ | 执行人：____

## 托盘
- [ ] 左键单击托盘图标 → 主窗口显示/隐藏切换
- [ ] 右键托盘 → 菜单含"显示 Aether / 设置... / 退出"
- [ ] "显示 Aether" → 窗口显示并聚焦
- [ ] "退出" → 进程完全退出（任务管理器确认）

## 聚焦与任务栏
- [ ] 点击输入框 → 可正常输入（NOACTIVATE 解除闭环生效）
- [ ] 关闭/最小化其他前台窗口 → Aether 不抢焦点
- [ ] 操作过程中任务栏不出现 Aether 图标（set_skip_taskbar 生效）
- [ ] 点击 Aether 任意区域 → 窗口获得焦点且按钮 hover 态正常

## 窗口行为
- [ ] 拖动标题栏 → 窗口移动
- [ ] 边缘/角落 resize → 窗口缩放且不低于最小尺寸
- [ ] "−" 按钮 → 隐藏到托盘（不退出）
- [ ] 重启后位置/大小恢复（remember_position 开启时）

## 渲染
- [ ] 毛玻璃效果正常（无 GPU 降级闪烁）
- [ ] 前台/后台透明度与颜色符合设置
- [ ] 背景图片显示、位置与透明度正确
- [ ] 字体颜色/大小生效，设置窗口自身字号保持 14px

## 设置窗口
- [ ] 从托盘/右键菜单打开设置窗口
- [ ] 修改设置 → 主窗口实时预览
- [ ] 取消/X → 预览回滚，未保存内容不落盘
- [ ] 保存 → 落盘并关闭；重新打开显示已保存值
- [ ] 连续开关设置窗口 5 次 → 无卡死/白屏

## 多显示器/DPI（如环境允许）
- [ ] 跨显示器移动后重启 → 位置恢复正确
- [ ] 125%/150% 缩放下渲染无错位

## 结果
- 通过项：____ / 总数：____
- 失败项记录：____
```

- [ ] **Step 2: 与用户共同执行**

逐项在真实桌面上验证并勾选。任何失败项：记入 `docs/audit-findings.md`（证据 = 操作步骤 + 观察现象）。

---

## Task 23: M6 测试报告与 git 命令清单

**Files:**
- 新增: `docs/test-report-2026-08-18.md`

- [ ] **Step 1: 汇总各任务结果**

从 `docs/audit-findings.md`、各 `pnpm test` / `pnpm test:rust` / `pnpm test:e2e` 的运行输出、`tests/manual-checklist.md` 勾选结果汇总数据。

- [ ] **Step 2: 生成覆盖率**

Run：
```powershell
pnpm test:coverage
```
Expected: 输出 coverage summary（行/函数/分支覆盖百分比），记入报告。

- [ ] **Step 3: 创建测试报告 docs/test-report-2026-08-18.md**

```markdown
# Aether 测试报告（2026-08-18，v0.1.2）

## 总体结论
- 静态基线：`pnpm build` ____ | `cargo check` ____
- 单元测试：Vitest ____ 个用例，通过 ____ | Rust ____ 个用例，通过 ____
- 覆盖率：行 ____% / 函数 ____% / 分支 ____%
- E2E：通过 ____ / 失败 ____ / 跳过 ____（含拖拽降级说明）
- 人工清单：通过 ____ / 失败 ____
- 审计发现：致命 ____ / 高 ____ / 中 ____ / 低 ____ / 建议 ____

## 关键发现摘要
（从 audit-findings.md 摘录 Top 5，含 ID 与一句话描述）

## E2E 场景结果
| 场景 | 结果 | 备注 |
|------|------|------|
| 启动与空状态 | | |
| 计划增删改查 | | |
| 完成切换 | | |
| 日期导航 | | |
| 拖拽排序 | | |
| 设置修改/保存 | | |
| 重启持久化 | | |
| 设置窗口生命周期 | | |

## 人工清单结果
（引用 tests/manual-checklist.md 的勾选结果）

## 环境阻断与降级记录
（如有：tauri-driver/msedgedriver 安装失败、E2E 降级等）

## 附录：复现步骤
（对每个"高"及以上发现，写最小复现步骤）
```

- [ ] **Step 4: 提供 git 命令清单（用户执行）**

在报告末尾追加：

```markdown
## 提交指引（用户执行）

在 D:\Pneuma\Workspace\Aether 下执行：

git switch -c test/audit-v0.1.2
git add docs/ src/ src-tauri/src/settings.rs tests/ e2e/ vitest.config.ts package.json pnpm-lock.yaml
git commit -m "test: Aether 全面测试（审计 + 自动化测试体系）"
```

- [ ] **Step 5: 全量回归验证**

Run：
```powershell
pnpm test
pnpm test:rust
```
Expected: 全部通过，且 `docs/audit-findings.md` 与报告中的数字一致。

---

## 自检清单（写计划者执行）

- [ ] 每个 spec 需求都能对应到 Task（范围外条目有明确豁免说明）
- [ ] 无 TBD/TODO/"实现细节稍后补"类占位
- [ ] 测试中引用的函数名/类型/属性与当前源码一致（已按 2026-08-18 源码核对）
- [ ] 所有命令含精确路径与预期输出
- [ ] 生产代码改动面：仅 `settings.rs` 追加 `#[cfg(test)]` 模块；其余全部新增文件
