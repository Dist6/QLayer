use serde::Serialize;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WindowFocusStep {
    status: &'static str,
    message: &'static str,
}

const FOCUS_NOT_CONFIRMED_MESSAGE: &str = "Codex opened, but focus could not be confirmed.";

pub fn focus_codex_window() -> WindowFocusStep {
    match platform::focus_codex_window() {
        FocusOutcome::Focused => WindowFocusStep {
            status: "codexFocused",
            message: "Codex focused.",
        },
        FocusOutcome::NotConfirmed => WindowFocusStep {
            status: "codexFocusNotConfirmed",
            message: FOCUS_NOT_CONFIRMED_MESSAGE,
        },
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum FocusOutcome {
    Focused,
    NotConfirmed,
}

fn is_supported_codex_window_title(title: &str) -> bool {
    let normalized = title.trim().to_ascii_lowercase();
    normalized == "codex"
        || normalized.starts_with("codex ")
        || normalized.starts_with("codex -")
        || normalized.ends_with(" - codex")
}

#[cfg(windows)]
mod platform {
    use super::{is_supported_codex_window_title, FocusOutcome};
    use windows::core::BOOL;
    use windows::Win32::Foundation::{HWND, LPARAM};
    use windows::Win32::UI::WindowsAndMessaging::{
        EnumWindows, GetWindowTextLengthW, GetWindowTextW, IsWindowVisible, SetForegroundWindow,
        ShowWindow, SW_RESTORE,
    };

    pub fn focus_codex_window() -> FocusOutcome {
        let mut found: Option<HWND> = None;
        let found_ptr = &mut found as *mut Option<HWND>;

        if unsafe { EnumWindows(Some(enum_windows), LPARAM(found_ptr as isize)) }.is_err() {
            return FocusOutcome::NotConfirmed;
        }

        let Some(hwnd) = found else {
            return FocusOutcome::NotConfirmed;
        };

        unsafe {
            let _ = ShowWindow(hwnd, SW_RESTORE);
            if SetForegroundWindow(hwnd).as_bool() {
                FocusOutcome::Focused
            } else {
                FocusOutcome::NotConfirmed
            }
        }
    }

    unsafe extern "system" fn enum_windows(hwnd: HWND, lparam: LPARAM) -> BOOL {
        if !unsafe { IsWindowVisible(hwnd) }.as_bool() {
            return true.into();
        }

        if let Some(title) = read_window_title(hwnd) {
            if is_supported_codex_window_title(&title) {
                let found = lparam.0 as *mut Option<HWND>;
                unsafe {
                    *found = Some(hwnd);
                }
                return false.into();
            }
        }

        true.into()
    }

    fn read_window_title(hwnd: HWND) -> Option<String> {
        let length = unsafe { GetWindowTextLengthW(hwnd) };
        if length <= 0 {
            return None;
        }

        let mut buffer = vec![0_u16; length as usize + 1];
        let read = unsafe { GetWindowTextW(hwnd, &mut buffer) };
        if read <= 0 {
            return None;
        }

        Some(String::from_utf16_lossy(&buffer[..read as usize]))
    }
}

#[cfg(not(windows))]
mod platform {
    use super::FocusOutcome;

    pub fn focus_codex_window() -> FocusOutcome {
        FocusOutcome::NotConfirmed
    }
}

#[cfg(test)]
mod tests {
    use super::is_supported_codex_window_title;

    #[test]
    fn accepts_supported_codex_window_titles() {
        assert!(is_supported_codex_window_title("Codex"));
        assert!(is_supported_codex_window_title("Codex - New Thread"));
        assert!(is_supported_codex_window_title("Project - Codex"));
    }

    #[test]
    fn rejects_non_codex_window_titles() {
        assert!(!is_supported_codex_window_title("QoLayer"));
        assert!(!is_supported_codex_window_title("Code"));
        assert!(!is_supported_codex_window_title("My Codex Notes"));
    }
}
