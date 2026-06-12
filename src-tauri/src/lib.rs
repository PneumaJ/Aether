use tauri::{
    image::Image,
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, WebviewUrl, WindowEvent,
};
use tauri_plugin_sql::{Migration, MigrationKind};

mod commands;
mod settings;

const DB_URL: &str = "sqlite:aether.db";

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_plans_table",
            sql: "CREATE TABLE IF NOT EXISTS plans (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL,
                content TEXT NOT NULL,
                done INTEGER NOT NULL DEFAULT 0,
                sort_order INTEGER NOT NULL DEFAULT 0,
                is_daily INTEGER NOT NULL DEFAULT 0
            );
            CREATE INDEX IF NOT EXISTS idx_plans_date ON plans(date);",
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(DB_URL, migrations)
                .build(),
        )
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec![]),
        ))
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // Load and apply saved settings
            let settings = settings::load_settings(&app.handle());
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_focus();
                let _ = window.set_ignore_cursor_events(settings.click_through);
                if settings.remember_position {
                    // Restore size BEFORE position to avoid position-dependent resize
                    if let (Some(w), Some(h)) = (settings.window_width, settings.window_height) {
                        use tauri::PhysicalSize;
                        let _ = window.set_size(PhysicalSize::new(w as u32, h as u32));
                    }
                    if let (Some(x), Some(y)) = (settings.window_x, settings.window_y) {
                        use tauri::PhysicalPosition;
                        let _ = window.set_position(PhysicalPosition::new(x as i32, y as i32));
                    }
                }
            }

            // Ensure settings window exists (create if config didn't auto-create it)
            if app.get_webview_window("settings").is_none() {
                let _ = tauri::webview::WebviewWindowBuilder::new(
                    app,
                    "settings",
                    WebviewUrl::App("index.html".into()),
                )
                .title("Aether - 设置")
                .inner_size(420.0, 520.0)
                .resizable(false)
                .decorations(true)
                .transparent(false)
                .always_on_top(true)
                .center()
                .visible(false)
                .build();
            }

            let show_item =
                MenuItem::with_id(app, "show", "显示 Aether", true, None::<&str>)?;
            let settings_item =
                MenuItem::with_id(app, "settings", "设置", true, None::<&str>)?;
            let quit_item =
                MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
            let separator = PredefinedMenuItem::separator(app)?;

            let menu = Menu::with_items(
                app,
                &[&show_item, &settings_item, &separator, &quit_item],
            )?;

            let tray_icon = Image::from_bytes(include_bytes!("../icons/tray-icon.png"))
                .expect("Failed to load tray icon");

            let _tray = TrayIconBuilder::with_id("aether-tray")
                .icon(tray_icon)
                .tooltip("Aether - Daily Plans")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| {
                    match event.id.as_ref() {
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.unminimize();
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                        "settings" => {
                            let _ = commands::show_settings_window(app.clone());
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            if window.is_visible().unwrap_or(false) {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                let label = window.label();
                if label == "main" || label == "settings" {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_settings,
            commands::save_settings,
            commands::quit_app,
            commands::show_settings_window,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|_app_handle, _event| {});
}
