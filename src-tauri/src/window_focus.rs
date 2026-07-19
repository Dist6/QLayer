use serde::Serialize;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WindowFocusStep {
    status: &'static str,
    message: &'static str,
}

pub fn focus_codex_window<F>(activate_existing: F) -> WindowFocusStep
where
    F: FnOnce() -> bool,
{
    match platform::focus_codex_window(activate_existing) {
        FocusOutcome::Focused => WindowFocusStep {
            status: "codexFocused",
            message: "Codex focused.",
        },
        FocusOutcome::NotFound => WindowFocusStep {
            status: "codexFocusNotConfirmed",
            message: "No supported Codex or ChatGPT window was detected.",
        },
        FocusOutcome::ActivationNotConfirmed => WindowFocusStep {
            status: "codexFocusNotConfirmed",
            message: "ChatGPT was detected, but Windows did not allow it to become active.",
        },
        FocusOutcome::ComposerNotFocused => WindowFocusStep {
            status: "codexFocusNotConfirmed",
            message: "ChatGPT became active, but its composer could not be focused.",
        },
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum FocusOutcome {
    Focused,
    NotFound,
    ActivationNotConfirmed,
    ComposerNotFocused,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
struct Point {
    x: i32,
    y: i32,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
struct WindowRect {
    left: i32,
    top: i32,
    right: i32,
    bottom: i32,
}

const MIN_CODEX_WINDOW_WIDTH: i32 = 360;
const MIN_CODEX_WINDOW_HEIGHT: i32 = 360;
const COMPOSER_BOTTOM_MARGIN: i32 = 96;
const FOCUS_ATTEMPTS: usize = 2;
const FOCUS_POLL_INTERVAL_MS: u64 = 25;
const FOCUS_POLL_ATTEMPTS: usize = 8;
const ACTIVATION_POLL_ATTEMPTS: usize = 40;
const UNIFIED_CHATGPT_PACKAGE_FAMILY: &str = "OpenAI.Codex_2p2nqsd0c76g0";

fn is_supported_codex_window(title: &str, package_family: Option<&str>) -> bool {
    let normalized = title.trim().to_ascii_lowercase();
    let legacy_codex_window = normalized == "codex"
        || normalized.starts_with("codex ")
        || normalized.starts_with("codex -")
        || normalized.ends_with(" - codex");
    let unified_chatgpt_window = normalized == "chatgpt"
        && matches!(
            package_family,
            Some(family) if family.eq_ignore_ascii_case(UNIFIED_CHATGPT_PACKAGE_FAMILY)
        );

    legacy_codex_window || unified_chatgpt_window
}

fn codex_composer_focus_point(rect: WindowRect) -> Option<Point> {
    let width = rect.right - rect.left;
    let height = rect.bottom - rect.top;

    if width < MIN_CODEX_WINDOW_WIDTH || height < MIN_CODEX_WINDOW_HEIGHT {
        return None;
    }

    Some(Point {
        x: rect.left + width / 2,
        y: rect.bottom - COMPOSER_BOTTOM_MARGIN,
    })
}

#[cfg(windows)]
mod platform {
    use super::{
        codex_composer_focus_point, is_supported_codex_window, FocusOutcome, WindowRect,
        ACTIVATION_POLL_ATTEMPTS, FOCUS_ATTEMPTS, FOCUS_POLL_ATTEMPTS,
        FOCUS_POLL_INTERVAL_MS,
    };
    use std::time::Duration;
    use windows::core::{BOOL, PWSTR, Result};
    use windows::Win32::Foundation::{
        CloseHandle, ERROR_INSUFFICIENT_BUFFER, ERROR_SUCCESS, HANDLE, HWND, LPARAM, RECT,
    };
    use windows::Win32::Storage::Packaging::Appx::GetPackageFamilyName;
    use windows::Win32::System::Threading::{
        AttachThreadInput, GetCurrentThreadId, OpenProcess, PROCESS_QUERY_LIMITED_INFORMATION,
    };
    use windows::Win32::UI::Input::KeyboardAndMouse::{
        SendInput, SetActiveWindow, SetFocus, INPUT, INPUT_0, INPUT_MOUSE, MOUSEEVENTF_LEFTDOWN,
        MOUSEEVENTF_LEFTUP, MOUSEINPUT,
    };
    use windows::Win32::UI::WindowsAndMessaging::{
        BringWindowToTop, EnumWindows, GetForegroundWindow, GetWindowRect, GetWindowTextLengthW,
        GetWindowTextW, GetWindowThreadProcessId, IsWindowVisible, SetCursorPos,
        SetForegroundWindow, ShowWindow, SW_SHOWMAXIMIZED,
    };

    struct ThreadInputAttachment {
        source: u32,
        target: u32,
        attached: bool,
    }

    impl ThreadInputAttachment {
        fn attach(source: u32, target: u32) -> Self {
            let attached = source != 0
                && target != 0
                && source != target
                && unsafe { AttachThreadInput(source, target, true).as_bool() };

            Self {
                source,
                target,
                attached,
            }
        }
    }

    impl Drop for ThreadInputAttachment {
        fn drop(&mut self) {
            if self.attached {
                unsafe {
                    let _ = AttachThreadInput(self.source, self.target, false);
                }
            }
        }
    }

    pub fn focus_codex_window<F>(activate_existing: F) -> FocusOutcome
    where
        F: FnOnce() -> bool,
    {
        let Some(initial_hwnd) = find_codex_window() else {
            return FocusOutcome::NotFound;
        };

        unsafe {
            let _ = ShowWindow(initial_hwnd, SW_SHOWMAXIMIZED);
        }

        let focused_hwnd = if bring_window_to_foreground(initial_hwnd) {
            initial_hwnd
        } else if activate_existing() {
            let Some(activated_hwnd) = wait_for_supported_window_foreground() else {
                return FocusOutcome::ActivationNotConfirmed;
            };
            activated_hwnd
        } else {
            return FocusOutcome::ActivationNotConfirmed;
        };

        if focus_codex_composer(focused_hwnd).is_err() {
            return FocusOutcome::ComposerNotFocused;
        }

        FocusOutcome::Focused
    }

    fn find_codex_window() -> Option<HWND> {
        let mut found: Option<HWND> = None;
        let found_ptr = &mut found as *mut Option<HWND>;

        // EnumWindows returns FALSE when our callback deliberately stops after a match.
        // The populated handle is therefore authoritative even when the API reports FALSE.
        let _ = unsafe { EnumWindows(Some(enum_windows), LPARAM(found_ptr as isize)) };

        found
    }

    fn wait_for_supported_window_foreground() -> Option<HWND> {
        for _ in 0..ACTIVATION_POLL_ATTEMPTS {
            let foreground = unsafe { GetForegroundWindow() };
            if is_supported_window_handle(foreground) {
                return Some(foreground);
            }

            std::thread::sleep(Duration::from_millis(FOCUS_POLL_INTERVAL_MS));
        }

        let foreground = unsafe { GetForegroundWindow() };
        is_supported_window_handle(foreground).then_some(foreground)
    }

    fn bring_window_to_foreground(hwnd: HWND) -> bool {
        for _ in 0..FOCUS_ATTEMPTS {
            if attempt_to_bring_window_to_foreground(hwnd) {
                return true;
            }
        }

        false
    }

    fn attempt_to_bring_window_to_foreground(hwnd: HWND) -> bool {
        let current_thread = unsafe { GetCurrentThreadId() };
        let foreground_thread = unsafe { GetWindowThreadProcessId(GetForegroundWindow(), None) };
        let target_thread = unsafe { GetWindowThreadProcessId(hwnd, None) };

        let _foreground_attachment =
            ThreadInputAttachment::attach(current_thread, foreground_thread);
        let _target_attachment = ThreadInputAttachment::attach(current_thread, target_thread);

        unsafe {
            let _ = BringWindowToTop(hwnd);
            let _ = SetActiveWindow(hwnd);
            let _ = SetFocus(Some(hwnd));
            let _ = SetForegroundWindow(hwnd);
        }

        for _ in 0..FOCUS_POLL_ATTEMPTS {
            if unsafe { GetForegroundWindow() == hwnd } {
                return true;
            }

            std::thread::sleep(Duration::from_millis(FOCUS_POLL_INTERVAL_MS));
        }

        unsafe { GetForegroundWindow() == hwnd }
    }

    unsafe extern "system" fn enum_windows(hwnd: HWND, lparam: LPARAM) -> BOOL {
        if is_supported_window_handle(hwnd) {
            let found = lparam.0 as *mut Option<HWND>;
            unsafe {
                *found = Some(hwnd);
            }
            return false.into();
        }

        true.into()
    }

    fn is_supported_window_handle(hwnd: HWND) -> bool {
        if hwnd.0.is_null() || !unsafe { IsWindowVisible(hwnd) }.as_bool() {
            return false;
        }

        let Some(title) = read_window_title(hwnd) else {
            return false;
        };
        let package_family = read_window_package_family(hwnd);
        is_supported_codex_window(&title, package_family.as_deref())
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

    fn read_window_package_family(hwnd: HWND) -> Option<String> {
        let mut process_id = 0_u32;
        unsafe {
            GetWindowThreadProcessId(hwnd, Some(&mut process_id));
        }
        if process_id == 0 {
            return None;
        }

        let process = unsafe {
            OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, process_id).ok()?
        };
        let package_family = read_package_family(process);
        unsafe {
            let _ = CloseHandle(process);
        }
        package_family
    }

    fn read_package_family(process: HANDLE) -> Option<String> {
        let mut length = 0_u32;
        let size_result = unsafe { GetPackageFamilyName(process, &mut length, None) };
        if size_result != ERROR_INSUFFICIENT_BUFFER || length == 0 {
            return None;
        }

        let mut buffer = vec![0_u16; length as usize];
        let read_result = unsafe {
            GetPackageFamilyName(process, &mut length, Some(PWSTR(buffer.as_mut_ptr())))
        };
        if read_result != ERROR_SUCCESS {
            return None;
        }

        let content_length = buffer
            .iter()
            .position(|character| *character == 0)
            .unwrap_or(buffer.len());
        Some(String::from_utf16_lossy(&buffer[..content_length]))
    }

    fn focus_codex_composer(hwnd: HWND) -> Result<()> {
        let mut rect = RECT::default();
        unsafe {
            GetWindowRect(hwnd, &mut rect)?;
        }

        let Some(point) = codex_composer_focus_point(WindowRect {
            left: rect.left,
            top: rect.top,
            right: rect.right,
            bottom: rect.bottom,
        }) else {
            return Err(windows::core::Error::from_win32());
        };

        unsafe {
            SetCursorPos(point.x, point.y)?;
        }

        let inputs = [
            mouse_click_input(MOUSEEVENTF_LEFTDOWN),
            mouse_click_input(MOUSEEVENTF_LEFTUP),
        ];
        let sent = unsafe { SendInput(&inputs, std::mem::size_of::<INPUT>() as i32) };

        if sent as usize == inputs.len() {
            Ok(())
        } else {
            Err(windows::core::Error::from_win32())
        }
    }

    fn mouse_click_input(
        flags: windows::Win32::UI::Input::KeyboardAndMouse::MOUSE_EVENT_FLAGS,
    ) -> INPUT {
        INPUT {
            r#type: INPUT_MOUSE,
            Anonymous: INPUT_0 {
                mi: MOUSEINPUT {
                    dx: 0,
                    dy: 0,
                    mouseData: 0,
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
    use super::FocusOutcome;

    pub fn focus_codex_window<F>(_activate_existing: F) -> FocusOutcome
    where
        F: FnOnce() -> bool,
    {
        FocusOutcome::NotFound
    }
}

#[cfg(test)]
mod tests {
    use super::{codex_composer_focus_point, is_supported_codex_window, Point, WindowRect};

    #[test]
    fn accepts_supported_codex_window_titles() {
        assert!(is_supported_codex_window("Codex", None));
        assert!(is_supported_codex_window("Codex - New Thread", None));
        assert!(is_supported_codex_window("Project - Codex", None));
    }

    #[test]
    fn accepts_the_official_unified_chatgpt_window() {
        assert!(is_supported_codex_window(
            "ChatGPT",
            Some("OpenAI.Codex_2p2nqsd0c76g0")
        ));
    }

    #[test]
    fn rejects_unverified_chatgpt_windows() {
        assert!(!is_supported_codex_window("ChatGPT", None));
        assert!(!is_supported_codex_window(
            "ChatGPT",
            Some("Example.Unrelated_123")
        ));
    }

    #[test]
    fn rejects_non_codex_window_titles() {
        assert!(!is_supported_codex_window("QoLayer", None));
        assert!(!is_supported_codex_window("Code", None));
        assert!(!is_supported_codex_window("My Codex Notes", None));
        assert!(!is_supported_codex_window(
            "QoLayer",
            Some("OpenAI.Codex_2p2nqsd0c76g0")
        ));
    }

    #[test]
    fn targets_the_lower_center_of_a_codex_window() {
        assert_eq!(
            codex_composer_focus_point(WindowRect {
                left: 100,
                top: 50,
                right: 900,
                bottom: 750,
            }),
            Some(Point { x: 500, y: 654 })
        );
    }

    #[test]
    fn skips_unusually_small_codex_windows() {
        assert_eq!(
            codex_composer_focus_point(WindowRect {
                left: 100,
                top: 50,
                right: 300,
                bottom: 250,
            }),
            None
        );
    }
}
