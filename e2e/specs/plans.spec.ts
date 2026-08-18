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

async function addPlan(text: string) {
  const input = await $("input[placeholder='Add a plan...']");
  await input.setValue(text);
  await browser.keys("Enter");
}

async function findItemByText(text: string) {
  const items = await $$("[data-plan-id]");
  for (const item of items) {
    const t = await item.getText();
    if (t.includes(text)) return item;
  }
  return null;
}

describe("plans", () => {
  it("adds, toggles, edits and deletes a plan", async () => {
    await switchToMainWindow();
    await addPlan("e2e-test-plan");
    const item = await findItemByText("e2e-test-plan");
    expect(item).toBeTruthy();

    // toggle done
    const checkbox = await item.$("button");
    await checkbox.click();
    await browser.pause(300);

    // edit via double click
    const itemAfterToggle = await findItemByText("e2e-test-plan");
    // WebDriver's pointer-action dblclick makes the app's edit input blur
    // immediately (automation artifact); JS dispatch exercises the same
    // React onDoubleClick handler reliably.
    await browser.execute((text) => {
      const items = document.querySelectorAll("[data-plan-id]");
      for (const it of items) {
        if (it.textContent?.includes(text)) {
          const span = it.querySelector("span");
          span!.dispatchEvent(
            new MouseEvent("dblclick", { bubbles: true, cancelable: true, view: window })
          );
          break;
        }
      }
    }, "e2e-test-plan");
    const input = await browser.$("input[value='e2e-test-plan']");
    await input.waitForExist({ timeout: 5000 });
    // setValue's pointerdown bubbles to AppShell and triggers
    // activate_main_window → set_focus, which blurs the edit input and
    // commits (exits) edit mode. Focus + select + keys avoids pointer events.
    await browser.execute(() => {
      const el = document.querySelector("input[value='e2e-test-plan']") as HTMLInputElement;
      el.focus();
      el.select();
    });
    await browser.keys("e2e-test-plan-edited");
    await browser.keys("Enter");
    await browser.pause(300);
    const edited = await findItemByText("e2e-test-plan-edited");
    expect(edited).toBeTruthy();

    // delete
    const del = await edited.$("button[title='Delete plan']");
    await del.click();
    await browser.pause(300);
    expect(await findItemByText("e2e-test-plan-edited")).toBeNull();
  });

  it("navigates dates and shows empty state", async () => {
    await switchToMainWindow();
    await browser.$("button[aria-label='Previous day']").click();
    await browser.pause(300);
    await browser.$("button[aria-label='Next day']").click();
    await browser.pause(300);
    const center = await browser.$("button").getText();
    expect(center.length).toBeGreaterThan(0);
  });
});
