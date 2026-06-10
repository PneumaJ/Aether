import { convertFileSrc } from "@tauri-apps/api/core";

interface ImagePickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export function ImagePicker({ label, value, onChange }: ImagePickerProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm text-gray-700">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="图片文件路径（例如 C:\Users\...\image.png）"
          className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-400"
        />
        {value && (
          <div
            className="w-8 h-8 rounded border border-gray-300 bg-cover bg-center shrink-0"
            style={{ backgroundImage: `url('${convertFileSrc(value)}')` }}
          />
        )}
      </div>
    </div>
  );
}
