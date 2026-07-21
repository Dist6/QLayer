mod classification;
mod models;
mod process_info;
mod project_resolution;
mod windows_discovery;

pub use models::LocalhostServer;

use classification::classify;
use models::{
    binding_for, localhost_address, localhost_url, ListenerBinding, ListenerRow, ProcessMetadata,
    ProjectNameSource, ServerClassification, TrustedServer,
};
use project_resolution::{
    discover_parent_map, fallback_fingerprint, process_chain, resolve_project, AliasStore,
    ManifestCache, ProjectResolution,
};
use serde::Serialize;
use std::collections::{BTreeMap, HashMap};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use std::path::PathBuf;

const SNAPSHOT_MAX_AGE: Duration = Duration::from_secs(120);
const LOCALHOST_ERROR: &str = "Local development servers could not be inspected.";
const SERVER_GONE_ERROR: &str = "That local server is no longer available. Refresh and try again.";

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalhostSnapshot {
    servers: Vec<LocalhostServer>,
    has_limited_process_access: bool,
}

#[derive(Clone, Default)]
pub struct LocalhostManagerState {
    inner: Arc<Mutex<ManagerData>>,
}

#[derive(Default)]
struct ManagerData {
    next_id: u64,
    ids: HashMap<ProcessIdentity, String>,
    trusted: HashMap<String, TrustedServer>,
    captured_at: Option<Instant>,
    cpu_samples: HashMap<ProcessIdentity, CpuSample>,
    manifest_cache: ManifestCache,
    aliases: AliasStore,
}

#[derive(Clone, Copy, Debug, Eq, Hash, PartialEq)]
struct ProcessIdentity {
    pid: u32,
    port: u16,
    creation_ticks: Option<u64>,
}

#[derive(Clone, Copy)]
struct CpuSample {
    cpu_ticks: u64,
    captured_at: Instant,
}

impl LocalhostManagerState {
    pub fn with_alias_path(path: PathBuf) -> Self {
        Self {
            inner: Arc::new(Mutex::new(ManagerData {
                aliases: AliasStore::load(path),
                ..ManagerData::default()
            })),
        }
    }

    pub fn refresh(&self) -> Result<LocalhostSnapshot, String> {
        let listeners = windows_discovery::discover_listeners()?;
        let parents = discover_parent_map();
        let mut metadata = HashMap::new();
        for listener in &listeners {
            for pid in process_chain(listener.pid, &parents) {
                metadata.entry(pid).or_insert_with(|| process_info::inspect_process(pid));
            }
        }

        let mut resolutions = HashMap::new();
        {
            let mut data = self.inner.lock().map_err(|_| LOCALHOST_ERROR.to_string())?;
            for listener in &listeners {
                resolutions.entry(listener.pid).or_insert_with(|| {
                    let processes = process_chain(listener.pid, &parents)
                        .into_iter()
                        .filter_map(|pid| metadata.get(&pid).cloned())
                        .collect::<Vec<_>>();
                    resolve_project(&processes, &mut data.manifest_cache)
                });
            }
        }

        self.refresh_from_resolutions(
            listeners,
            metadata,
            resolutions,
            current_unix_ms(),
            Instant::now(),
        )
    }

    pub fn set_project_alias(&self, server_id: &str, name: &str) -> Result<(), String> {
        let mut data = self.inner.lock().map_err(|_| LOCALHOST_ERROR.to_string())?;
        let project_id = data
            .trusted
            .get(server_id)
            .and_then(|server| server.project_id.clone())
            .ok_or_else(|| "That local server can no longer be named. Refresh and try again.".to_string())?;
        data.aliases.set(&project_id, name)
    }

    pub fn remove_project_alias(&self, server_id: &str) -> Result<(), String> {
        let mut data = self.inner.lock().map_err(|_| LOCALHOST_ERROR.to_string())?;
        let project_id = data
            .trusted
            .get(server_id)
            .and_then(|server| server.project_id.clone())
            .ok_or_else(|| "That local server can no longer be renamed. Refresh and try again.".to_string())?;
        data.aliases.remove(&project_id)
    }

    pub fn resolve_open_url(&self, server_id: &str) -> Result<String, String> {
        let trusted = {
            let data = self.inner.lock().map_err(|_| SERVER_GONE_ERROR.to_string())?;
            data.captured_at
                .filter(|captured| captured.elapsed() <= SNAPSHOT_MAX_AGE)
                .ok_or_else(|| SERVER_GONE_ERROR.to_string())?;
            data.trusted
                .get(server_id)
                .filter(|server| server.classification == ServerClassification::Development)
                .cloned()
                .ok_or_else(|| SERVER_GONE_ERROR.to_string())?
        };

        let listeners = windows_discovery::discover_listeners().map_err(|_| SERVER_GONE_ERROR)?;
        let still_listening = listeners.iter().any(|listener| {
            listener.pid == trusted.pid
                && listener.port == trusted.port
                && binding_for(listener.address).is_some()
        });
        if !still_listening {
            return Err(SERVER_GONE_ERROR.to_string());
        }

        let metadata = process_info::inspect_process(trusted.pid);
        if trusted.creation_ticks.is_some() && trusted.creation_ticks != metadata.creation_ticks {
            return Err(SERVER_GONE_ERROR.to_string());
        }
        if classify(&metadata, trusted.port) != ServerClassification::Development {
            return Err(SERVER_GONE_ERROR.to_string());
        }

        Ok(localhost_url(trusted.port))
    }

