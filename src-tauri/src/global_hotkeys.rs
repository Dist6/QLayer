use crate::modifier_hotkey::{self, ModifierHotkeyHandle};
use serde::Serialize;
use std::{str::FromStr, sync::Mutex};
use tauri::{App, AppHandle, Emitter, Manager};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

const GLOBAL_HOTKEY_ACTION_EVENT: &str = "qolayer://global-hotkey-action";
const GLOBAL_HOTKEY_STATUS_EVENT: &str = "qolayer://global-hotkey-status";
const DEFAULT_SHORTCUT: &str = "Ctrl+Win";

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GlobalHotkeyStatus {
    state: &'static str,
    shortcut: String,
    message: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct GlobalHotkeyActionPayload {
    action: &'static str,
}

#[derive(Clone, Copy)]
enum ShortcutCandidate {
    ModifierCtrlWin,
    Plugin(Shortcut),
}

struct GlobalHotkeyRegistration {
    plugin_shortcut: Option<Shortcut>,
    modifier_hotkey: Option<ModifierHotkeyHandle>,
    status: GlobalHotkeyStatus,
}

pub struct GlobalHotkeyState {
    registration: Mutex<GlobalHotkeyRegistration>,
}

impl Default for GlobalHotkeyState {
    fn default() -> Self {
        Self {
            registration: Mutex::new(GlobalHotkeyRegistration {
                plugin_shortcut: None,
                modifier_hotkey: None,
                status: GlobalHotkeyStatus {
                    state: "notAvailable",
                    shortcut: DEFAULT_SHORTCUT.to_string(),
                    message: "Global hotkey has not initialized yet.".to_string(),
                },
            }),
        }
    }
}

impl GlobalHotkeyState {
    pub fn status(&self) -> GlobalHotkeyStatus {
        self.registration
            .lock()
            .map(|registration| registration.status.clone())
            .unwrap_or_else(|_| GlobalHotkeyStatus {
                state: "notAvailable",
                shortcut: DEFAULT_SHORTCUT.to_string(),
                message: "Global hotkey status is unavailable.".to_string(),
            })
    }

    fn plugin_shortcut(&self) -> Option<Shortcut> {
        self.registration
            .lock()
            .ok()
            .and_then(|registration| registration.plugin_shortcut)
    }

    fn modifier_hotkey_is_active(&self) -> bool {
        self.registration
            .lock()
            .map(|registration| {
                registration.modifier_hotkey.is_some() && registration.status.state == "active"
            })
            .unwrap_or(false)
    }

    fn plugin_is_active(&self, shortcut: Shortcut) -> bool {
        self.registration
            .lock()
            .map(|registration| {
                registration.plugin_shortcut == Some(shortcut)
                    && registration.status.state == "active"
            })
            .unwrap_or(false)
    }

    fn set_failed(&self, message: impl Into<String>) {
        if let Ok(mut registration) = self.registration.lock() {
            registration.status.state = "failed";
            registration.status.message = message.into();
        }
    }

    fn set_active_modifier(&self, handle: ModifierHotkeyHandle) -> Option<ModifierHotkeyHandle> {
        let mut registration = self.registration.lock().ok()?;
        registration.plugin_shortcut = None;
        let previous = registration.modifier_hotkey.replace(handle);
        registration.status = active_status(DEFAULT_SHORTCUT);
        previous
    }

    fn set_active_plugin(
        &self,
        shortcut: Shortcut,
        label: String,
    ) -> Option<ModifierHotkeyHandle> {
        let mut registration = self.registration.lock().ok()?;
        registration.plugin_shortcut = Some(shortcut);
        let previous = registration.modifier_hotkey.take();
        registration.status = active_status(&label);
        previous
    }
}

fn active_status(shortcut: &str) -> GlobalHotkeyStatus {
    GlobalHotkeyStatus {
        state: "active",
        shortcut: shortcut.to_string(),
        message: "Global hotkey is active.".to_string(),
    }
}

pub fn setup_global_hotkeys(app: &mut App) {
    let state = app.state::<GlobalHotkeyState>();
    match modifier_hotkey::start(app.handle().clone()) {
        Ok(handle) => {
            drop(state.set_active_modifier(handle));
            emit_status(app.handle());
        }
        Err(message) => {
            state.set_failed(message);
            emit_status(app.handle());
        }
    }
}

pub fn global_hotkey_status(app: AppHandle) -> GlobalHotkeyStatus {
    app.state::<GlobalHotkeyState>().status()
}

pub fn set_global_hotkey(app: AppHandle, shortcut: String) -> Result<GlobalHotkeyStatus, String> {
    let (candidate, label) = parse_supported_shortcut(&shortcut)?;
    let state = app.state::<GlobalHotkeyState>();

    match candidate {
        ShortcutCandidate::ModifierCtrlWin => {
            if state.modifier_hotkey_is_active() {
                return Ok(state.status());
            }

            let handle = modifier_hotkey::start(app.clone())?;
            if let Some(previous) = state.plugin_shortcut() {
                if app.global_shortcut().unregister(previous).is_err() {
                    drop(handle);
                    return Err(
                        "The shortcut could not be changed. Your previous shortcut is still active."
                            .to_string(),
                    );
                }
            }
            drop(state.set_active_modifier(handle));
        }
        ShortcutCandidate::Plugin(candidate) => {
            if state.plugin_is_active(candidate) {
                return Ok(state.status());
            }

            app.global_shortcut().register(candidate).map_err(|_| {
                "That shortcut is unavailable. Your previous shortcut is still active."
                    .to_string()
            })?;

            if let Some(previous) = state.plugin_shortcut() {
                if previous != candidate && app.global_shortcut().unregister(previous).is_err() {
                    let _ = app.global_shortcut().unregister(candidate);
                    return Err(
                        "The shortcut could not be changed. Your previous shortcut is still active."
                            .to_string(),
                    );
                }
            }

            drop(state.set_active_plugin(candidate, label));
        }
    }

    emit_status(&app);
    Ok(state.status())
}

pub fn handle_global_hotkey(app: &AppHandle, shortcut: &Shortcut, event: ShortcutState) {
    let active_shortcut = app.state::<GlobalHotkeyState>().plugin_shortcut();
    if let Some(action) = action_for_global_hotkey(shortcut, active_shortcut.as_ref(), event) {
        let _ = app.emit(
            GLOBAL_HOTKEY_ACTION_EVENT,
            GlobalHotkeyActionPayload { action },
        );
    }
}

fn action_for_global_hotkey(
    shortcut: &Shortcut,
    active_shortcut: Option<&Shortcut>,
    event: ShortcutState,
) -> Option<&'static str> {
    if Some(shortcut) != active_shortcut {
        return None;
    }

    match event {
        ShortcutState::Pressed => Some("startVoiceFlowHold"),
        ShortcutState::Released => Some("stopVoiceFlowHold"),
    }
}

