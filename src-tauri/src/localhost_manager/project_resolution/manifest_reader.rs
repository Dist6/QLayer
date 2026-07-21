use crate::localhost_manager::models::DevelopmentServerKind;
use serde_json::Value;
use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;

const MAX_MANIFEST_BYTES: u64 = 256 * 1024;
const MAX_CACHE_ENTRIES: usize = 128;

#[derive(Clone, Debug, Eq, PartialEq)]
pub(crate) struct ManifestEvidence {
    pub project_name: Option<String>,
    pub kind: Option<DevelopmentServerKind>,
}

#[derive(Clone)]
struct CacheEntry {
    signature: (u64, u128),
    evidence: Option<ManifestEvidence>,
}

#[derive(Default)]
pub(crate) struct ManifestCache {
    entries: HashMap<PathBuf, CacheEntry>,
}

impl ManifestCache {
    pub(crate) fn resolve(&mut self, root: &Path) -> Option<ManifestEvidence> {
        for path in manifest_paths(root) {
            let Some(signature) = file_signature(&path) else { continue };
            if let Some(entry) = self.entries.get(&path) {
                if entry.signature == signature {
                    if entry.evidence.is_some() { return entry.evidence.clone() }
                    continue;
                }
            }
            let evidence = read_manifest(&path);
            if self.entries.len() >= MAX_CACHE_ENTRIES { self.entries.clear() }
            self.entries.insert(path, CacheEntry { signature, evidence: evidence.clone() });
            if evidence.is_some() { return evidence }
        }
        None
    }
}

fn manifest_paths(root: &Path) -> Vec<PathBuf> {
    let mut paths = ["package.json", "pyproject.toml", "Cargo.toml", "go.mod"]
        .into_iter()
        .map(|name| root.join(name))
        .collect::<Vec<_>>();
    if let Ok(entries) = fs::read_dir(root) {
        let mut projects = entries
            .filter_map(Result::ok)
            .map(|entry| entry.path())
            .filter(|path| path.extension().and_then(|value| value.to_str()).is_some_and(|value| value.eq_ignore_ascii_case("csproj")))
            .take(2)
            .collect::<Vec<_>>();
        if projects.len() == 1 { paths.push(projects.remove(0)); }
    }
    paths
}

fn file_signature(path: &Path) -> Option<(u64, u128)> {
    let metadata = fs::metadata(path).ok()?;
    if !metadata.is_file() || metadata.len() > MAX_MANIFEST_BYTES { return None }
    let modified = metadata.modified().ok()?.duration_since(UNIX_EPOCH).ok()?.as_nanos();
    Some((metadata.len(), modified))
}

fn read_manifest(path: &Path) -> Option<ManifestEvidence> {
    let content = fs::read_to_string(path).ok()?;
    let filename = path.file_name()?.to_string_lossy().to_ascii_lowercase();
    let (name, dependencies) = match filename.as_str() {
        "package.json" => parse_package_json(&content)?,
        "pyproject.toml" => parse_toml_manifest(&content, "project"),
        "cargo.toml" => parse_toml_manifest(&content, "package"),
        "go.mod" => (parse_go_module(&content), HashSet::new()),
        value if value.ends_with(".csproj") => parse_csproj(&content),
        _ => return None,
    };
    Some(ManifestEvidence {
        project_name: sanitize_name(name.as_deref()),
        kind: kind_from_dependencies(&dependencies),
    })
}

fn parse_package_json(content: &str) -> Option<(Option<String>, HashSet<String>)> {
    let value = serde_json::from_str::<Value>(content).ok()?;
    let name = value.get("name").and_then(Value::as_str).map(str::to_string);
    let mut dependencies = HashSet::new();
    for section in ["dependencies", "devDependencies", "peerDependencies"] {
        if let Some(values) = value.get(section).and_then(Value::as_object) {
            dependencies.extend(values.keys().map(|key| key.to_ascii_lowercase()));
        }
    }
    Some((name, dependencies))
}

fn parse_toml_manifest(content: &str, target_section: &str) -> (Option<String>, HashSet<String>) {
    let mut section = "";
    let mut name = None;
    let mut dependencies = HashSet::new();
    for raw_line in content.lines() {
        let line = raw_line.trim();
        if line.starts_with('[') && line.ends_with(']') {
            section = line.trim_matches(['[', ']']).trim();
            continue;
        }
        let Some((key, value)) = line.split_once('=') else { continue };
        let key = key.trim();
        if section == target_section && key == "name" {
            name = quoted_value(value);
        }
        if section.contains("dependencies") {
            dependencies.insert(key.trim_matches(['"', '\'']).to_ascii_lowercase());
        }
    }
    let lower = content.to_ascii_lowercase();
    for signature in known_dependency_signatures() {
        if lower.contains(signature) { dependencies.insert((*signature).to_string()); }
    }
    (name, dependencies)
}

