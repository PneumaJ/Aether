import { useEffect } from "react";
import { useSettings } from "./hooks/useSettings";
import { ColorPicker } from "./components/settings/ColorPicker";
import { SliderField } from "./components/settings/SliderField";
import { CheckboxField } from "./components/settings/CheckboxField";
import { ImagePicker } from "./components/settings/ImagePicker";
import { getCurrentWebviewWindow, getAllWebviewWindows } from "@tauri-apps/api/webviewWindow";

const appWindow = getCurrentWebviewWindow();

function focusMain() {
  getAllWebviewWindows().then((wins) => {
    wins.find((w) => w.label === "main")?.setFocus();
  });
}

function focusSelf() {
  appWindow.setFocus();
}

export function SettingsApp() {
  const { settings, updateSetting, save, resetDefaults } = useSettings();

  // Lock settings window font-size independently of the main window setting
  useEffect(() => {
    document.documentElement.style.fontSize = "14px";
  }, []);

  const handleSave = async () => {
    await save();
    appWindow.close();
  };

  if (!settings) {
    return (
      <div className="h-screen flex items-center justify-center text-gray-500">
        加载中...
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white text-gray-900 font-sans select-none">
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
        {/* Appearance section */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            外观
          </h2>
          <div className="space-y-3">
            <ColorPicker
              label="字体颜色"
              value={settings.font_color}
              onChange={(v) => updateSetting("font_color", v)}
            />
            <SliderField
              label="字体大小"
              value={settings.font_size}
              min={10}
              max={24}
              step={1}
              unit="px"
              onChange={(v) => updateSetting("font_size", v)}
            />
            <div onPointerDown={focusMain}>
              <SliderField
                label="背景不透明度（聚焦）"
                value={Math.round(settings.bg_opacity_focused * 100)}
                min={5}
                max={95}
                step={5}
                unit="%"
                onChange={(v) => updateSetting("bg_opacity_focused", v / 100)}
              />
            </div>
            <div onPointerDown={focusSelf}>
              <SliderField
                label="背景不透明度（失焦）"
                value={Math.round(settings.bg_opacity_blurred * 100)}
                min={0}
                max={50}
                step={1}
                unit="%"
                onChange={(v) => updateSetting("bg_opacity_blurred", v / 100)}
              />
            </div>
          </div>
        </section>

        {/* Background section */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            背景图片
          </h2>
          <ImagePicker
            label=""
            value={settings.bg_image_path ?? ""}
            onChange={(v) => updateSetting("bg_image_path", v || null)}
          />
        </section>

        {/* Behavior section */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            行为
          </h2>
          <div className="space-y-2">
            <CheckboxField
              label="鼠标点击穿透"
              description="窗口忽略鼠标点击（可通过托盘访问）"
              checked={settings.click_through}
              onChange={(v) => updateSetting("click_through", v)}
            />
            <CheckboxField
              label="记住窗口位置"
              description="下次启动时恢复窗口位置"
              checked={settings.remember_position}
              onChange={(v) => updateSetting("remember_position", v)}
            />
            <CheckboxField
              label="开机自启"
              description="登录时自动启动 Aether"
              checked={settings.auto_start}
              onChange={(v) => updateSetting("auto_start", v)}
            />
          </div>
        </section>
      </div>

      {/* Footer actions */}
      <div className="border-t border-gray-200 px-6 py-3 flex items-center justify-between">
        <button
          onClick={resetDefaults}
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
        >
          恢复默认
        </button>
        <button
          onClick={handleSave}
          className="px-5 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-md transition-colors cursor-pointer"
        >
          保存
        </button>
      </div>
    </div>
  );
}
