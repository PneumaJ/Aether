use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub font_color: String,
    pub font_size: u32,
    pub bg_color_focused: String,
    pub bg_opacity_focused: f64,
    pub bg_color_blurred: String,
    pub bg_opacity_blurred: f64,
    pub bg_image_path: Option<String>,
    pub bg_image_opacity: f64,
    pub bg_image_position_x: f64,
    pub bg_image_position_y: f64,
    pub click_through: bool,
    pub remember_position: bool,
    pub auto_start: bool,
    pub window_x: Option<f64>,
    pub window_y: Option<f64>,
    pub window_width: Option<f64>,
    pub window_height: Option<f64>,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            font_color: "rgba(255, 255, 255, 0.95)".into(),
            font_size: 14,
            bg_color_focused: "#000000".into(),
            bg_opacity_focused: 0.45,
            bg_color_blurred: "#FFFFFF".into(),
            bg_opacity_blurred: 0.08,
            bg_image_path: None,
            bg_image_opacity: 1.0,
            bg_image_position_x: 50.0,
            bg_image_position_y: 50.0,
            click_through: false,
            remember_position: false,
            auto_start: false,
            window_x: None,
            window_y: None,
            window_width: None,
            window_height: None,
        }
    }
}

pub fn settings_path(app_handle: &tauri::AppHandle) -> PathBuf {
    let config_dir = app_handle
        .path()
        .app_config_dir()
        .expect("failed to resolve app config dir");
    fs::create_dir_all(&config_dir).ok();
    config_dir.join("aether_settings.json")
}

pub fn load_settings(app_handle: &tauri::AppHandle) -> AppSettings {
    let path = settings_path(app_handle);
    fs::read_to_string(&path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

pub fn save_settings(app_handle: &tauri::AppHandle, settings: &AppSettings) -> Result<(), String> {
    let path = settings_path(app_handle);
    let json = serde_json::to_string_pretty(settings).map_err(|e| e.to_string())?;
    fs::write(&path, json).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_settings_have_expected_values() {
        let s = AppSettings::default();
        assert_eq!(s.font_size, 14);
        assert_eq!(s.font_color, "rgba(255, 255, 255, 0.95)");
        assert_eq!(s.bg_opacity_focused, 0.45);
        assert_eq!(s.bg_image_path, None);
        assert!(!s.remember_position);
        assert!(!s.auto_start);
    }

    #[test]
    fn serde_roundtrip_preserves_all_fields() {
        let s = AppSettings {
            font_color: "#123456".into(),
            font_size: 18,
            bg_color_focused: "#000000".into(),
            bg_opacity_focused: 0.5,
            bg_color_blurred: "#FFFFFF".into(),
            bg_opacity_blurred: 0.1,
            bg_image_path: Some("C:/bg.png".into()),
            bg_image_opacity: 0.8,
            bg_image_position_x: 20.0,
            bg_image_position_y: 80.0,
            click_through: true,
            remember_position: true,
            auto_start: true,
            window_x: Some(10.0),
            window_y: Some(20.0),
            window_width: Some(380.0),
            window_height: Some(560.0),
        };
        let json = serde_json::to_string(&s).unwrap();
        let back: AppSettings = serde_json::from_str(&json).unwrap();
        assert_eq!(back.font_color, s.font_color);
        assert_eq!(back.font_size, s.font_size);
        assert_eq!(back.bg_color_focused, s.bg_color_focused);
        assert_eq!(back.bg_opacity_focused, s.bg_opacity_focused);
        assert_eq!(back.bg_color_blurred, s.bg_color_blurred);
        assert_eq!(back.bg_opacity_blurred, s.bg_opacity_blurred);
        assert_eq!(back.bg_image_path, s.bg_image_path);
        assert_eq!(back.bg_image_opacity, s.bg_image_opacity);
        assert_eq!(back.bg_image_position_x, s.bg_image_position_x);
        assert_eq!(back.bg_image_position_y, s.bg_image_position_y);
        assert_eq!(back.click_through, s.click_through);
        assert_eq!(back.remember_position, s.remember_position);
        assert_eq!(back.auto_start, s.auto_start);
        assert_eq!(back.window_x, s.window_x);
        assert_eq!(back.window_y, s.window_y);
        assert_eq!(back.window_width, s.window_width);
        assert_eq!(back.window_height, s.window_height);
    }

    #[test]
    fn missing_fields_fail_to_deserialize() {
        let json = r##"{"font_color":"#fff"}"##;
        assert!(serde_json::from_str::<AppSettings>(json).is_err());
    }

    #[test]
    fn corrupt_json_is_rejected_by_serde() {
        // load_settings 对坏文件通过 .ok() + unwrap_or_default() 回退默认值；
        // 这里验证 serde 层面对坏 JSON 的失败行为，作为该容错路径的依据。
        let json = "{ not valid json ";
        assert!(serde_json::from_str::<AppSettings>(json).is_err());
    }
}