fn parse_supported_shortcut(value: &str) -> Result<(ShortcutCandidate, String), String> {
    if value.eq_ignore_ascii_case(DEFAULT_SHORTCUT) {
        return Ok((ShortcutCandidate::ModifierCtrlWin, DEFAULT_SHORTCUT.to_string()));
    }

    let shortcut = Shortcut::from_str(value).map_err(|_| "That shortcut is not supported.")?;
    let modifiers = shortcut.mods;

    if modifiers.contains(Modifiers::SUPER) {
        return Err("The Windows key is supported only in Ctrl+Win.".to_string());
    }
    if !modifiers.intersects(Modifiers::CONTROL | Modifiers::ALT) {
        return Err("Use Ctrl or Alt in the shortcut.".to_string());
    }

    let main_key = supported_main_key_label(shortcut.key)
        .ok_or_else(|| "That key is not supported.".to_string())?;
    let dictation_shortcut = Shortcut::new(
        Some(Modifiers::CONTROL | Modifiers::SHIFT),
        Code::KeyD,
    );
    if shortcut == dictation_shortcut {
        return Err("This shortcut is reserved for Codex dictation.".to_string());
    }
    if shortcut == Shortcut::new(Some(Modifiers::ALT), Code::F4) {
        return Err("This shortcut is reserved by Windows.".to_string());
    }
    if shortcut.key == Code::F12 {
        return Err("F12 is reserved by Windows.".to_string());
    }

    let mut parts = Vec::new();
    if modifiers.contains(Modifiers::CONTROL) {
        parts.push("Ctrl");
    }
    if modifiers.contains(Modifiers::ALT) {
        parts.push("Alt");
    }
    if modifiers.contains(Modifiers::SHIFT) {
        parts.push("Shift");
    }
    parts.push(main_key);

    Ok((ShortcutCandidate::Plugin(shortcut), parts.join("+")))
}

