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

describe("persistence verify", () => {
  it("finds the plan added in the previous run", async () => {
    await switchToMainWindow();
    const texts = await browser.execute(() =>
      Array.from(document.querySelectorAll("[data-plan-id]")).map(
        (el) => (el as HTMLElement).innerText
      )
    );
    expect(texts.join("\n")).toContain("survives-restart");
  });
});
