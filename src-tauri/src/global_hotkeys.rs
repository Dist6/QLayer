use serde::Serialize;
use std::sync::Mutex;
use tauri::{App, AppHandle, Emitter, Manager};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

const GLOBAL_HOTKEY_ACTION_EVENT: &str = "qolayer://global-hotkey-action";
const GLOBAL_HOTKEY_STATUS_EVENT: &str = "qolayer://global-hotkey-status";
const DEFAULT_SHORTCUT: &str = "Ctrl+Alt+Space";

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GlobalHotkeyStatus {
    state: &'static str,
    shortcut: &'static str,
    message: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct GlobalHotkeyActionPayload {
    action: &'static str,
}

pub struct GlobalHotkeyState {
    status: Mutex<GlobalHotkeyStatus>,
}

impl Default for GlobalHotkeyState {
    fn default() -> Self {
        Self {
            status: Mutex::new(GlobalHotkeyStatus {
                state: "notAvailable",
                shortcut: DEFAULT_SHORTCUT,
                message: "Global hotkey has not initialized yet.".to_string(),
            }),
        }
    }
}

impl GlobalHotkeyState {
    pub fn status(&self) -> GlobalHotkeyStatus {
        self.status
            .lock()
            .map(|status| status.clone())
            .unwrap_or_else(|_| GlobalHotkeyStatus {
                state: "notAvailable",
                shortcut: DEFAULT_SHORTCUT,
                message: "Global hotkey status is unavailable.".to_string(),
            })
    }

    fn set_status(&self, state: &'static str, message: impl Into<String>) {
        if let Ok(mut status) = self.status.lock() {
            status.state = state;
            status.shortcut = DEFAULT_SHORTCUT;
            status.message = message.into();
        }
    }
}

pub fn default_shortcut() -> Shortcut {
    Shortcut::new(Some(Modifiers::CONTROL | Modifiers::ALT), Code::Space)
}

pub fn setup_global_hotkeys(app: &mut App) {
    let result = app.global_shortcut().register(default_shortcut());

    match result {
        Ok(()) => update_status(app.handle(), "active", "Global hotkey is active."),
        Err(_error) => update_status(
            app.handle(),
            "failed",
            "Global hotkey could not be registered. It may already be in use.",
        ),
    }
}

pub fn global_hotkey_status(app: AppHandle) -> GlobalHotkeyStatus {
    app.state::<GlobalHotkeyState>().status()
}

pub fn handle_global_hotkey(app: &AppHandle, shortcut: &Shortcut, event: ShortcutState) {
    if let Some(action) = action_for_global_hotkey(shortcut, event) {
        let _ = app.emit(
            GLOBAL_HOTKEY_ACTION_EVENT,
            GlobalHotkeyActionPayload { action },
        );
    }
}

fn action_for_global_hotkey(shortcut: &Shortcut, event: ShortcutState) -> Option<&'static str> {
    if shortcut != &default_shortcut() {
        return None;
    }

    match event {
        ShortcutState::Pressed => Some("startVoiceFlowHold"),
        ShortcutState::Released => Some("stopVoiceFlowHold"),
    }
}

fn update_status(app: &AppHandle, state: &'static str, message: impl Into<String>) {
    let state_store = app.state::<GlobalHotkeyState>();
    state_store.set_status(state, message);
    let _ = app.emit(GLOBAL_HOTKEY_STATUS_EVENT, state_store.status());
}

#[cfg(test)]
mod tests {
    use super::{action_for_global_hotkey, default_shortcut};
    use tauri_plugin_global_shortcut::{Code, Modifiers, Shortcut, ShortcutState};

    #[test]
    fn starts_voice_flow_hold_when_global_hotkey_is_pressed() {
        assert_eq!(
            action_for_global_hotkey(&default_shortcut(), ShortcutState::Pressed),
            Some("startVoiceFlowHold")
        );
    }

    #[test]
    fn stops_voice_flow_hold_when_global_hotkey_is_released() {
        assert_eq!(
            action_for_global_hotkey(&default_shortcut(), ShortcutState::Released),
            Some("stopVoiceFlowHold")
        );
    }

    #[test]
    fn ignores_other_shortcuts() {
        let other_shortcut = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::ALT), Code::KeyM);

        assert_eq!(
            action_for_global_hotkey(&other_shortcut, ShortcutState::Released),
            None
        );
        assert_eq!(
            action_for_global_hotkey(&other_shortcut, ShortcutState::Pressed),
            None
        );
    }

    #[test]
    fn does_not_use_the_old_tap_action() {
        assert_ne!(
            action_for_global_hotkey(&default_shortcut(), ShortcutState::Released),
            Some("startVoiceFlow")
        );
    }
}
