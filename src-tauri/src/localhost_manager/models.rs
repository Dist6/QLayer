use serde::Serialize;
use std::net::IpAddr;

#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum ServerClassification {
    Development,
    Unknown,
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum DevelopmentServerKind {
    Frontend,
    Backend,
    FullStack,
    #[default]
    Unknown,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum ProjectNameSource {
    Automatic,
    Manual,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum ListenerBinding {
    Loopback,
    AllInterfaces,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalhostServer {
    pub id: String,
    pub display_address: String,
    pub url: Option<String>,
    pub port: u16,
    pub is_running: bool,
    pub process_name: Option<String>,
    pub memory_bytes: Option<u64>,
    pub started_at_ms: Option<u64>,
    pub uptime_seconds: Option<u64>,
    pub cpu_percent: Option<f32>,
    pub project_id: Option<String>,
    pub project_name: Option<String>,
    pub project_name_source: Option<ProjectNameSource>,
    pub classification: ServerClassification,
    pub kind: DevelopmentServerKind,
    pub binding: ListenerBinding,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub(crate) struct ListenerRow {
    pub address: IpAddr,
    pub port: u16,
    pub pid: u32,
}

#[derive(Clone, Debug, Default, Eq, PartialEq)]
pub(crate) struct ProcessMetadata {
    pub process_name: Option<String>,
    pub executable_path: Option<String>,
    pub command_line: Option<String>,
    pub memory_bytes: Option<u64>,
    pub started_at_ms: Option<u64>,
    pub creation_ticks: Option<u64>,
    pub cpu_ticks: Option<u64>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub(crate) struct TrustedServer {
    pub pid: u32,
    pub port: u16,
    pub creation_ticks: Option<u64>,
    pub classification: ServerClassification,
    pub project_id: Option<String>,
}

pub(crate) fn binding_for(address: IpAddr) -> Option<ListenerBinding> {
    if address.is_loopback() {
        Some(ListenerBinding::Loopback)
    } else if address.is_unspecified() {
        Some(ListenerBinding::AllInterfaces)
    } else {
        None
    }
}

pub(crate) fn localhost_address(port: u16) -> String {
    format!("localhost:{port}")
}

pub(crate) fn localhost_url(port: u16) -> String {
    format!("http://localhost:{port}")
}

#[cfg(test)]
mod tests {
    use super::{binding_for, localhost_address, localhost_url, ListenerBinding};
    use std::net::{IpAddr, Ipv4Addr, Ipv6Addr};

    #[test]
    fn recognizes_loopback_and_wildcard_bindings() {
        assert_eq!(
            binding_for(IpAddr::V4(Ipv4Addr::LOCALHOST)),
            Some(ListenerBinding::Loopback)
        );
        assert_eq!(
            binding_for(IpAddr::V6(Ipv6Addr::LOCALHOST)),
            Some(ListenerBinding::Loopback)
        );
        assert_eq!(
            binding_for(IpAddr::V4(Ipv4Addr::UNSPECIFIED)),
            Some(ListenerBinding::AllInterfaces)
        );
        assert_eq!(
            binding_for(IpAddr::V6(Ipv6Addr::UNSPECIFIED)),
            Some(ListenerBinding::AllInterfaces)
        );
        assert_eq!(binding_for(IpAddr::V4(Ipv4Addr::new(192, 168, 1, 10))), None);
    }

    #[test]
    fn builds_normalized_localhost_labels() {
        assert_eq!(localhost_address(5173), "localhost:5173");
        assert_eq!(localhost_url(5173), "http://localhost:5173");
    }
}
