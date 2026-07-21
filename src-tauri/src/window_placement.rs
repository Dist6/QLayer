use tauri::{AppHandle, Manager, PhysicalPosition};

const MAIN_WINDOW_LABEL: &str = "main";
const WINDOW_MARGIN: i32 = 16;

pub fn place_main_window(app: &AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window(MAIN_WINDOW_LABEL)
        .ok_or_else(|| "QLayer window is unavailable.".to_string())?;
    let size = window
        .outer_size()
        .map_err(|_| "QLayer window size is unavailable.".to_string())?;

    if let Some(work_area) = platform::cursor_monitor_work_area() {
        let (x, y) = bottom_right_position(
            work_area,
            size.width as i32,
            size.height as i32,
            WINDOW_MARGIN,
        );
        window
            .set_position(PhysicalPosition::new(x, y))
            .map_err(|_| "QLayer window could not be positioned.".to_string())?;
    }

    Ok(())
}

fn bottom_right_position(
    work_area: (i32, i32, i32, i32),
    width: i32,
    height: i32,
    margin: i32,
) -> (i32, i32) {
    let (left, top, right, bottom) = work_area;
    (
        (right - width - margin).max(left),
        (bottom - height - margin).max(top),
    )
}

#[cfg(windows)]
mod platform {
    use windows::Win32::Foundation::POINT;
    use windows::Win32::Graphics::Gdi::{
        GetMonitorInfoW, MonitorFromPoint, MONITORINFO, MONITOR_DEFAULTTONEAREST,
    };
    use windows::Win32::UI::WindowsAndMessaging::GetCursorPos;

    pub fn cursor_monitor_work_area() -> Option<(i32, i32, i32, i32)> {
        let mut cursor = POINT::default();
        unsafe { GetCursorPos(&mut cursor).ok()? };
        let monitor = unsafe { MonitorFromPoint(cursor, MONITOR_DEFAULTTONEAREST) };
        let mut info = MONITORINFO {
            cbSize: std::mem::size_of::<MONITORINFO>() as u32,
            ..Default::default()
        };
        unsafe { GetMonitorInfoW(monitor, &mut info).as_bool() }.then_some(())?;
        Some((
            info.rcWork.left,
            info.rcWork.top,
            info.rcWork.right,
            info.rcWork.bottom,
        ))
    }
}

#[cfg(not(windows))]
mod platform {
    pub fn cursor_monitor_work_area() -> Option<(i32, i32, i32, i32)> {
        None
    }
}

#[cfg(test)]
mod tests {
    use super::bottom_right_position;

    #[test]
    fn places_the_toolbox_inside_the_monitor_work_area() {
        assert_eq!(
            bottom_right_position((0, 0, 1920, 1040), 480, 520, 16),
            (1424, 504)
        );
        assert_eq!(
            bottom_right_position((100, 100, 500, 400), 480, 520, 16),
            (100, 100)
        );
    }
}
