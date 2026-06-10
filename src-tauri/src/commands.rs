use tauri::Emitter;
use tauri::Manager;

use crate::settings::{self, AppSettings};

#[tauri::command]
pub fn get_settings(app: tauri::AppHandle) -> AppSettings {
    settings::load_settings(&app)
}

#[tauri::command]
pub fn save_settings(app: tauri::AppHandle, settings: AppSettings, persist: Option<bool>) -> Result<(), String> {
    let persist = persist.unwrap_or(true);

    // Apply click-through on main window
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_ignore_cursor_events(settings.click_through);
    }

    if persist {
        // Persist to disk
        settings::save_settings(&app, &settings)?;
    }

    // Broadcast to all windows
    let _ = app.emit("app://settings-changed", &settings);

    Ok(())
}

#[tauri::command]
pub fn quit_app(app: tauri::AppHandle) {
    app.exit(0);
}
