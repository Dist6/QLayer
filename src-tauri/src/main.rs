use tauri_plugin_opener::OpenerExt;
use tauri::{Manager, WindowEvent};

mod global_hotkeys;
mod tray;

#[tauri::command]
fn open_codex_url(app: tauri::AppHandle, url: String) -> Result<(), String> {
    if !is_allowed_codex_url(&url) {
        return Err("QoLayer blocked an unsupported Codex link.".to_string());
    }

    app.opener()
        .open_url(url, None::<&str>)
        .map_err(|_| {
            "Codex could not be opened. Make sure Codex is installed and deep links are enabled."
                .to_string()
        })
}

#[tauri::command]
fn get_tray_status(app: tauri::AppHandle) -> tray::TrayStatus {
    tray::tray_status(app)
}

#[tauri::command]
fn get_global_hotkey_status(app: tauri::AppHandle) -> global_hotkeys::GlobalHotkeyStatus {
    global_hotkeys::global_hotkey_status(app)
}

fn is_allowed_codex_url(url: &str) -> bool {
    matches!(url, "codex://" | "codex://settings" | "codex://threads/new")
}

fn main() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, shortcut, event| {
                    global_hotkeys::handle_global_hotkey(app, shortcut, event.state());
                })
                .build(),
        )
        .manage(tray::TrayState::default())
        .manage(global_hotkeys::GlobalHotkeyState::default())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            tray::setup_tray(app);
            global_hotkeys::setup_global_hotkeys(app);
            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
                tray::record_window_hidden(window.app_handle());
            }
        })
        .invoke_handler(tauri::generate_handler![
            open_codex_url,
            get_tray_status,
            get_global_hotkey_status
        ])
        .run(tauri::generate_context!())
        .expect("error while running QoLayer");
}