fn supported_main_key_label(key: Code) -> Option<&'static str> {
    match key {
        Code::KeyA => Some("A"), Code::KeyB => Some("B"), Code::KeyC => Some("C"),
        Code::KeyD => Some("D"), Code::KeyE => Some("E"), Code::KeyF => Some("F"),
        Code::KeyG => Some("G"), Code::KeyH => Some("H"), Code::KeyI => Some("I"),
        Code::KeyJ => Some("J"), Code::KeyK => Some("K"), Code::KeyL => Some("L"),
        Code::KeyM => Some("M"), Code::KeyN => Some("N"), Code::KeyO => Some("O"),
        Code::KeyP => Some("P"), Code::KeyQ => Some("Q"), Code::KeyR => Some("R"),
        Code::KeyS => Some("S"), Code::KeyT => Some("T"), Code::KeyU => Some("U"),
        Code::KeyV => Some("V"), Code::KeyW => Some("W"), Code::KeyX => Some("X"),
        Code::KeyY => Some("Y"), Code::KeyZ => Some("Z"),
        Code::F1 => Some("F1"), Code::F2 => Some("F2"), Code::F3 => Some("F3"),
        Code::F4 => Some("F4"), Code::F5 => Some("F5"), Code::F6 => Some("F6"),
        Code::F7 => Some("F7"), Code::F8 => Some("F8"), Code::F9 => Some("F9"),
        Code::F10 => Some("F10"), Code::F11 => Some("F11"), Code::F12 => Some("F12"),
        Code::Space => Some("Space"), Code::ArrowDown => Some("ArrowDown"),
        Code::ArrowLeft => Some("ArrowLeft"), Code::ArrowRight => Some("ArrowRight"),
        Code::ArrowUp => Some("ArrowUp"), Code::Delete => Some("Delete"),
        Code::End => Some("End"), Code::Enter => Some("Enter"), Code::Home => Some("Home"),
        Code::Insert => Some("Insert"), Code::PageDown => Some("PageDown"),
        Code::PageUp => Some("PageUp"), Code::Tab => Some("Tab"),
        _ => None,
    }
}

fn emit_status(app: &AppHandle) {
    let _ = app.emit(
        GLOBAL_HOTKEY_STATUS_EVENT,
        app.state::<GlobalHotkeyState>().status(),
    );
}

#[cfg(test)]
mod tests {
    use super::{action_for_global_hotkey, parse_supported_shortcut, ShortcutCandidate};
    use tauri_plugin_global_shortcut::{Code, Modifiers, Shortcut, ShortcutState};

    fn plugin_shortcut() -> Shortcut {
        Shortcut::new(Some(Modifiers::CONTROL | Modifiers::ALT), Code::KeyM)
    }

    #[test]
    fn starts_and_stops_voice_flow_for_the_active_plugin_shortcut() {
        let shortcut = plugin_shortcut();
        assert_eq!(
            action_for_global_hotkey(&shortcut, Some(&shortcut), ShortcutState::Pressed),
            Some("startVoiceFlowHold")
        );
        assert_eq!(
            action_for_global_hotkey(&shortcut, Some(&shortcut), ShortcutState::Released),
            Some("stopVoiceFlowHold")
        );
    }

    #[test]
    fn ignores_plugin_events_while_the_modifier_hotkey_is_active() {
        assert_eq!(
            action_for_global_hotkey(&plugin_shortcut(), None, ShortcutState::Pressed),
            None
        );
    }

    #[test]
    fn parses_ctrl_win_as_the_native_modifier_chord() {
        let parsed = parse_supported_shortcut("Ctrl+Win");
        assert!(matches!(parsed, Ok((ShortcutCandidate::ModifierCtrlWin, label)) if label == "Ctrl+Win"));
    }

    #[test]
    fn parses_supported_custom_plugin_shortcuts() {
        assert!(matches!(
            parse_supported_shortcut("Ctrl+Shift+M"),
            Ok((ShortcutCandidate::Plugin(_), _))
        ));
        assert!(parse_supported_shortcut("Alt+F8").is_ok());
    }

    #[test]
    fn rejects_unsafe_custom_shortcuts() {
        assert!(parse_supported_shortcut("Shift+M").is_err());
        assert!(parse_supported_shortcut("Super+Alt+M").is_err());
        assert!(parse_supported_shortcut("Ctrl+1").is_err());
        assert!(parse_supported_shortcut("Ctrl+Shift+D").is_err());
        assert!(parse_supported_shortcut("Alt+F4").is_err());
        assert!(parse_supported_shortcut("Ctrl+F12").is_err());
    }
}
