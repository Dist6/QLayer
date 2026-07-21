use serde::Serialize;
use std::sync::Mutex;
use tauri::image::Image;
use tauri::menu::{MenuBuilder, MenuEvent};
use tauri::tray::{MouseButton, TrayIconBuilder, TrayIconEvent};
use tauri::{App, AppHandle, Emitter, Manager};

const MAIN_WINDOW_LABEL: &str = "main";
const TRAY_EVENT: &str = "qolayer://tray-action";
const TRAY_STATUS_EVENT: &str = "qolayer://tray-status";
const FALLBACK_ICON_RGBA: &[u8] = &[0x54, 0xd3, 0xa1, 0xff];
const SHOW_ITEM_ID: &str = "show-qolayer";
const OPEN_CODEX_ITEM_ID: &str = "open-codex";
const RESTORE_AUDIO_ITEM_ID: &str = "restore-audio";
const ABOUT_ITEM_ID: &str = "about-qolayer";
const QUIT_ITEM_ID: &str = "quit";

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TrayStatus {
    available: bool,
    message: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct TrayActionPayload {
    action: &'static str,
}

pub struct TrayState {
    status: Mutex<TrayStatus>,
}

impl Default for TrayState {
    fn default() -> Self {
        Self {
            status: Mutex::new(TrayStatus {
                available: false,
                message: "Tray has not initialized yet.".to_string(),
            }),
        }
    }
}

impl TrayState {
    pub fn status(&self) -> TrayStatus {
        self.status
            .lock()
            .map(|status| status.clone())
            .unwrap_or_else(|_| TrayStatus {
                available: false,
                message: "Tray status is unavailable.".to_string(),
            })
    }

    fn set_available(&self) {
        self.set_status(true, "System tray is available.");
    }

    fn set_unavailable(&self, message: String) {
        self.set_status(false, message);
    }

    fn set_status(&self, available: bool, message: impl Into<String>) {
        if let Ok(mut status) = self.status.lock() {
            status.available = available;
            status.message = message.into();
        }
    }
}

pub fn record_window_hidden(app: &AppHandle) {
    update_status(app, true, "QLayer is still running in the system tray.");
}

pub fn setup_tray(app: &mut App) {
    let result = try_setup_tray(app);
    let state = app.state::<TrayState>();

    if let Err(error) = result {
        state.set_unavailable(format!("System tray is not available: {error}"));
    } else {
        state.set_available();
    }
}

pub fn tray_status(app: AppHandle) -> TrayStatus {
    app.state::<TrayState>().status()
}

fn try_setup_tray(app: &mut App) -> tauri::Result<()> {
    let menu = MenuBuilder::new(app)
        .text(SHOW_ITEM_ID, "Show QLayer")
        .text(OPEN_CODEX_ITEM_ID, "Open Codex / ChatGPT")
        .text(RESTORE_AUDIO_ITEM_ID, "Restore Audio")
        .text(ABOUT_ITEM_ID, "About QLayer")
        .separator()
        .text(QUIT_ITEM_ID, "Quit")
        .build()?;

    let icon = app
        .default_window_icon()
        .cloned()
        .unwrap_or_else(|| Image::new(FALLBACK_ICON_RGBA, 1, 1));

    if let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) {
        window.set_icon(icon.clone())?;
    }

    TrayIconBuilder::with_id("qolayer-main")
        .icon(icon)
        .tooltip("QLayer")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::DoubleClick {
                button: MouseButton::Left,
                ..
            } = event
            {
                let _ = show_main_window(tray.app_handle());
            }
        })
        .on_menu_event(handle_tray_menu_event)
        .build(app)?;

    Ok(())
}

fn handle_tray_menu_event(app: &AppHandle, event: MenuEvent) {
    match event.id().as_ref() {
        SHOW_ITEM_ID => {
            let _ = show_main_window(app);
        }
        OPEN_CODEX_ITEM_ID => emit_tray_action(app, "openCodex"),
        RESTORE_AUDIO_ITEM_ID => emit_tray_action(app, "restoreAudio"),
        ABOUT_ITEM_ID => {
            let _ = show_main_window(app);
            emit_tray_action(app, "showAbout");
        }
        QUIT_ITEM_ID => app.exit(0),
        _ => {}
    }
}

pub fn show_main_window(app: &AppHandle) -> Result<(), String> {
    let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) else {
        update_status(app, false, "QLayer window is unavailable.");
        return Err("QLayer window is unavailable.".to_string());
    };

    if window.show().is_err() {
        update_status(app, false, "QLayer window could not be shown.");
        return Err("QLayer window could not be shown.".to_string());
    }

    if window.unminimize().is_err() {
        update_status(app, false, "QLayer window could not be restored.");
        return Err("QLayer window could not be restored.".to_string());
    }

    if window.set_focus().is_err() {
        update_status(app, false, "QLayer window could not be focused.");
        return Err("QLayer window could not be focused.".to_string());
    }

    update_status(app, true, "QLayer window is visible.");
    Ok(())
}

pub(crate) fn hide_main_window(app: &AppHandle) -> Result<(), String> {
    let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) else {
        update_status(app, false, "QLayer window is unavailable.");
        return Err("QLayer window is unavailable.".to_string());
    };

    window
        .hide()
        .map_err(|_| "QLayer window could not be hidden.".to_string())?;
    record_window_hidden(app);
    Ok(())
}

fn emit_tray_action(app: &AppHandle, action: &'static str) {
    let _ = app.emit(TRAY_EVENT, TrayActionPayload { action });
}

fn update_status(app: &AppHandle, available: bool, message: impl Into<String>) {
    let state = app.state::<TrayState>();
    state.set_status(available, message);
    let _ = app.emit(TRAY_STATUS_EVENT, state.status());
}
