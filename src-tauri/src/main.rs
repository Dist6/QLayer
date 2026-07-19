use tauri::{Manager, WindowEvent};
use tauri_plugin_autostart::MacosLauncher;
use tauri_plugin_opener::OpenerExt;

mod audio;
mod chat_discovery;
mod codex_runtime;
mod codex_threads;
mod global_hotkeys;
mod keyboard;
mod tray;
mod window_behavior;
mod window_focus;

#[tauri::command]
fn open_codex_url(app: tauri::AppHandle, url: String) -> Result<(), String> {
    if !codex_threads::is_allowed_codex_url(&url) {
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

#[tauri::command]
fn show_main_window(app: tauri::AppHandle) -> Result<(), String> {
    tray::show_main_window(&app)
}

#[tauri::command]
fn prepare_audio(
    app: tauri::AppHandle,
    mode: String,
    listening_volume_percent: u8,
) -> Result<audio::AudioStep, String> {
    audio::prepare_audio(app, mode, listening_volume_percent)
}

#[tauri::command]
fn restore_audio(app: tauri::AppHandle) -> Result<audio::AudioStep, String> {
    audio::restore_audio(app)
}

#[tauri::command]
fn send_dictation_shortcut(shortcut: String) -> Result<keyboard::KeyboardStep, String> {
    keyboard::send_dictation_shortcut(shortcut)
}

#[tauri::command]
fn press_dictation_shortcut(shortcut: String) -> Result<keyboard::KeyboardStep, String> {
    keyboard::press_dictation_shortcut(shortcut)
}

#[tauri::command]
fn release_dictation_shortcut(shortcut: String) -> Result<keyboard::KeyboardStep, String> {
    keyboard::release_dictation_shortcut(shortcut)
}

#[tauri::command]
fn focus_codex_window(app: tauri::AppHandle) -> window_focus::WindowFocusStep {
    window_focus::focus_codex_window(|| app.opener().open_url("codex://", None::<&str>).is_ok())
}

#[tauri::command]
async fn list_recent_codex_chats() -> Result<Vec<chat_discovery::RecentChat>, String> {
    tauri::async_runtime::spawn_blocking(|| {
        let runtime = codex_runtime::resolve_codex_runtime().map_err(str::to_string)?;
        chat_discovery::list_recent_chats(&runtime)
    })
    .await
    .map_err(|_| "Recent chats are unavailable.".to_string())?
}

#[tauri::command]
fn set_close_to_tray(state: tauri::State<window_behavior::WindowBehaviorState>, enabled: bool) {
    state.set_close_to_tray(enabled);
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
        .manage(audio::AudioState::default())
        .manage(window_behavior::WindowBehaviorState::default())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec!["--minimized"]),
        ))
        .setup(|app| {
            tray::setup_tray(app);
            global_hotkeys::setup_global_hotkeys(app);
            if should_start_minimized(std::env::args()) {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.hide();
                    tray::record_window_hidden(app.handle());
                }
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                if window
                    .app_handle()
                    .state::<window_behavior::WindowBehaviorState>()
                    .close_to_tray()
                {
                    api.prevent_close();
                    let _ = window.hide();
                    tray::record_window_hidden(window.app_handle());
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            open_codex_url,
            get_tray_status,
            get_global_hotkey_status,
            show_main_window,
            prepare_audio,
            restore_audio,
            send_dictation_shortcut,
            press_dictation_shortcut,
            release_dictation_shortcut,
            focus_codex_window,
            list_recent_codex_chats,
            set_close_to_tray
        ])
        .run(tauri::generate_context!())
        .expect("error while running QoLayer");
}

fn should_start_minimized(args: impl IntoIterator<Item = String>) -> bool {
    args.into_iter().any(|argument| argument == "--minimized")
}

#[cfg(test)]
mod tests {
    use super::should_start_minimized;

    #[test]
    fn recognizes_the_autostart_minimized_argument() {
        assert!(should_start_minimized([
            "qolayer.exe".to_string(),
            "--minimized".to_string(),
        ]));
        assert!(!should_start_minimized(["qolayer.exe".to_string()]));
    }
}
