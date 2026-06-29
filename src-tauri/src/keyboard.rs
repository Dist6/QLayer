use serde::Serialize;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct KeyboardStep {
    status: &'static str,
    message: &'static str,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum DictationShortcut {
    CtrlShiftD,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum KeyCode {
    Control,
    Shift,
    Alt,
    Space,
    D,
}

impl KeyCode {
    fn scan_code(self) -> u16 {
        match self {
            Self::Control => 0x1d,
            Self::Shift => 0x2a,
            Self::Alt => 0x38,
            Self::Space => 0x39,
            Self::D => 0x20,
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum KeyAction {
    Press(KeyCode),
    Release(KeyCode),
}

pub fn send_dictation_shortcut(shortcut: String) -> Result<KeyboardStep, String> {
    let shortcut = parse_dictation_shortcut(&shortcut)
        .ok_or_else(|| "Dictation shortcut could not be sent.".to_string())?;

    platform::send_shortcut(shortcut).map_err(|message| message.to_string())?;

    Ok(KeyboardStep {
        status: "dictationSent",
        message: "Dictation shortcut sent.",
    })
}

fn input_plan_for_shortcut(_shortcut: DictationShortcut) -> Vec<KeyAction> {
    let mut actions = vec![
        KeyAction::Release(KeyCode::Alt),
        KeyAction::Release(KeyCode::Space),
        KeyAction::Release(KeyCode::Shift),
        KeyAction::Release(KeyCode::Control),
        KeyAction::Press(KeyCode::Control),
        KeyAction::Press(KeyCode::Shift),
        KeyAction::Press(KeyCode::D),
        KeyAction::Release(KeyCode::D),
    ];

    actions.push(KeyAction::Release(KeyCode::Shift));
    actions.push(KeyAction::Release(KeyCode::Control));
    actions
}

fn parse_dictation_shortcut(shortcut: &str) -> Option<DictationShortcut> {
    match shortcut.to_ascii_lowercase().replace(' ', "").as_str() {
        "ctrl+shift+d" => Some(DictationShortcut::CtrlShiftD),
        _ => None,
    }
}

#[cfg(windows)]
mod platform {
    use super::{input_plan_for_shortcut, DictationShortcut, KeyAction};
    use windows::Win32::UI::Input::KeyboardAndMouse::{
        SendInput, INPUT, INPUT_0, INPUT_KEYBOARD, KEYBDINPUT, KEYEVENTF_KEYUP,
        KEYEVENTF_SCANCODE, VIRTUAL_KEY,
    };

    pub fn send_shortcut(shortcut: DictationShortcut) -> Result<(), &'static str> {
        let actions = input_plan_for_shortcut(shortcut);
        let inputs = actions
            .iter()
            .map(|action| key_input(action_key(*action), matches!(action, KeyAction::Release(_))))
            .collect::<Vec<_>>();

        let sent = unsafe { SendInput(&inputs, std::mem::size_of::<INPUT>() as i32) };
        if sent as usize == inputs.len() {
            Ok(())
        } else {
            Err("Dictation shortcut could not be sent.")
        }
    }

    fn key_input(key: VIRTUAL_KEY, key_up: bool) -> INPUT {
        INPUT {
            r#type: INPUT_KEYBOARD,
            Anonymous: INPUT_0 {
                ki: KEYBDINPUT {
                    wVk: VIRTUAL_KEY(0),
                    wScan: key.0,
                    dwFlags: if key_up {
                        KEYEVENTF_SCANCODE | KEYEVENTF_KEYUP
                    } else {
                        KEYEVENTF_SCANCODE
                    },
                    time: 0,
                    dwExtraInfo: 0,
                },
            },
        }
    }

    fn action_key(action: KeyAction) -> VIRTUAL_KEY {
        match action {
            KeyAction::Press(key) | KeyAction::Release(key) => VIRTUAL_KEY(key.scan_code()),
        }
    }
}

#[cfg(not(windows))]
mod platform {
    use super::DictationShortcut;

    pub fn send_shortcut(_shortcut: DictationShortcut) -> Result<(), &'static str> {
        Err("Dictation automation is not available.")
    }
}

#[cfg(test)]
mod tests {
    use super::{
        input_plan_for_shortcut, parse_dictation_shortcut, DictationShortcut, KeyAction, KeyCode,
    };

    #[test]
    fn accepts_supported_dictation_shortcuts() {
        assert_eq!(
            parse_dictation_shortcut("Ctrl+Shift+D"),
            Some(DictationShortcut::CtrlShiftD)
        );
    }

    #[test]
    fn rejects_unsupported_dictation_shortcuts() {
        assert_eq!(parse_dictation_shortcut("Ctrl+M"), None);
        assert_eq!(parse_dictation_shortcut("Ctrl+Shift+M"), None);
        assert_eq!(parse_dictation_shortcut("Alt+M"), None);
        assert_eq!(parse_dictation_shortcut("Hello"), None);
    }

    #[test]
    fn releases_global_hotkey_modifiers_before_sending_ctrl_shift_d() {
        assert_eq!(
            input_plan_for_shortcut(DictationShortcut::CtrlShiftD),
            vec![
                KeyAction::Release(KeyCode::Alt),
                KeyAction::Release(KeyCode::Space),
                KeyAction::Release(KeyCode::Shift),
                KeyAction::Release(KeyCode::Control),
                KeyAction::Press(KeyCode::Control),
                KeyAction::Press(KeyCode::Shift),
                KeyAction::Press(KeyCode::D),
                KeyAction::Release(KeyCode::D),
                KeyAction::Release(KeyCode::Shift),
                KeyAction::Release(KeyCode::Control),
            ],
        );
    }

    #[test]
    fn maps_ctrl_shift_d_to_physical_scan_codes() {
        assert_eq!(KeyCode::Control.scan_code(), 0x1d);
        assert_eq!(KeyCode::Shift.scan_code(), 0x2a);
        assert_eq!(KeyCode::D.scan_code(), 0x20);
    }
}
