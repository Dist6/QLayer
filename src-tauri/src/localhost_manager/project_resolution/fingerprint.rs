use std::path::Path;

pub(crate) fn project_fingerprint(path: &Path) -> String {
    fingerprint(path.to_string_lossy().replace('/', "\\").to_ascii_lowercase().as_bytes())
}

pub(crate) fn fallback_fingerprint(value: &str) -> String {
    fingerprint(value.to_ascii_lowercase().as_bytes())
}

fn fingerprint(bytes: &[u8]) -> String {
    let mut hash = 0xcbf2_9ce4_8422_2325_u64;
    for byte in bytes {
        hash ^= u64::from(*byte);
        hash = hash.wrapping_mul(0x0000_0100_0000_01b3);
    }
    format!("project-{hash:016x}")
}

#[cfg(test)]
mod tests {
    use super::project_fingerprint;
    use std::path::Path;

    #[test]
    fn creates_stable_case_insensitive_opaque_ids() {
        assert_eq!(project_fingerprint(Path::new(r"C:\Projects\App")), project_fingerprint(Path::new(r"c:\projects\app")));
        assert!(project_fingerprint(Path::new(r"C:\Projects\App")).starts_with("project-"));
    }
}
