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
    Windows,
    D,
}

impl KeyCode {
    fn scan_code(self) -> u16 {
        match self {
            Self::Control => 0x1d,
            Self::Shift => 0x2a,
            Self::Alt => 0x38,
            Self::Windows => 0x5b,
            Self::D => 0x20,
        }
    }

    fn is_extended(self) -> bool {
        matches!(self, Self::Windows)
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

    platform::send_actions(input_plan_for_shortcut(shortcut))
        .map_err(|message| message.to_string())?;

    Ok(KeyboardStep {
        status: "dictationSent",
        message: "Dictation shortcut sent.",
    })
}

pub fn press_dictation_shortcut(shortcut: String) -> Result<KeyboardStep, String> {
    let shortcut = parse_dictation_shortcut(&shortcut)
        .ok_or_else(|| "Dictation shortcut could not be started.".to_string())?;

    platform::send_actions(press_plan_for_shortcut(shortcut))
        .map_err(|message| message.to_string())?;

    Ok(KeyboardStep {
        status: "dictationStarted",
        message: "Dictation shortcut is held.",
    })
}

pub fn release_dictation_shortcut(shortcut: String) -> Result<KeyboardStep, String> {
    let shortcut = parse_dictation_shortcut(&shortcut)
        .ok_or_else(|| "Dictation shortcut could not be stopped.".to_string())?;

    platform::send_actions(release_plan_for_shortcut(shortcut))
        .map_err(|message| message.to_string())?;

    Ok(KeyboardStep {
        status: "dictationStopped",
        message: "Dictation shortcut released.",
    })
}

fn input_plan_for_shortcut(_shortcut: DictationShortcut) -> Vec<KeyAction> {
    let mut actions = press_plan_for_shortcut(DictationShortcut::CtrlShiftD);
    actions.extend(release_plan_for_shortcut(DictationShortcut::CtrlShiftD));
    actions
}

fn press_plan_for_shortcut(_shortcut: DictationShortcut) -> Vec<KeyAction> {
    vec![
        KeyAction::Release(KeyCode::Windows),
        KeyAction::Release(KeyCode::Alt),
        KeyAction::Release(KeyCode::Shift),
        KeyAction::Release(KeyCode::Control),
        KeyAction::Press(KeyCode::Control),
        KeyAction::Press(KeyCode::Shift),
        KeyAction::Press(KeyCode::D),
    ]
}

fn release_plan_for_shortcut(_shortcut: DictationShortcut) -> Vec<KeyAction> {
    vec![
        KeyAction::Release(KeyCode::D),
        KeyAction::Release(KeyCode::Shift),
        KeyAction::Release(KeyCode::Control),
    ]
}

fn parse_dictation_shortcut(shortcut: &str) -> Option<DictationShortcut> {
    match shortcut.to_ascii_lowercase().replace(' ', "").as_str() {
        "ctrl+shift+d" => Some(DictationShortcut::CtrlShiftD),
        _ => None,
    }
}

#[cfg(windows)]
mod platform {
    use super::KeyAction;
    use windows::Win32::UI::Input::KeyboardAndMouse::{
        SendInput, INPUT, INPUT_0, INPUT_KEYBOARD, KEYBDINPUT, KEYEVENTF_EXTENDEDKEY,
        KEYEVENTF_KEYUP, KEYEVENTF_SCANCODE, VIRTUAL_KEY,
    };

    pub fn send_actions(actions: Vec<KeyAction>) -> Result<(), &'static str> {
        let inputs = actions
            .iter()
            .map(|action| {
                let (key, key_up) = match action {
                    KeyAction::Press(key) => (*key, false),
                    KeyAction::Release(key) => (*key, true),
                };
                key_input(key, key_up)
            })
            .collect::<Vec<_>>();

        let sent = unsafe { SendInput(&inputs, std::mem::size_of::<INPUT>() as i32) };
        if sent as usize == inputs.len() {
            Ok(())
        } else {
            Err("Dictation shortcut could not be sent.")
        }
    }

    fn key_input(key: super::KeyCode, key_up: bool) -> INPUT {
        let mut flags = KEYEVENTF_SCANCODE;
        if key_up {
            flags |= KEYEVENTF_KEYUP;
        }
        if key.is_extended() {
            flags |= KEYEVENTF_EXTENDEDKEY;
        }

        INPUT {
            r#type: INPUT_KEYBOARD,
            Anonymous: INPUT_0 {
                ki: KEYBDINPUT {
                    wVk: VIRTUAL_KEY(0),
                    wScan: VIRTUAL_KEY(key.scan_code()).0,
                    dwFlags: flags,
                    time: 0,
                    dwExtraInfo: 0,
                },
            },
        }
    }

}

#[cfg(not(windows))]
mod platform {
    use super::KeyAction;

    pub fn send_actions(_actions: Vec<KeyAction>) -> Result<(), &'static str> {
        Err("Dictation automation is not available.")
    }
}

#[cfg(test)]
mod tests {
    use super::{
        input_plan_for_shortcut, parse_dictation_shortcut, press_plan_for_shortcut,
        release_plan_for_shortcut, DictationShortcut, KeyAction, KeyCode,
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
    fn releases_physical_modifiers_before_sending_ctrl_shift_d() {
        assert_eq!(
            press_plan_for_shortcut(DictationShortcut::CtrlShiftD),
            vec![
                KeyAction::Release(KeyCode::Windows),
                KeyAction::Release(KeyCode::Alt),
                KeyAction::Release(KeyCode::Shift),
                KeyAction::Release(KeyCode::Control),
                KeyAction::Press(KeyCode::Control),
                KeyAction::Press(KeyCode::Shift),
                KeyAction::Press(KeyCode::D),
            ],
        );
    }

    #[test]
    fn releases_held_ctrl_shift_d_for_push_to_talk_dictation() {
        assert_eq!(
            release_plan_for_shortcut(DictationShortcut::CtrlShiftD),
            vec![
                KeyAction::Release(KeyCode::D),
                KeyAction::Release(KeyCode::Shift),
                KeyAction::Release(KeyCode::Control),
            ],
        );
    }

    #[test]
    fn tap_plan_is_press_followed_by_release() {
        let mut expected = press_plan_for_shortcut(DictationShortcut::CtrlShiftD);
        expected.extend(release_plan_for_shortcut(DictationShortcut::CtrlShiftD));

        assert_eq!(input_plan_for_shortcut(DictationShortcut::CtrlShiftD), expected);
    }

    #[test]
    fn maps_ctrl_shift_d_to_physical_scan_codes() {
        assert_eq!(KeyCode::Control.scan_code(), 0x1d);
        assert_eq!(KeyCode::Shift.scan_code(), 0x2a);
        assert_eq!(KeyCode::Windows.scan_code(), 0x5b);
        assert!(KeyCode::Windows.is_extended());
        assert_eq!(KeyCode::D.scan_code(), 0x20);
    }
}
