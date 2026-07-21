use std::collections::HashSet;
use std::path::PathBuf;

pub(crate) fn ranked_roots(candidates: &[PathBuf]) -> Vec<PathBuf> {
    let mut output = Vec::new();
    let mut seen = HashSet::new();
    for candidate in candidates {
        for ancestor in candidate.ancestors().take(6) {
            if ancestor.parent().is_none() {
                break;
            }
            let key = ancestor.to_string_lossy().to_ascii_lowercase();
            if seen.insert(key) {
                output.push(ancestor.to_path_buf())
            }
        }
    }
    output
}

#[cfg(test)]
mod tests {
    use super::ranked_roots;
    use std::path::PathBuf;

    #[test]
    fn bounds_and_orders_ancestors() {
        let start = PathBuf::from(r"C:\Users\dev\Projects\App\node_modules\vite\bin");
        let roots = ranked_roots(std::slice::from_ref(&start));
        assert_eq!(roots[0], start);
        assert!(roots.len() <= 6);
        assert!(!roots.contains(&PathBuf::from(r"C:\")));
    }
}
