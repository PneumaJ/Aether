import { convertFileSrc } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

interface ImagePickerProps {
  value: string;
  onChange: (value: string) => void;
  opacity: number;
  onOpacityChange: (value: number) => void;
}

export function ImagePicker({ value, onChange, opacity, onOpacityChange }: ImagePickerProps) {
  const handleBrowse = async () => {
    const selected = await open({
      multiple: false,
      filters: [
        {
          name: "Images",
          extensions: ["png", "jpg", "jpeg", "gif", "webp", "bmp"],
        },
      ],
    });
    if (selected) {
      onChange(selected as string);
    }
  };

  const handleClear = () => {
    onChange("");
  };

  const fileName = value ? value.split("\\").pop() ?? value : "";

  if (!value) {
    return (
      <button
        type="button"
        onClick={handleBrowse}
        className="text-xs px-3 py-1.5 text-blue-500 hover:text-blue-600 border border-blue-300 rounded cursor-pointer"
      >
        选择图片 +
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <img
          src={convertFileSrc(value)}
          alt="preview"
          className="w-12 h-12 rounded border border-gray-300 object-cover shrink-0"
        />
        <div className="flex flex-col gap-1.5 min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-gray-400 truncate" title={value}>{fileName}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 shrink-0">透明度</span>
            <input
              type="range"
              min={5}
              max={100}
              step={1}
              value={Math.round(opacity * 100)}
              onChange={(e) => onOpacityChange(Number(e.target.value) / 100)}
              className="w-24 h-1.5 accent-blue-500"
            />
            <span className="text-xs text-gray-500 tabular-nums w-8">{Math.round(opacity * 100)}%</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleBrowse}
          className="text-xs px-2 py-1 text-blue-500 hover:text-blue-600 border border-blue-300 rounded cursor-pointer"
        >
          更换
        </button>
        <button
          type="button"
          onClick={handleClear}
          className="text-xs px-2 py-1 text-red-500 hover:text-red-600 border border-red-300 rounded cursor-pointer"
        >
          移除
        </button>
      </div>
    </div>
  );
}