fn parse_go_module(content: &str) -> Option<String> {
    let module = content.lines().find_map(|line| line.trim().strip_prefix("module "))?.trim();
    module.rsplit('/').next().map(str::to_string)
}

fn parse_csproj(content: &str) -> (Option<String>, HashSet<String>) {
    let name = xml_value(content, "AssemblyName").or_else(|| xml_value(content, "RootNamespace"));
    let lower = content.to_ascii_lowercase();
    let dependencies = known_dependency_signatures().iter().filter(|value| lower.contains(**value)).map(|value| (*value).to_string()).collect();
    (name, dependencies)
}

fn xml_value(content: &str, tag: &str) -> Option<String> {
    let start_tag = format!("<{tag}>");
    let end_tag = format!("</{tag}>");
    let start = content.find(&start_tag)? + start_tag.len();
    let end = content.get(start..)?.find(&end_tag)? + start;
    Some(content.get(start..end)?.trim().to_string())
}

fn quoted_value(value: &str) -> Option<String> {
    let value = value.trim();
    let quote = value.chars().next()?;
    if !matches!(quote, '"' | '\'') { return None }
    let rest = value.get(1..)?;
    Some(rest.get(..rest.find(quote)?)?.to_string())
}

fn sanitize_name(value: Option<&str>) -> Option<String> {
    let value = value?.trim();
    (!value.is_empty() && value.len() <= 64 && !value.chars().any(char::is_control)).then(|| value.to_string())
}

pub(crate) fn infer_kind(command: &str, dependencies: &[String]) -> DevelopmentServerKind {
    let values = dependencies.iter().map(String::as_str).collect::<Vec<_>>();
    if contains_any(command, &["\\next\\", "next dev", "\\nuxt\\", "nuxt dev", "remix dev", "svelte-kit"])
        || contains_any_slice(&values, &["next", "nuxt", "@remix-run/node", "@sveltejs/kit"])
    { DevelopmentServerKind::FullStack }
    else if contains_any(command, &["\\vite\\", "vite.js", "react-scripts", "webpack-dev-server", "angular\\cli", "astro dev"])
        || contains_any_slice(&values, &["vite", "react-scripts", "@angular/core", "astro", "webpack-dev-server"])
    { DevelopmentServerKind::Frontend }
    else if contains_any(command, &["uvicorn", "gunicorn", "manage.py", "flask run", "artisan serve", "nest start", "dotnet watch", "spring-boot"])
        || contains_any_slice(&values, &["fastapi", "django", "flask", "@nestjs/core", "microsoft.aspnetcore", "spring-boot", "laravel/framework", "rails", "axum", "actix-web"])
    { DevelopmentServerKind::Backend }
    else { DevelopmentServerKind::Unknown }
}

fn kind_from_dependencies(values: &HashSet<String>) -> Option<DevelopmentServerKind> {
    let list = values.iter().cloned().collect::<Vec<_>>();
    let kind = infer_kind("", &list);
    (kind != DevelopmentServerKind::Unknown).then_some(kind)
}

fn contains_any(value: &str, signatures: &[&str]) -> bool { signatures.iter().any(|signature| value.contains(signature)) }
fn contains_any_slice(values: &[&str], signatures: &[&str]) -> bool { signatures.iter().any(|signature| values.iter().any(|value| value.eq_ignore_ascii_case(signature))) }
fn known_dependency_signatures() -> &'static [&'static str] { &["next", "nuxt", "@remix-run/node", "@sveltejs/kit", "vite", "react-scripts", "@angular/core", "astro", "webpack-dev-server", "fastapi", "django", "flask", "@nestjs/core", "microsoft.aspnetcore", "spring-boot", "laravel/framework", "rails", "axum", "actix-web"] }

#[cfg(test)]
mod tests {
    use super::{infer_kind, parse_csproj, parse_go_module, parse_package_json, parse_toml_manifest};
    use crate::localhost_manager::models::DevelopmentServerKind;

    #[test]
    fn parses_package_identity_and_framework() {
        let (name, dependencies) = parse_package_json(r#"{"name":"portal","devDependencies":{"vite":"1"}}"#).unwrap();
        assert_eq!(name.as_deref(), Some("portal"));
        assert_eq!(infer_kind("", &dependencies.into_iter().collect::<Vec<_>>()), DevelopmentServerKind::Frontend);
    }

    #[test]
    fn parses_other_allowlisted_manifest_names() {
        assert_eq!(parse_toml_manifest("[project]\nname = \"api\"", "project").0.as_deref(), Some("api"));
        assert_eq!(parse_toml_manifest("[package]\nname = \"worker\"", "package").0.as_deref(), Some("worker"));
        assert_eq!(parse_go_module("module github.com/acme/service\n").as_deref(), Some("service"));
        assert_eq!(parse_csproj("<Project><PropertyGroup><AssemblyName>Api</AssemblyName></PropertyGroup></Project>").0.as_deref(), Some("Api"));
    }
}
