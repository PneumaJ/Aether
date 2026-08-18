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

describe("persistence seed", () => {
  it("adds a plan that must survive restart", async () => {
    await switchToMainWindow();
    const input = await $("input[placeholder='Add a plan...']");
    await input.setValue("survives-restart");
    await browser.keys("Enter");
    await browser.pause(300);
    await expect($(`[data-plan-id]`)).toBeExisting();
  });
});
