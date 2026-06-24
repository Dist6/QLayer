use tauri_plugin_opener::OpenerExt;

#[tauri::command]
fn open_codex_url(app: tauri::AppHandle, url: String) -> Result<(), String> {
    if !is_allowed_codex_url(&url) {
        return Err("QoLayer blocked an unsupported Codex link.".to_string());
    }

    app.opener()
        .open_url(url, None::<&str>)
        .map_err(|_| "Codex could not be opened. Make sure Codex is installed and deep links are enabled.".to_string())
}

fn is_allowed_codex_url(url: &str) -> bool {
    matches!(url, "codex://" | "codex://settings" | "codex://threads/new")
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![open_codex_url])
        .run(tauri::generate_context!())
        .expect("error while running QoLayer");
}
