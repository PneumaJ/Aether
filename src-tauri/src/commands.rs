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

#[tauri::command]
pub fn show_settings_window(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("settings") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
        let _ = app.emit("app://settings-shown", ());
    } else {
        tauri::webview::WebviewWindowBuilder::new(
            &app,
            "settings",
            tauri::WebviewUrl::App("index.html".into()),
        )
        .title("Aether - 设置")
        .inner_size(420.0, 520.0)
        .resizable(false)
        .decorations(true)
        .transparent(false)
        .always_on_top(true)
        .center()
        .visible(true)
        .build()
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}