    #[cfg(test)]
    fn refresh_from(
        &self,
        listeners: Vec<ListenerRow>,
        metadata_by_pid: HashMap<u32, ProcessMetadata>,
        now_ms: u64,
        captured_at: Instant,
    ) -> Result<LocalhostSnapshot, String> {
        let mut cache = ManifestCache::default();
        let resolutions = metadata_by_pid
            .iter()
            .map(|(pid, metadata)| (*pid, resolve_project(std::slice::from_ref(metadata), &mut cache)))
            .collect();
        self.refresh_from_resolutions(
            listeners,
            metadata_by_pid,
            resolutions,
            now_ms,
            captured_at,
        )
    }

    fn refresh_from_resolutions(
        &self,
        listeners: Vec<ListenerRow>,
        metadata_by_pid: HashMap<u32, ProcessMetadata>,
        resolutions: HashMap<u32, ProjectResolution>,
        now_ms: u64,
        captured_at: Instant,
    ) -> Result<LocalhostSnapshot, String> {
        let mut unique = BTreeMap::<(u32, u16), ListenerBinding>::new();
        for listener in listeners {
            if listener.port == 0 {
                continue;
            }
            let Some(binding) = binding_for(listener.address) else {
                continue;
            };
            unique
                .entry((listener.pid, listener.port))
                .and_modify(|current| {
                    if binding == ListenerBinding::Loopback {
                        *current = binding;
                    }
                })
                .or_insert(binding);
        }

        let logical_processors = std::thread::available_parallelism()
            .map(|count| count.get())
            .unwrap_or(1) as f64;
        let mut data = self.inner.lock().map_err(|_| LOCALHOST_ERROR.to_string())?;
        let mut servers = Vec::with_capacity(unique.len());
        let mut trusted = HashMap::new();
        let mut current_ids = HashMap::new();
        let mut next_cpu_samples = HashMap::new();
        let mut has_limited_process_access = false;

        for ((pid, port), binding) in unique {
            let metadata = metadata_by_pid.get(&pid).cloned().unwrap_or_default();
            has_limited_process_access |= metadata.process_name.is_none();
            let classification = classify(&metadata, port);
            let resolution = resolutions.get(&pid).cloned().unwrap_or_default();
            let project_id = resolution
                .project_id
                .or_else(|| fallback_project_id(&metadata, port));
            let manual_name = project_id
                .as_deref()
                .and_then(|id| data.aliases.get(id))
                .map(str::to_string);
            let project_name_source = if manual_name.is_some() {
                Some(ProjectNameSource::Manual)
            } else if resolution.project_name.is_some() {
                Some(ProjectNameSource::Automatic)
            } else {
                None
            };
            let project_name = manual_name.or(resolution.project_name);
            let identity = ProcessIdentity {
                pid,
                port,
                creation_ticks: metadata.creation_ticks,
            };
            let id = data.ids.get(&identity).cloned().unwrap_or_else(|| {
                data.next_id = data.next_id.saturating_add(1);
                format!("local-{}", data.next_id)
            });
            current_ids.insert(identity, id.clone());

            let cpu_percent = cpu_percent(
                data.cpu_samples.get(&identity).copied(),
                metadata.cpu_ticks,
                captured_at,
                logical_processors,
            );
            if let Some(cpu_ticks) = metadata.cpu_ticks {
                next_cpu_samples.insert(
                    identity,
                    CpuSample {
                        cpu_ticks,
                        captured_at,
                    },
                );
            }

            let uptime_seconds = metadata
                .started_at_ms
                .and_then(|started| now_ms.checked_sub(started))
                .map(|elapsed| elapsed / 1_000);
            let url = (classification == ServerClassification::Development)
                .then(|| localhost_url(port));

            servers.push(LocalhostServer {
                id: id.clone(),
                display_address: localhost_address(port),
                url,
                port,
                is_running: true,
                process_name: metadata.process_name.clone(),
                memory_bytes: metadata.memory_bytes,
                started_at_ms: metadata.started_at_ms,
                uptime_seconds,
                cpu_percent,
                project_id: project_id.clone(),
                project_name,
                project_name_source,
                classification,
                kind: resolution.kind,
                binding,
            });
            trusted.insert(
                id,
                TrustedServer {
                    pid,
                    port,
                    creation_ticks: metadata.creation_ticks,
                    classification,
                    project_id,
                },
            );
        }

        servers.sort_by_key(|server| {
            (
                server.classification != ServerClassification::Development,
                server.port,
                server.process_name.clone(),
            )
        });
        data.ids = current_ids;
        data.trusted = trusted;
        data.captured_at = Some(captured_at);
        data.cpu_samples = next_cpu_samples;

        Ok(LocalhostSnapshot {
            servers,
            has_limited_process_access,
        })
    }
}

