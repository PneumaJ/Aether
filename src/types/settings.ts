export interface AppSettings {
  font_color: string;
  font_size: number;
  bg_opacity_focused: number;
  bg_opacity_blurred: number;
  bg_image_path: string | null;
  click_through: boolean;
  remember_position: boolean;
  auto_start: boolean;
  window_x: number | null;
  window_y: number | null;
  window_width: number | null;
  window_height: number | null;
}

export const DEFAULT_SETTINGS: AppSettings = {
  font_color: "rgba(255, 255, 255, 0.95)",
  font_size: 14,
  bg_opacity_focused: 0.45,
  bg_opacity_blurred: 0.08,
  bg_image_path: null,
  click_through: false,
  remember_position: false,
  auto_start: false,
  window_x: null,
  window_y: null,
  window_width: null,
  window_height: null,
};
