use tauri::{
    AppHandle, Manager, PhysicalPosition, WebviewUrl, WebviewWindow, WebviewWindowBuilder,
};

const SELECTOR_WINDOW_LABEL: &str = "voice-selector";

#[tauri::command]
pub async fn show_voice_selector(app: AppHandle) -> Result<bool, String> {
    let (window, created) = match app.get_webview_window(SELECTOR_WINDOW_LABEL) {
        Some(window) => (window, false),
        None => (build_selector_window(&app)?, true),
    };
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
        .map_err(|_| "Voice destination selector could not be shown.".to_string())?;
    Ok(created)
}

#[tauri::command]
pub fn hide_voice_selector(app: AppHandle) -> Result<(), String> {
    let Some(window) = app.get_webview_window(SELECTOR_WINDOW_LABEL) else {
        return Ok(());
    };
    window
        .destroy()
        .map_err(|_| "Voice destination selector could not be closed.".to_string())
}

fn build_selector_window(app: &AppHandle) -> Result<WebviewWindow, String> {
    let mut builder = WebviewWindowBuilder::new(
        app,
        SELECTOR_WINDOW_LABEL,
        WebviewUrl::App("index.html?window=voice-selector".into()),
    )
    .title("Choose a voice destination")
    .inner_size(320.0, 330.0)
    .min_inner_size(320.0, 120.0)
    .max_inner_size(320.0, 330.0)
    .visible(false)
    .resizable(false)
    .decorations(false)
    .transparent(true)
    .shadow(false)
    .always_on_top(true)
    .focused(false)
    .skip_taskbar(true);

    if let Some(icon) = app.default_window_icon().cloned() {
        builder = builder
            .icon(icon)
            .map_err(|_| "Voice destination selector icon is unavailable.".to_string())?;
    }

    builder
        .build()
        .map_err(|_| "Voice destination selector could not be created.".to_string())
}

fn clamp_position(cursor: i32, start: i32, end: i32, size: i32, offset: i32) -> i32 {
    (cursor + offset).clamp(start, (end - size).max(start))
}

#[cfg(windows)]
mod platform {
    use super::clamp_position;
    use windows::Win32::Foundation::{POINT, RECT};
    use windows::Win32::Graphics::Gdi::{
        GetMonitorInfoW, MonitorFromPoint, MONITORINFO, MONITOR_DEFAULTTONEAREST,
    };
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
