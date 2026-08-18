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

/// 切换主窗口 WS_EX_NOACTIVATE：开启后系统关闭/最小化其他前台窗口时不会激活 Aether；
/// 显式唤出前必须临时关闭，否则 set_focus 可能失效。
#[cfg(target_os = "windows")]
fn set_window_noactivate<H: raw_window_handle::HasWindowHandle>(window: &H, enable: bool) {
    use raw_window_handle::RawWindowHandle;
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        GetWindowLongPtrW, SetWindowLongPtrW, GWL_EXSTYLE, WS_EX_NOACTIVATE,
    };

    let Ok(handle) = window.window_handle() else {
        return;
    };
    let RawWindowHandle::Win32(win32) = handle.as_raw() else {
        return;
    };
    let hwnd = win32.hwnd.get() as isize as windows_sys::Win32::Foundation::HWND;

    unsafe {
        let style = GetWindowLongPtrW(hwnd, GWL_EXSTYLE);
        let new_style = if enable {
            style | WS_EX_NOACTIVATE as isize
        } else {
            style & !(WS_EX_NOACTIVATE as isize)
        };
        SetWindowLongPtrW(hwnd, GWL_EXSTYLE, new_style);
    }
}

#[cfg(not(target_os = "windows"))]
fn set_window_noactivate<H>(_window: &H, _enable: bool) {}

fn show_and_focus<R: tauri::Runtime>(window: &tauri::WebviewWindow<R>) {
    set_window_noactivate(window, false);
    let _ = window.unminimize();
    let _ = window.show();
    let _ = window.set_focus();
}

#[tauri::command]
fn activate_main_window(app: tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        show_and_focus(&window);
    }
}

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
                // Aether 是托盘驻留小部件：始终不占用任务栏，避免被动聚焦时图标闪现
                let _ = window.set_skip_taskbar(true);
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
                // 启动聚焦完成后再启用 NOACTIVATE，保留启动即聚焦
                set_window_noactivate(&window, true);
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
                                show_and_focus(&window);
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
                                show_and_focus(&window);
                            }
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            match event {
                WindowEvent::CloseRequested { api, .. } => {
                    let label = window.label();
                    if label == "main" || label == "settings" {
                        api.prevent_close();
                        let _ = window.hide();
                    }
                }
                // 失焦即回到"被动小部件"状态：重新启用 NOACTIVATE，防再次聚焦抢占
                WindowEvent::Focused(focused) => {
                    if window.label() == "main" && !*focused {
                        set_window_noactivate(window, true);
                    }
                }
                _ => {}
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_settings,
            commands::save_settings,
            commands::quit_app,
            commands::show_settings_window,
            activate_main_window,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|_app_handle, _event| {});
}
