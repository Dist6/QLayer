use crate::localhost_manager::models::ProcessMetadata;
use std::collections::HashSet;
use std::path::{Path, PathBuf};

pub(crate) fn candidate_directories(processes: &[ProcessMetadata]) -> Vec<PathBuf> {
    let mut candidates = Vec::new();
    let mut seen = HashSet::new();
    for process in processes {
        if let Some(path) = process.executable_path.as_deref() {
            push_candidate(path, &mut candidates, &mut seen);
        }
        if let Some(command) = process.command_line.as_deref() {
            for argument in tokenize(command) {
                push_candidate(&argument, &mut candidates, &mut seen);
                if candidates.len() >= 24 {
                    return candidates;
                }
            }
        }
    }
    candidates
}

fn push_candidate(value: &str, output: &mut Vec<PathBuf>, seen: &mut HashSet<String>) {
    let normalized = value.trim_matches(['"', '\'']).replace('/', "\\");
    if let Some(marker) = normalized.to_ascii_lowercase().find("\\node_modules\\") {
        push_directory(Path::new(&normalized[..marker]), output, seen);
    }
    let path = Path::new(&normalized);
    if !path.is_absolute() {
        return;
    }
    let directory = if path.extension().is_some() {
        path.parent()
    } else {
        Some(path)
    };
    let Some(directory) = directory else { return };
    push_directory(directory, output, seen);
}

fn push_directory(directory: &Path, output: &mut Vec<PathBuf>, seen: &mut HashSet<String>) {
    if !directory.is_absolute() {
        return;
    }
    let key = directory.to_string_lossy().to_ascii_lowercase();
    if seen.insert(key) {
        output.push(directory.to_path_buf())
    }
}

fn tokenize(value: &str) -> Vec<String> {
    let mut output = Vec::new();
    let mut current = String::new();
    let mut quoted = false;
    for character in value.chars() {
        match character {
            '"' => quoted = !quoted,
            value if value.is_whitespace() && !quoted => {
                if !current.is_empty() {
                    output.push(std::mem::take(&mut current));
                }
            }
            value => current.push(value),
        }
    }
    if !current.is_empty() {
        output.push(current)
    }
    output
}

#[cfg(test)]
mod tests {
    use super::candidate_directories;
    use crate::localhost_manager::models::ProcessMetadata;
    use std::path::PathBuf;

    #[test]
    fn extracts_absolute_paths_and_ignores_relative_arguments() {
        let metadata = ProcessMetadata {
            command_line: Some(
                r#"node "C:\Projects\My App\node_modules\vite\bin\vite.js" relative.js"#
                    .to_string(),
            ),
            ..ProcessMetadata::default()
        };
        assert_eq!(
            candidate_directories(&[metadata]),
            vec![
                PathBuf::from(r"C:\Projects\My App"),
                PathBuf::from(r"C:\Projects\My App\node_modules\vite\bin"),
            ]
        );
    }

    #[test]
    fn normalizes_and_deduplicates_paths() {
        let metadata = ProcessMetadata {
            command_line: Some(
                r#"python C:/Projects/Api/manage.py "C:\Projects\Api\manage.py""#.to_string(),
            ),
            ..ProcessMetadata::default()
        };
        assert_eq!(
            candidate_directories(&[metadata]),
            vec![PathBuf::from(r"C:\Projects\Api")]
        );
    }
}
