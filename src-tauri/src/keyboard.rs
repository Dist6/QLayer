use serde::Serialize;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct KeyboardStep {
    status: &'static str,
    message: &'static str,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum DictationShortcut {
    CtrlM,
    CtrlShiftM,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum KeyCode {
    Control,
    Shift,
    Alt,
    Space,
    M,
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

fn input_plan_for_shortcut(shortcut: DictationShortcut) -> Vec<KeyAction> {
    let mut actions = vec![
        KeyAction::Release(KeyCode::Alt),
        KeyAction::Release(KeyCode::Space),
        KeyAction::Release(KeyCode::Shift),
        KeyAction::Release(KeyCode::Control),
        KeyAction::Press(KeyCode::Control),
    ];

    if shortcut == DictationShortcut::CtrlShiftM {
        actions.push(KeyAction::Press(KeyCode::Shift));
    }

    actions.push(KeyAction::Press(KeyCode::M));
    actions.push(KeyAction::Release(KeyCode::M));

    if shortcut == DictationShortcut::CtrlShiftM {
        actions.push(KeyAction::Release(KeyCode::Shift));
    }

    actions.push(KeyAction::Release(KeyCode::Control));
    actions
}

fn parse_dictation_shortcut(shortcut: &str) -> Option<DictationShortcut> {
    match shortcut.to_ascii_lowercase().replace(' ', "").as_str() {
        "ctrl+m" => Some(DictationShortcut::CtrlM),
        "ctrl+shift+m" => Some(DictationShortcut::CtrlShiftM),
        _ => None,
    }
}

#[cfg(windows)]
mod platform {
    use super::{input_plan_for_shortcut, DictationShortcut, KeyAction, KeyCode};
    use windows::Win32::UI::Input::KeyboardAndMouse::{
        SendInput, INPUT, INPUT_0, INPUT_KEYBOARD, KEYBDINPUT, KEYBD_EVENT_FLAGS,
        KEYEVENTF_KEYUP, VIRTUAL_KEY, VK_CONTROL, VK_MENU, VK_SHIFT, VK_SPACE,
    };

    const VK_M: VIRTUAL_KEY = VIRTUAL_KEY(0x4d);

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
                    wVk: key,
                    wScan: 0,
                    dwFlags: if key_up {
                        KEYEVENTF_KEYUP
                    } else {
                        KEYBD_EVENT_FLAGS(0)
                    },
                    time: 0,
                    dwExtraInfo: 0,
                },
            },
        }
    }

    fn action_key(action: KeyAction) -> VIRTUAL_KEY {
        match action {
            KeyAction::Press(key) | KeyAction::Release(key) => match key {
                KeyCode::Control => VK_CONTROL,
                KeyCode::Shift => VK_SHIFT,
                KeyCode::Alt => VK_MENU,
                KeyCode::Space => VK_SPACE,
                KeyCode::M => VK_M,
            },
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
            parse_dictation_shortcut("Ctrl+M"),
            Some(DictationShortcut::CtrlM)
        );
        assert_eq!(
            parse_dictation_shortcut("Ctrl+Shift+M"),
            Some(DictationShortcut::CtrlShiftM)
        );
    }

    #[test]
    fn rejects_unsupported_dictation_shortcuts() {
        assert_eq!(parse_dictation_shortcut("Ctrl+V"), None);
        assert_eq!(parse_dictation_shortcut("Alt+M"), None);
        assert_eq!(parse_dictation_shortcut("Hello"), None);
    }

    #[test]
    fn releases_global_hotkey_modifiers_before_sending_ctrl_m() {
        assert_eq!(
            input_plan_for_shortcut(DictationShortcut::CtrlM),
            vec![
                KeyAction::Release(KeyCode::Alt),
                KeyAction::Release(KeyCode::Space),
                KeyAction::Release(KeyCode::Shift),
                KeyAction::Release(KeyCode::Control),
                KeyAction::Press(KeyCode::Control),
                KeyAction::Press(KeyCode::M),
                KeyAction::Release(KeyCode::M),
                KeyAction::Release(KeyCode::Control),
            ],
        );
    }
}
