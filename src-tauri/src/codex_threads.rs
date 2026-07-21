const THREAD_LINK_PREFIX: &str = "codex://threads/";

pub fn parse_thread_id(input: &str) -> Result<String, &'static str> {
    let normalized = input.trim();
    let candidate = normalized
        .strip_prefix(THREAD_LINK_PREFIX)
        .unwrap_or(normalized);
    let groups = [8_usize, 4, 4, 4, 12];
    let parts: Vec<&str> = candidate.split('-').collect();

    if parts.len() != groups.len()
        || parts.iter().zip(groups).any(|(part, length)| {
            part.len() != length || !part.bytes().all(|byte| byte.is_ascii_hexdigit())
        })
    {
        return Err("A valid Codex thread ID is required.");
    }

    Ok(candidate.to_ascii_lowercase())
}

pub fn build_thread_link(thread_id: &str) -> Result<String, &'static str> {
    if thread_id.trim().starts_with(THREAD_LINK_PREFIX) {
        return Err("A raw Codex thread ID is required.");
    }

    parse_thread_id(thread_id).map(|parsed| format!("{THREAD_LINK_PREFIX}{parsed}"))
}

pub fn is_allowed_codex_url(url: &str) -> bool {
    if matches!(url, "codex://" | "codex://settings" | "codex://threads/new") {
        return true;
    }

    let Ok(thread_id) = parse_thread_id(url) else {
        return false;
    };
    build_thread_link(&thread_id).is_ok_and(|link| link == url)
}

#[cfg(test)]
mod tests {
    use super::{build_thread_link, is_allowed_codex_url, parse_thread_id};

    const THREAD_ID: &str = "019f72d8-d02e-75d1-9969-d6c5a647c95e";

    #[test]
    fn parses_ids_and_canonical_links() {
        assert_eq!(parse_thread_id(THREAD_ID), Ok(THREAD_ID.to_string()));
        assert_eq!(
            parse_thread_id(&format!("codex://threads/{THREAD_ID}")),
            Ok(THREAD_ID.to_string())
        );
        assert_eq!(
            build_thread_link(THREAD_ID),
            Ok(format!("codex://threads/{THREAD_ID}"))
        );
    }

    #[test]
    fn rejects_noncanonical_thread_inputs() {
        for input in [
            "codex://threads/new",
            "codex://threads/019f72d8-d02e-75d1-9969-d6c5a647c95e/extra",
            "codex://threads/019f72d8-d02e-75d1-9969-d6c5a647c95e?x=1",
            "019f72d8-d02e-75d1-9969-not-hexadecimal",
        ] {
            assert!(parse_thread_id(input).is_err());
        }
    }

    #[test]
    fn allowlists_only_supported_codex_urls() {
        assert!(is_allowed_codex_url("codex://"));
        assert!(is_allowed_codex_url("codex://settings"));
        assert!(is_allowed_codex_url("codex://threads/new"));
        assert!(is_allowed_codex_url(&format!(
            "codex://threads/{THREAD_ID}"
        )));
        assert!(!is_allowed_codex_url("codex://auth"));
        assert!(!is_allowed_codex_url("https://example.com"));
    }
}
