use tauri_plugin_opener::OpenerExt;
use tauri::{Manager, WindowEvent};

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

fn is_allowed_codex_url(url: &str) -> bool {
    matches!(url, "codex://" | "codex://settings" | "codex://threads/new")
}

fn main() {
    tauri::Builder::default()
        .manage(tray::TrayState::default())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            tray::setup_tray(app);
            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
                tray::record_window_hidden(window.app_handle());
            }
        })
        .invoke_handler(tauri::generate_handler![open_codex_url, get_tray_status])
        .run(tauri::generate_context!())
        .expect("error while running QoLayer");
}
