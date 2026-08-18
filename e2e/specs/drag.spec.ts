// NOTE: This scenario is currently unstable under WebDriver (dnd-kit drag
// does not reliably start via dragAndDrop, the Action API, or synthetic
// PointerEvents). It is excluded from the default `pnpm test:e2e` run and
// tracked in tests/manual-checklist.md as "自动不稳定，改人工验证".
import { expect } from "@wdio/globals";

async function switchToMainWindow(timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const handles = await browser.getWindowHandles();
    for (const h of handles) {
      await browser.switchToWindow(h);
      const hasAddPlan = await browser.$("input[placeholder='Add a plan...']").isExisting();
      if (hasAddPlan) return;
    }
    await browser.pause(500);
  }
  throw new Error("main window not found");
}

describe("drag reorder", () => {
  it("reorders two plans via pointer drag", async () => {
    await switchToMainWindow();
    const input = await $("input[placeholder='Add a plan...']");
    await input.setValue("first");
    await browser.keys("Enter");
    await input.setValue("second");
    await browser.keys("Enter");
    await browser.pause(300);

    const before = await browser.execute(() =>
      Array.from(document.querySelectorAll("[data-plan-id]")).map(
        (el) => (el as HTMLElement).innerText
      )
    );
    expect(before.join(",")).toContain("first");
    expect(before.join(",")).toContain("second");

    const boxes = await browser.execute(() => {
      const items = Array.from(document.querySelectorAll("[data-plan-id]"));
      const first = items.find((el) => el.textContent?.includes("first"))!;
      const second = items.find((el) => el.textContent?.includes("second"))!;
      second.scrollIntoView({ block: "nearest" });
      first.scrollIntoView({ block: "nearest" });
      const r1 = first.getBoundingClientRect();
      const r2 = second.getBoundingClientRect();
      return {
        x1: r1.x + r1.width / 2,
        y1: r1.y + r1.height / 2,
        x2: r2.x + r2.width / 2,
        y2: r2.y + r2.height / 2,
      };
    });

    // dnd-kit needs a real pointer sequence (activation distance 8px);
    // synthesize PointerEvents in-page to drive the PointerSensor directly.
    await browser.execute(({ x1, y1, x2, y2 }) => {
      const items = Array.from(document.querySelectorAll("[data-plan-id]"));
      const first = items.find((el) => el.textContent?.includes("first"))!;
      const make = (type: string, x: number, y: number, buttons: number) =>
        new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          composed: true,
          pointerId: 1,
          pointerType: "mouse",
          isPrimary: true,
          clientX: x,
          clientY: y,
          button: 0,
          buttons,
        });
      first.dispatchEvent(make("pointerdown", x1, y1, 1));
      for (let i = 1; i <= 12; i++) {
        document.dispatchEvent(make("pointermove", x1 + ((x2 - x1) * i) / 12, y1 + ((y2 - y1) * i) / 12, 1));
      }
      document.dispatchEvent(make("pointerup", x2, y2, 0));
    }, boxes);
    await browser.pause(500);

    const after = await browser.execute(() =>
      Array.from(document.querySelectorAll("[data-plan-id]")).map(
        (el) => (el as HTMLElement).innerText
      )
    );
    expect(after.join(",")).not.toBe(before.join(","));

    // cleanup: remove the two plans created by this spec
    for (const name of ["first", "second"]) {
      await browser.execute((n) => {
        const items = Array.from(document.querySelectorAll("[data-plan-id]"));
        const it = items.find((el) => (el as HTMLElement).innerText.includes(n));
        (it?.querySelector("button[title='Delete plan']") as HTMLButtonElement | null)?.click();
      }, name);
      await browser.pause(400);
    }
  });
});
