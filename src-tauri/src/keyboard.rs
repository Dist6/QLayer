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

pub fn send_dictation_shortcut(shortcut: String) -> Result<KeyboardStep, String> {
    let shortcut = parse_dictation_shortcut(&shortcut)
        .ok_or_else(|| "Dictation shortcut could not be sent.".to_string())?;

    platform::send_shortcut(shortcut).map_err(|message| message.to_string())?;

    Ok(KeyboardStep {
        status: "dictationSent",
        message: "Dictation shortcut sent.",
    })
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
    use super::DictationShortcut;
    use windows::Win32::UI::Input::KeyboardAndMouse::{
        SendInput, INPUT, INPUT_0, INPUT_KEYBOARD, KEYBDINPUT, KEYBD_EVENT_FLAGS,
        KEYEVENTF_KEYUP, VIRTUAL_KEY, VK_CONTROL, VK_SHIFT,
    };

    const VK_M: VIRTUAL_KEY = VIRTUAL_KEY(0x4d);

    pub fn send_shortcut(shortcut: DictationShortcut) -> Result<(), &'static str> {
        let mut keys = vec![VK_CONTROL];

        if shortcut == DictationShortcut::CtrlShiftM {
            keys.push(VK_SHIFT);
        }

        keys.push(VK_M);

        let mut inputs = Vec::with_capacity(keys.len() * 2);
        for key in &keys {
            inputs.push(key_input(*key, false));
        }
        for key in keys.iter().rev() {
            inputs.push(key_input(*key, true));
        }

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
    use super::{parse_dictation_shortcut, DictationShortcut};

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
}
