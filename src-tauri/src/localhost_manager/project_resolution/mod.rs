mod alias_store;
mod fingerprint;
mod manifest_reader;
mod path_candidates;
mod process_tree;
mod project_roots;

pub(crate) use alias_store::AliasStore;
pub(crate) use fingerprint::{fallback_fingerprint, project_fingerprint};
pub(crate) use manifest_reader::ManifestCache;
pub(crate) use process_tree::{discover_parent_map, process_chain};

use crate::localhost_manager::models::{DevelopmentServerKind, ProcessMetadata};
use manifest_reader::ManifestEvidence;
use path_candidates::candidate_directories;
use project_roots::ranked_roots;
use std::path::Path;

#[derive(Clone, Debug, Default, Eq, PartialEq)]
pub(crate) struct ProjectResolution {
    pub project_id: Option<String>,
    pub project_name: Option<String>,
    pub kind: DevelopmentServerKind,
}

pub(crate) fn resolve_project(
    processes: &[ProcessMetadata],
    cache: &mut ManifestCache,
) -> ProjectResolution {
    let roots = ranked_roots(&candidate_directories(processes));
    for root in &roots {
        if let Some(manifest) = cache.resolve(root) {
            return resolution_from_manifest(root, manifest, processes);
        }
    }

    fallback_node_modules_resolution(processes).unwrap_or_else(|| ProjectResolution {
        kind: infer_kind_from_commands(processes),
        ..ProjectResolution::default()
    })
}

fn resolution_from_manifest(
    root: &Path,
    manifest: ManifestEvidence,
    processes: &[ProcessMetadata],
) -> ProjectResolution {
    ProjectResolution {
        project_id: Some(project_fingerprint(root)),
        project_name: manifest.project_name.or_else(|| folder_name(root)),
        kind: manifest
            .kind
            .unwrap_or_else(|| infer_kind_from_commands(processes)),
    }
}

fn fallback_node_modules_resolution(processes: &[ProcessMetadata]) -> Option<ProjectResolution> {
    for process in processes {
        let Some(command_line) = process.command_line.as_deref() else {
            continue;
        };
        let command = command_line.replace('/', "\\");
        let Some(marker) = command.to_ascii_lowercase().find("\\node_modules\\") else {
            continue;
        };
        let Some(prefix) = command.get(..marker) else {
            continue;
        };
        let prefix = prefix.trim_end();
        let Some(candidate) = prefix
            .rsplit_once('"')
            .map(|(_, value)| value)
            .or_else(|| prefix.split_whitespace().next_back())
        else {
            continue;
        };
        let root = Path::new(candidate.trim_matches('"'));
        if root.is_absolute() {
            return Some(ProjectResolution {
                project_id: Some(project_fingerprint(root)),
                project_name: folder_name(root),
                kind: infer_kind_from_commands(processes),
            });
        }
    }
    None
}

fn folder_name(path: &Path) -> Option<String> {
    let value = path.file_name()?.to_string_lossy();
    let value = value.trim();
    (!value.is_empty() && value.len() <= 48 && !value.chars().any(char::is_control))
        .then(|| value.to_string())
}

fn infer_kind_from_commands(processes: &[ProcessMetadata]) -> DevelopmentServerKind {
    let command = processes
        .iter()
        .filter_map(|process| process.command_line.as_deref())
        .collect::<Vec<_>>()
        .join(" ")
        .replace('/', "\\")
        .to_ascii_lowercase();
    manifest_reader::infer_kind(&command, &[])
}

#[cfg(test)]
mod tests {
    use super::{resolve_project, ManifestCache};
    use crate::localhost_manager::models::{DevelopmentServerKind, ProcessMetadata};

    #[test]
    fn retains_node_modules_fallback_without_reading_unrelated_files() {
        let processes = vec![ProcessMetadata {
            command_line: Some(
                r#"node "C:\Projects\QLayer\node_modules\vite\bin\vite.js""#.to_string(),
            ),
            ..ProcessMetadata::default()
        }];
        let resolution = resolve_project(&processes, &mut ManifestCache::default());
        assert_eq!(resolution.project_name.as_deref(), Some("QLayer"));
        assert_eq!(resolution.kind, DevelopmentServerKind::Frontend);
        assert!(resolution.project_id.is_some());
    }
}
