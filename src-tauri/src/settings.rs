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
