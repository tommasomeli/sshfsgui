use std::path::PathBuf;

pub fn expand_home(p: &str) -> String {
    let Some(home) = dirs::home_dir() else {
        return p.to_string();
    };
    if p == "~" {
        return home.to_string_lossy().to_string();
    }
    if let Some(rest) = p.strip_prefix("~/") {
        return home.join(rest).to_string_lossy().to_string();
    }
    p.to_string()
}

/// Normalizes `.` and `..` segments without touching the filesystem (mirrors Node's `path.resolve`).
fn normalize(path: &std::path::Path) -> PathBuf {
    let mut result = PathBuf::new();
    for component in path.components() {
        match component {
            std::path::Component::ParentDir => {
                result.pop();
            }
            std::path::Component::CurDir => {}
            other => result.push(other.as_os_str()),
        }
    }
    result
}

/// Stores paths under the user home as `~/...`.
pub fn collapse_home(p: &str) -> String {
    let expanded = expand_home(p.trim());
    let expanded_path = std::path::Path::new(&expanded);
    let absolute = if expanded_path.is_absolute() {
        expanded_path.to_path_buf()
    } else {
        std::env::current_dir()
            .unwrap_or_default()
            .join(expanded_path)
    };
    let resolved = normalize(&absolute);

    let Some(home) = dirs::home_dir() else {
        return resolved.to_string_lossy().to_string();
    };
    if resolved == home {
        return "~".to_string();
    }
    if let Ok(rest) = resolved.strip_prefix(&home) {
        return format!("~/{}", rest.to_string_lossy());
    }
    resolved.to_string_lossy().to_string()
}
