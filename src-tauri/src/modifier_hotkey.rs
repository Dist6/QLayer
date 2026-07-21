use tauri::AppHandle;

const GLOBAL_HOTKEY_ACTION_EVENT: &str = "qolayer://global-hotkey-action";

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum KeyKind {
    Control,
    Windows,
    Other,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum HookAction {
    Pass,
    Suppress,
    StartAndSuppress,
    StopAndSuppress,
}

#[derive(Default)]
struct ChordState {
    control_down: bool,
    windows_down: bool,
    active: bool,
    suppress_control_up: bool,
    suppress_windows_up: bool,
}

impl ChordState {
    fn transition(&mut self, key: KeyKind, pressed: bool, injected: bool) -> HookAction {
        if injected || key == KeyKind::Other {
            return HookAction::Pass;
        }

        match (key, pressed) {
            (KeyKind::Control, true) => {
                self.control_down = true;
                self.start_if_complete()
            }
            (KeyKind::Windows, true) => {
                self.windows_down = true;
                self.start_if_complete()
            }
            (KeyKind::Control, false) => {
                self.control_down = false;
                self.release(KeyKind::Control)
            }
            (KeyKind::Windows, false) => {
                self.windows_down = false;
                self.release(KeyKind::Windows)
            }
            (KeyKind::Other, _) => HookAction::Pass,
        }
    }

    fn start_if_complete(&mut self) -> HookAction {
        if self.active {
            return HookAction::Suppress;
        }
        if !self.control_down || !self.windows_down {
            return HookAction::Pass;
        }

        self.active = true;
        self.suppress_control_up = true;
        self.suppress_windows_up = true;
        HookAction::StartAndSuppress
    }

    fn release(&mut self, key: KeyKind) -> HookAction {
        let should_suppress = match key {
            KeyKind::Control => std::mem::take(&mut self.suppress_control_up),
            KeyKind::Windows => std::mem::take(&mut self.suppress_windows_up),
            KeyKind::Other => false,
        };

        if self.active {
            self.active = false;
            return HookAction::StopAndSuppress;
        }

        if should_suppress {
            HookAction::Suppress
        } else {
            HookAction::Pass
        }
    }
}

#[cfg(windows)]
mod platform {
    use super::{AppHandle, ChordState, HookAction, KeyKind, GLOBAL_HOTKEY_ACTION_EVENT};
    use serde::Serialize;
    use std::sync::{mpsc, Mutex, OnceLock};
    use std::thread::{self, JoinHandle};
    use tauri::Emitter;
    use windows::Win32::Foundation::{HINSTANCE, LPARAM, LRESULT, WPARAM};
    use windows::Win32::UI::Input::KeyboardAndMouse::{
        VK_CONTROL, VK_LCONTROL, VK_LWIN, VK_RCONTROL, VK_RWIN,
    };
    use windows::Win32::UI::WindowsAndMessaging::{
        CallNextHookEx, DispatchMessageW, GetMessageW, PostThreadMessageW, SetWindowsHookExW,
        TranslateMessage, UnhookWindowsHookEx, HC_ACTION, KBDLLHOOKSTRUCT, LLKHF_INJECTED, MSG,
        WH_KEYBOARD_LL, WM_KEYDOWN, WM_KEYUP, WM_QUIT, WM_SYSKEYDOWN, WM_SYSKEYUP,
    };

    static HOOK_CONTEXT: OnceLock<Mutex<Option<HookContext>>> = OnceLock::new();

    struct HookContext {
        app: AppHandle,
        state: ChordState,
    }

    #[derive(Clone, Serialize)]
    #[serde(rename_all = "camelCase")]
    struct ActionPayload {
        action: &'static str,
    }

    pub struct ModifierHotkeyHandle {
        thread_id: u32,
        thread: Option<JoinHandle<()>>,
    }

    impl Drop for ModifierHotkeyHandle {
        fn drop(&mut self) {
            unsafe {
                let _ = PostThreadMessageW(self.thread_id, WM_QUIT, WPARAM(0), LPARAM(0));
            }
            if let Some(thread) = self.thread.take() {
                let _ = thread.join();
            }
        }
    }

    pub fn start(app: AppHandle) -> Result<ModifierHotkeyHandle, String> {
        let (ready_tx, ready_rx) = mpsc::sync_channel(1);
        let thread = thread::spawn(move || run_hook(app, ready_tx));
        let thread_id = ready_rx
            .recv()
            .map_err(|_| "Ctrl+Win could not be initialized.".to_string())??;

        Ok(ModifierHotkeyHandle {
            thread_id,
            thread: Some(thread),
        })
    }

    fn run_hook(app: AppHandle, ready: mpsc::SyncSender<Result<u32, String>>) {
        let thread_id = unsafe { windows::Win32::System::Threading::GetCurrentThreadId() };
        let context = HOOK_CONTEXT.get_or_init(|| Mutex::new(None));
        if let Ok(mut slot) = context.lock() {
            *slot = Some(HookContext {
                app,
                state: ChordState::default(),
            });
        } else {
            let _ = ready.send(Err("Ctrl+Win could not be initialized.".to_string()));
            return;
        }

        let hook = unsafe {
            SetWindowsHookExW(
                WH_KEYBOARD_LL,
                Some(keyboard_hook),
                Some(HINSTANCE::default()),
                0,
            )
        };
        let Ok(hook) = hook else {
            clear_context();
            let _ = ready.send(Err("Ctrl+Win could not be registered.".to_string()));
            return;
        };

        if ready.send(Ok(thread_id)).is_err() {
            unsafe {
                let _ = UnhookWindowsHookEx(hook);
            }
            clear_context();
            return;
        }

        let mut message = MSG::default();
        while unsafe { GetMessageW(&mut message, None, 0, 0) }.as_bool() {
            unsafe {
                let _ = TranslateMessage(&message);
                DispatchMessageW(&message);
            }
        }

        unsafe {
            let _ = UnhookWindowsHookEx(hook);
        }
        clear_context();
    }

    unsafe extern "system" fn keyboard_hook(
        code: i32,
        w_param: WPARAM,
        l_param: LPARAM,
    ) -> LRESULT {
        if code != HC_ACTION as i32 {
            return CallNextHookEx(None, code, w_param, l_param);
        }

        let pressed = match w_param.0 as u32 {
            WM_KEYDOWN | WM_SYSKEYDOWN => true,
            WM_KEYUP | WM_SYSKEYUP => false,
            _ => return CallNextHookEx(None, code, w_param, l_param),
        };
        let event = &*(l_param.0 as *const KBDLLHOOKSTRUCT);
        let injected = event.flags.contains(LLKHF_INJECTED);
        let key = key_kind(event.vkCode);

        let action = HOOK_CONTEXT
            .get()
            .and_then(|context| context.lock().ok())
            .and_then(|mut context| {
                let context = context.as_mut()?;
                let action = context.state.transition(key, pressed, injected);
                match action {
                    HookAction::StartAndSuppress => emit(&context.app, "startVoiceFlowHold"),
                    HookAction::StopAndSuppress => emit(&context.app, "stopVoiceFlowHold"),
                    HookAction::Pass | HookAction::Suppress => {}
                }
                Some(action)
            })
            .unwrap_or(HookAction::Pass);

        match action {
            HookAction::Suppress | HookAction::StartAndSuppress | HookAction::StopAndSuppress => {
                LRESULT(1)
            }
            HookAction::Pass => CallNextHookEx(None, code, w_param, l_param),
        }
    }

    fn key_kind(vk_code: u32) -> KeyKind {
        if [VK_CONTROL.0, VK_LCONTROL.0, VK_RCONTROL.0].contains(&(vk_code as u16)) {
            KeyKind::Control
        } else if [VK_LWIN.0, VK_RWIN.0].contains(&(vk_code as u16)) {
            KeyKind::Windows
        } else {
            KeyKind::Other
        }
    }

    fn emit(app: &AppHandle, action: &'static str) {
        let _ = app.emit(GLOBAL_HOTKEY_ACTION_EVENT, ActionPayload { action });
    }

    fn clear_context() {
        if let Some(context) = HOOK_CONTEXT.get() {
            if let Ok(mut slot) = context.lock() {
                *slot = None;
            }
        }
    }
}

#[cfg(not(windows))]
mod platform {
    use super::AppHandle;

    pub struct ModifierHotkeyHandle;

    pub fn start(_app: AppHandle) -> Result<ModifierHotkeyHandle, String> {
        Err("Ctrl+Win is available only on Windows.".to_string())
    }
}

pub use platform::{start, ModifierHotkeyHandle};

#[cfg(test)]
mod tests {
    use super::{ChordState, HookAction, KeyKind};

    #[test]
    fn starts_once_when_control_then_windows_are_held() {
        let mut state = ChordState::default();
        assert_eq!(
            state.transition(KeyKind::Control, true, false),
            HookAction::Pass
        );
        assert_eq!(
            state.transition(KeyKind::Windows, true, false),
            HookAction::StartAndSuppress
        );
        assert_eq!(
            state.transition(KeyKind::Windows, true, false),
            HookAction::Suppress
        );
    }

    #[test]
    fn releasing_either_modifier_stops_once_and_suppresses_both_releases() {
        let mut state = ChordState::default();
        state.transition(KeyKind::Control, true, false);
        state.transition(KeyKind::Windows, true, false);

        assert_eq!(
            state.transition(KeyKind::Control, false, false),
            HookAction::StopAndSuppress
        );
        assert_eq!(
            state.transition(KeyKind::Windows, false, false),
            HookAction::Suppress
        );
    }

    #[test]
    fn passes_unrelated_and_injected_events_through() {
        let mut state = ChordState::default();
        assert_eq!(
            state.transition(KeyKind::Other, true, false),
            HookAction::Pass
        );
        assert_eq!(
            state.transition(KeyKind::Control, true, true),
            HookAction::Pass
        );
    }
}
