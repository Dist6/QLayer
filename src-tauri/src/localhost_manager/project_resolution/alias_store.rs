use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

const ALIAS_ERROR: &str = "The project name could not be saved.";

#[derive(Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct StoredAliases {
    aliases: HashMap<String, String>,
}

#[derive(Default)]
pub(crate) struct AliasStore {
    path: Option<PathBuf>,
    aliases: HashMap<String, String>,
}

impl AliasStore {
    pub(crate) fn load(path: PathBuf) -> Self {
        let aliases = fs::read_to_string(&path)
            .ok()
            .and_then(|content| serde_json::from_str::<StoredAliases>(&content).ok())
            .map(|stored| stored.aliases)
            .unwrap_or_default();
        Self { path: Some(path), aliases }
    }

    pub(crate) fn get(&self, project_id: &str) -> Option<&str> {
        self.aliases.get(project_id).map(String::as_str)
    }

    pub(crate) fn set(&mut self, project_id: &str, name: &str) -> Result<(), String> {
        let name = validate_alias(name)?;
        self.aliases.insert(project_id.to_string(), name);
        self.save()
    }

    pub(crate) fn remove(&mut self, project_id: &str) -> Result<(), String> {
        self.aliases.remove(project_id);
        self.save()
    }

    fn save(&self) -> Result<(), String> {
        let Some(path) = self.path.as_ref() else { return Ok(()) };
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).map_err(|_| ALIAS_ERROR.to_string())?;
        }
        let content = serde_json::to_string_pretty(&StoredAliases { aliases: self.aliases.clone() })
            .map_err(|_| ALIAS_ERROR.to_string())?;
        fs::write(path, content).map_err(|_| ALIAS_ERROR.to_string())
    }
}

fn validate_alias(value: &str) -> Result<String, String> {
    let value = value.trim();
    if value.is_empty() || value.len() > 48 || value.chars().any(char::is_control) {
        return Err("Project names must contain 1 to 48 visible characters.".to_string());
    }
    Ok(value.to_string())
}

#[cfg(test)]
mod tests {
    use super::AliasStore;

    #[test]
    fn validates_and_updates_in_memory_aliases() {
        let mut store = AliasStore::default();
        store.set("project-1", "  API  ").unwrap();
        assert_eq!(store.get("project-1"), Some("API"));
        store.remove("project-1").unwrap();
        assert_eq!(store.get("project-1"), None);
        assert!(store.set("project-1", "").is_err());
        assert!(store.set("project-1", &"x".repeat(49)).is_err());
    }
}
