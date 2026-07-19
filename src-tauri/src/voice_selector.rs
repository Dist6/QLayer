use tauri::{Manager, PhysicalPosition};

const SELECTOR_WINDOW_LABEL: &str = "voice-selector";

#[tauri::command]
pub fn show_voice_selector(app: tauri::AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window(SELECTOR_WINDOW_LABEL)
        .ok_or_else(|| "Voice destination selector is unavailable.".to_string())?;
    let size = window
        .outer_size()
        .map_err(|_| "Voice destination selector is unavailable.".to_string())?;
    if let Some((x, y)) = platform::position_near_cursor(size.width as i32, size.height as i32) {
        window
            .set_position(PhysicalPosition::new(x, y))
            .map_err(|_| "Voice destination selector could not be positioned.".to_string())?;
    }
    window
        .show()
        .and_then(|_| window.set_focus())
        .map_err(|_| "Voice destination selector could not be shown.".to_string())
}

#[tauri::command]
pub fn hide_voice_selector(app: tauri::AppHandle) -> Result<(), String> {
    app.get_webview_window(SELECTOR_WINDOW_LABEL)
        .ok_or_else(|| "Voice destination selector is unavailable.".to_string())?
        .hide()
        .map_err(|_| "Voice destination selector could not be hidden.".to_string())
}

fn clamp_position(cursor: i32, start: i32, end: i32, size: i32, offset: i32) -> i32 {
    (cursor + offset).clamp(start, (end - size).max(start))
}

#[cfg(windows)]
mod platform {
    use super::clamp_position;
    use windows::Win32::Foundation::{POINT, RECT};
    use windows::Win32::Graphics::Gdi::{GetMonitorInfoW, MonitorFromPoint, MONITORINFO, MONITOR_DEFAULTTONEAREST};
    use windows::Win32::UI::WindowsAndMessaging::GetCursorPos;

    pub fn position_near_cursor(width: i32, height: i32) -> Option<(i32, i32)> {
        let mut cursor = POINT::default();
        unsafe { GetCursorPos(&mut cursor).ok()? };
        let monitor = unsafe { MonitorFromPoint(cursor, MONITOR_DEFAULTTONEAREST) };
        let mut info = MONITORINFO {
            cbSize: std::mem::size_of::<MONITORINFO>() as u32,
            ..Default::default()
        };
        unsafe { GetMonitorInfoW(monitor, &mut info).as_bool() }.then_some(())?;
        Some(clamp_to_work_area(cursor, info.rcWork, width, height))
    }

    fn clamp_to_work_area(cursor: POINT, area: RECT, width: i32, height: i32) -> (i32, i32) {
        (
            clamp_position(cursor.x, area.left, area.right, width, 14),
            clamp_position(cursor.y, area.top, area.bottom, height, 18),
        )
    }
}

#[cfg(not(windows))]
mod platform {
    pub fn position_near_cursor(_width: i32, _height: i32) -> Option<(i32, i32)> {
        None
    }
}

#[cfg(test)]
mod tests {
    use super::clamp_position;

    #[test]
    fn clamps_selector_to_the_monitor_work_area() {
        assert_eq!(clamp_position(950, 0, 1000, 320, 14), 680);
        assert_eq!(clamp_position(-20, 0, 1000, 320, 14), 0);
        assert_eq!(clamp_position(300, 0, 1000, 320, 14), 314);
    }
}
