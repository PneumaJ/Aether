interface SliderFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
}

export function SliderField({ label, value, min, max, step, unit, onChange }: SliderFieldProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <label className="text-sm text-gray-700 shrink-0">{label}</label>
      <div className="flex items-center gap-2 flex-1 max-w-56">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 h-1.5 accent-blue-500"
        />
        <span className="text-sm text-gray-500 w-10 text-right tabular-nums">
          {value}{unit}
        </span>
      </div>
    </div>
  );
}
