use std::sync::atomic::{AtomicBool, Ordering};

pub struct WindowBehaviorState {
    close_to_tray: AtomicBool,
}

impl Default for WindowBehaviorState {
    fn default() -> Self {
        Self {
            close_to_tray: AtomicBool::new(true),
        }
    }
}

impl WindowBehaviorState {
    pub fn close_to_tray(&self) -> bool {
        self.close_to_tray.load(Ordering::Relaxed)
    }

    pub fn set_close_to_tray(&self, enabled: bool) {
        self.close_to_tray.store(enabled, Ordering::Relaxed);
    }
}

#[cfg(test)]
mod tests {
    use super::WindowBehaviorState;

    #[test]
    fn closes_to_tray_by_default_and_can_be_disabled() {
        let state = WindowBehaviorState::default();
        assert!(state.close_to_tray());

        state.set_close_to_tray(false);
        assert!(!state.close_to_tray());
    }
}
