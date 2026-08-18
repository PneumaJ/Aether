describe("cleanup leftover test plans", () => {
  it("removes test artifacts from previous failed runs", async () => {
    const deadline = Date.now() + 20000;
    while (Date.now() < deadline) {
      const handles = await browser.getWindowHandles();
      for (const h of handles) {
        await browser.switchToWindow(h);
        if (await browser.$("input[placeholder='Add a plan...']").isExisting()) break;
      }
      if (await browser.$("input[placeholder='Add a plan...']").isExisting()) break;
      await browser.pause(500);
    }

    while (true) {
      const items = await $$("[data-plan-id]");
      let found = false;
      for (const item of items) {
        const text = (await item.getText()).trim();
        if (/^e2e-test-plan(-edited)?$/.test(text) || text === "survives-restart") {
          await item.$("button[title='Delete plan']").click();
          await browser.pause(300);
          found = true;
          break;
        }
      }
      if (!found) break;
    }
  });
});
