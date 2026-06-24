use serde::Serialize;
use std::sync::Mutex;
use tauri::image::Image;
use tauri::menu::{MenuBuilder, MenuEvent};
use tauri::tray::TrayIconBuilder;
use tauri::{App, AppHandle, Emitter, Manager};

const MAIN_WINDOW_LABEL: &str = "main";
const TRAY_EVENT: &str = "qolayer://tray-action";
const TRAY_STATUS_EVENT: &str = "qolayer://tray-status";
const FALLBACK_ICON_RGBA: &[u8] = &[0x54, 0xd3, 0xa1, 0xff];
const SHOW_ITEM_ID: &str = "show-qolayer";
const START_VOICE_FLOW_ITEM_ID: &str = "start-voice-flow";
const RESTORE_AUDIO_ITEM_ID: &str = "restore-audio";
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
    update_status(app, true, "QoLayer is still running in the system tray.");
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
        .text(SHOW_ITEM_ID, "Show QoLayer")
        .text(START_VOICE_FLOW_ITEM_ID, "Start Voice Flow")
        .text(RESTORE_AUDIO_ITEM_ID, "Restore Audio")
        .separator()
        .text(QUIT_ITEM_ID, "Quit")
        .build()?;

    let icon = app
        .default_window_icon()
        .cloned()
        .unwrap_or_else(|| Image::new(FALLBACK_ICON_RGBA, 1, 1));

    TrayIconBuilder::with_id("qolayer-main")
        .icon(icon)
        .tooltip("QoLayer")
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(handle_tray_menu_event)
        .build(app)?;

    Ok(())
}

fn handle_tray_menu_event(app: &AppHandle, event: MenuEvent) {
    match event.id().as_ref() {
        SHOW_ITEM_ID => show_main_window(app),
        START_VOICE_FLOW_ITEM_ID => emit_tray_action(app, "startVoiceFlow"),
        RESTORE_AUDIO_ITEM_ID => emit_tray_action(app, "restoreAudio"),
        QUIT_ITEM_ID => app.exit(0),
        _ => {}
    }
}

fn show_main_window(app: &AppHandle) {
    let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) else {
        update_status(app, false, "QoLayer window is unavailable.");
        return;
    };

    if window.show().is_err() {
        update_status(app, false, "QoLayer window could not be shown.");
        return;
    }

    if window.unminimize().is_err() {
        update_status(app, false, "QoLayer window could not be restored.");
        return;
    }

    if window.set_focus().is_err() {
        update_status(app, false, "QoLayer window could not be focused.");
        return;
    }

    update_status(app, true, "QoLayer window is visible.");
}

fn emit_tray_action(app: &AppHandle, action: &'static str) {
    let _ = app.emit(TRAY_EVENT, TrayActionPayload { action });
}

fn update_status(app: &AppHandle, available: bool, message: impl Into<String>) {
    let state = app.state::<TrayState>();
    state.set_status(available, message);
    let _ = app.emit(TRAY_STATUS_EVENT, state.status());
}
