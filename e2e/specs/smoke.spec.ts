import { expect } from "@wdio/globals";

describe("Aether smoke", () => {
  it("loads the main window", async () => {
    await browser.pause(3000);
    const title = await browser.getTitle();
    expect(title).toContain("Aether");
  });
});
