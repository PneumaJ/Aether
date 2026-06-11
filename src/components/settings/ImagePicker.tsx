import { convertFileSrc } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

interface ImagePickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export function ImagePicker({ label, value, onChange }: ImagePickerProps) {
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

  return (
    <div className="space-y-2">
      <label className="text-sm text-gray-700">{label}</label>
      {value ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 min-w-0">
            <img
              src={convertFileSrc(value)}
              alt="preview"
              className="w-12 h-12 rounded border border-gray-300 object-cover shrink-0"
            />
            <span className="text-xs text-gray-500 truncate min-w-0" title={value}>
              {fileName}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBrowse}
              className="text-xs px-2 py-1 text-blue-500 hover:text-blue-600 border border-blue-300 rounded"
            >
              更换
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="text-xs px-2 py-1 text-red-500 hover:text-red-600 border border-red-300 rounded"
            >
              移除
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleBrowse}
          className="text-xs px-3 py-1.5 text-blue-500 hover:text-blue-600 border border-blue-300 rounded"
        >
          选择图片 +
        </button>
      )}
    </div>
  );
}