fn cpu_percent(
    previous: Option<CpuSample>,
    current_ticks: Option<u64>,
    captured_at: Instant,
    logical_processors: f64,
) -> Option<f32> {
    let previous = previous?;
    let current_ticks = current_ticks?;
    let elapsed = captured_at.checked_duration_since(previous.captured_at)?.as_secs_f64();
    if elapsed <= 0.0 || current_ticks < previous.cpu_ticks {
        return None;
    }

    let cpu_seconds = (current_ticks - previous.cpu_ticks) as f64 / 10_000_000.0;
    Some(((cpu_seconds / elapsed / logical_processors) * 100.0).clamp(0.0, 100.0) as f32)
}

fn fallback_project_id(metadata: &ProcessMetadata, port: u16) -> Option<String> {
    if let Some(command) = metadata.command_line.as_deref().filter(|value| !value.trim().is_empty()) {
        return Some(fallback_fingerprint(command));
    }
    let process = metadata.process_name.as_deref()?;
    Some(fallback_fingerprint(&format!("{process}|{port}")))
}

fn current_unix_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

#[cfg(test)]
mod tests {
    use super::{CpuSample, LocalhostManagerState};
    use crate::localhost_manager::models::{
        DevelopmentServerKind, ListenerBinding, ListenerRow, ProcessMetadata,
        ServerClassification,
    };
    use std::collections::HashMap;
    use std::net::{IpAddr, Ipv4Addr, Ipv6Addr};
    use std::time::{Duration, Instant};

    fn node_metadata() -> ProcessMetadata {
        ProcessMetadata {
            process_name: Some("node.exe".to_string()),
            executable_path: Some(r"C:\Program Files\nodejs\node.exe".to_string()),
            command_line: Some(
                r#"node "C:\Projects\QoLayer\node_modules\vite\bin\vite.js""#.to_string(),
            ),
            memory_bytes: Some(184_000_000),
            started_at_ms: Some(1_000),
            creation_ticks: Some(10),
            cpu_ticks: Some(20_000_000),
        }
    }

    #[test]
    fn deduplicates_ipv4_and_ipv6_for_the_same_process_and_port() {
        let state = LocalhostManagerState::default();
        let listeners = vec![
            ListenerRow {
                address: IpAddr::V4(Ipv4Addr::UNSPECIFIED),
                port: 5173,
                pid: 42,
            },
            ListenerRow {
                address: IpAddr::V6(Ipv6Addr::LOCALHOST),
                port: 5173,
                pid: 42,
            },
        ];
        let metadata = HashMap::from([(42, node_metadata())]);

        let snapshot = state
            .refresh_from(listeners, metadata, 61_000, Instant::now())
            .expect("snapshot");

        assert_eq!(snapshot.servers.len(), 1);
        let server = &snapshot.servers[0];
        assert_eq!(server.display_address, "localhost:5173");
        assert_eq!(server.url.as_deref(), Some("http://localhost:5173"));
        assert_eq!(server.binding, ListenerBinding::Loopback);
        assert_eq!(server.classification, ServerClassification::Development);
        assert_eq!(server.kind, DevelopmentServerKind::Frontend);
        assert_eq!(server.project_name.as_deref(), Some("QoLayer"));
        assert_eq!(server.uptime_seconds, Some(60));
        assert_eq!(server.cpu_percent, None);
    }

    #[test]
    fn keeps_unknown_listeners_without_an_open_url() {
        let state = LocalhostManagerState::default();
        let listeners = vec![ListenerRow {
            address: IpAddr::V4(Ipv4Addr::LOCALHOST),
            port: 3000,
            pid: 7,
        }];
        let metadata = HashMap::from([(
            7,
            ProcessMetadata {
                process_name: Some("custom.exe".to_string()),
                ..ProcessMetadata::default()
            },
        )]);

        let snapshot = state
            .refresh_from(listeners, metadata, 1_000, Instant::now())
            .expect("snapshot");

        assert_eq!(snapshot.servers[0].classification, ServerClassification::Unknown);
        assert_eq!(snapshot.servers[0].url, None);
    }

    #[test]
    fn calculates_cpu_only_from_a_matching_previous_sample() {
        let captured_at = Instant::now();
        let previous = CpuSample {
            cpu_ticks: 10_000_000,
            captured_at,
        };
        let value = super::cpu_percent(
            Some(previous),
            Some(20_000_000),
            captured_at + Duration::from_secs(1),
            2.0,
        );
        assert_eq!(value, Some(50.0));
    }
}
