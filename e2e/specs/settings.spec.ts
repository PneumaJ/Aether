import { expect } from "@wdio/globals";

async function switchToSettingsWindow() {
  const handles = await browser.getWindowHandles();
  for (const h of handles) {
    await browser.switchToWindow(h);
    const hasSave = await browser.$("button*=保存").isExisting();
    if (hasSave) return;
  }
  throw new Error("settings window not found");
}

describe("settings window", () => {
  it("opens, changes font size, saves, and reloads from disk", async () => {
    // 通过 Tauri 内部 invoke 打开设置窗口（测试专用访问）
    await browser.execute(() =>
      (window as unknown as { __TAURI_INTERNALS__: { invoke: (c: string) => Promise<unknown> } })
        .__TAURI_INTERNALS__.invoke("show_settings_window")
    );
    await browser.pause(1000);

    // 切到设置窗口（按 DOM 特征识别，而非窗口句柄顺序）
    await switchToSettingsWindow();

    const fontSlider = await $("input[type='range']");
    // Range inputs don't accept typed values in WebDriver (a click lands on
    // the track, e.g. the midpoint); set via the native setter + input event
    // so React's onChange fires with exactly 18.
    await browser.execute(() => {
      const slider = document.querySelector("input[type='range']") as HTMLInputElement;
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value"
      )!.set!;
      setter.call(slider, "18");
      slider.dispatchEvent(new Event("input", { bubbles: true }));
    });
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
