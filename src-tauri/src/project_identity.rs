use serde::Serialize;
use std::path::{Path, PathBuf};

const PROJECT_FOLDER_ERROR: &str = "The selected Project folder is unavailable.";

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectRootIdentity {
    root_path: String,
    root_identity: String,
    display_name: String,
}

#[tauri::command]
pub fn identify_project_root(path: String) -> Result<ProjectRootIdentity, String> {
    identify_root(Path::new(path.trim())).map_err(str::to_string)
}

fn identify_root(path: &Path) -> Result<ProjectRootIdentity, &'static str> {
    if !path.is_absolute() || !path.is_dir() {
        return Err(PROJECT_FOLDER_ERROR);
    }

    let root_path = normalized_path(path)?;
    let normalized = PathBuf::from(&root_path);
    let display_name = normalized
        .file_name()
        .and_then(|name| name.to_str())
        .map(str::trim)
        .filter(|name| !name.is_empty() && name.len() <= 80 && !name.chars().any(char::is_control))
        .ok_or(PROJECT_FOLDER_ERROR)?
        .to_string();

    Ok(ProjectRootIdentity {
        root_identity: crate::localhost_manager::project_fingerprint(&normalized),
        root_path,
        display_name,
    })
}

fn normalized_path(path: &Path) -> Result<String, &'static str> {
    let mut value = path.to_string_lossy().replace('/', "\\");
    while value.len() > 3 && value.ends_with('\\') {
        value.pop();
    }
    (!value.is_empty() && value.len() <= 520 && !value.chars().any(char::is_control))
        .then_some(value)
        .ok_or(PROJECT_FOLDER_ERROR)
}

#[cfg(test)]
mod tests {
    use super::identify_root;

    #[test]
    fn identifies_an_existing_absolute_folder_without_enumerating_it() {
        let root = std::env::current_dir().expect("current directory");
        let identity = identify_root(&root).expect("valid project root");
        assert!(identity.root_identity.starts_with("project-"));
        assert!(!identity.display_name.is_empty());
        assert_eq!(
            identity.root_identity,
            crate::localhost_manager::project_fingerprint(&root)
        );
    }

    #[test]
    fn rejects_relative_and_missing_folders() {
        assert!(identify_root(std::path::Path::new("relative-folder")).is_err());
        let missing = std::env::temp_dir().join("qolayer-project-folder-that-does-not-exist");
        assert!(identify_root(&missing).is_err());
    }
}
