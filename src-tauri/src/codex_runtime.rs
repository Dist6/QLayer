use std::path::{Path, PathBuf};

const SUPPORTED_APP_EXECUTABLES: [&str; 2] = ["chatgpt.exe", "codex.exe"];

pub fn resolve_codex_runtime() -> Result<PathBuf, &'static str> {
    let app_path = crate::window_focus::verified_codex_process_path()
        .ok_or("Recent chats are unavailable.")?;
    derive_runtime_path(&app_path)
}

fn derive_runtime_path(app_path: &Path) -> Result<PathBuf, &'static str> {
    let executable = app_path
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or("Recent chats are unavailable.")?;
    if !SUPPORTED_APP_EXECUTABLES
        .iter()
        .any(|supported| executable.eq_ignore_ascii_case(supported))
    {
        return Err("Recent chats are unavailable.");
    }

    let runtime = app_path
        .parent()
        .map(|parent| parent.join("resources").join("codex.exe"))
        .ok_or("Recent chats are unavailable.")?;

    if !runtime.is_file() {
        return Err("Recent chats are unavailable.");
    }

    Ok(runtime)
}

#[cfg(test)]
mod tests {
    use super::derive_runtime_path;
    use std::path::Path;

    #[test]
    fn rejects_unverified_application_names() {
        assert!(derive_runtime_path(Path::new("C:\\Apps\\Example.exe")).is_err());
    }
}
