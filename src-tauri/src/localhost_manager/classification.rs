use super::models::{ProcessMetadata, ServerClassification};

const DEVELOPMENT_RUNTIMES: &[&str] = &[
    "bun.exe",
    "deno.exe",
    "dotnet.exe",
    "java.exe",
    "javaw.exe",
    "node.exe",
    "php.exe",
    "python.exe",
    "pythonw.exe",
    "ruby.exe",
];

const SYSTEM_PROCESSES: &[&str] = &[
    "lsass.exe",
    "services.exe",
    "spoolsv.exe",
    "svchost.exe",
    "system",
    "wininit.exe",
];

pub(crate) fn classify(metadata: &ProcessMetadata, _port: u16) -> ServerClassification {
    let Some(process_name) = metadata.process_name.as_deref() else {
        return ServerClassification::Unknown;
    };
    let normalized_name = process_name.to_ascii_lowercase();

    if SYSTEM_PROCESSES.contains(&normalized_name.as_str()) || is_windows_system_path(metadata) {
        return ServerClassification::Unknown;
    }

    if DEVELOPMENT_RUNTIMES.contains(&normalized_name.as_str()) {
        ServerClassification::Development
    } else {
        ServerClassification::Unknown
    }
}

fn is_windows_system_path(metadata: &ProcessMetadata) -> bool {
    metadata
        .executable_path
        .as_deref()
        .map(|path| {
            let normalized = path.replace('/', "\\").to_ascii_lowercase();
            normalized.contains("\\windows\\system32\\")
                || normalized.contains("\\windows\\syswow64\\")
        })
        .unwrap_or(false)
}

#[cfg(test)]
mod tests {
    use super::classify;
    use crate::localhost_manager::models::{ProcessMetadata, ServerClassification};

    fn metadata(name: &str, path: &str) -> ProcessMetadata {
        ProcessMetadata {
            process_name: Some(name.to_string()),
            executable_path: Some(path.to_string()),
            ..ProcessMetadata::default()
        }
    }

    #[test]
    fn recognized_user_space_runtimes_are_development_servers() {
        assert_eq!(
            classify(&metadata("node.exe", r"C:\Program Files\nodejs\node.exe"), 5173),
            ServerClassification::Development
        );
        assert_eq!(
            classify(&metadata("python.exe", r"C:\Python\python.exe"), 8000),
            ServerClassification::Development
        );
    }

    #[test]
    fn common_ports_do_not_establish_development_status_alone() {
        assert_eq!(
            classify(&metadata("custom-service.exe", r"C:\Apps\custom-service.exe"), 3000),
            ServerClassification::Unknown
        );
    }

    #[test]
    fn system_processes_are_never_development_servers() {
        assert_eq!(
            classify(&metadata("svchost.exe", r"C:\Windows\System32\svchost.exe"), 8080),
            ServerClassification::Unknown
        );
        assert_eq!(
            classify(&metadata("node.exe", r"C:\Windows\System32\node.exe"), 5173),
            ServerClassification::Unknown
        );
    }

}
