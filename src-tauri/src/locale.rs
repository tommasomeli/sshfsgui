use serde_json::Value;
use std::sync::OnceLock;

use crate::types::Language;

fn locale_tag_prefers_italian(tag: &str) -> bool {
    tag.to_lowercase().starts_with("it")
}

/// Best-effort system locale tag. Prefer OS APIs (`sys-locale`, AppleLanguages on
/// macOS) over `LANG`/`LC_ALL`, which GUI apps often inherit as `C`/`C.UTF-8`.
fn system_locale_tag() -> String {
    if let Some(tag) = sys_locale::get_locale() {
        if !tag.is_empty() {
            return tag;
        }
    }
    std::env::var("LC_ALL")
        .or_else(|_| std::env::var("LANG"))
        .unwrap_or_default()
}

/// Resolves the effective menu language: `auto` follows the system locale.
pub fn resolve_language(pref: Language) -> Language {
    match pref {
        Language::Auto => {
            if locale_tag_prefers_italian(&system_locale_tag()) {
                Language::It
            } else {
                Language::En
            }
        }
        other => other,
    }
}

fn catalog(lang: Language) -> &'static Value {
    static EN: OnceLock<Value> = OnceLock::new();
    static IT: OnceLock<Value> = OnceLock::new();
    match lang {
        Language::It => IT.get_or_init(|| {
            serde_json::from_str(include_str!("../../src/locales/it.json"))
                .expect("invalid src/locales/it.json")
        }),
        Language::En | Language::Auto => EN.get_or_init(|| {
            serde_json::from_str(include_str!("../../src/locales/en.json"))
                .expect("invalid src/locales/en.json")
        }),
    }
}

fn lookup<'a>(root: &'a Value, dotted: &str) -> Option<&'a str> {
    let mut cur = root;
    for part in dotted.split('.') {
        cur = cur.get(part)?;
    }
    cur.as_str()
}

/// Looks up a UI string from `src/locales/{en,it}.json` (same files as the frontend).
pub fn t(key: &str, lang: Language) -> String {
    let resolved = match lang {
        Language::Auto => resolve_language(Language::Auto),
        other => other,
    };
    if let Some(value) = lookup(catalog(resolved), key) {
        return value.to_string();
    }
    if resolved != Language::En {
        if let Some(value) = lookup(catalog(Language::En), key) {
            return value.to_string();
        }
    }
    key.to_string()
}

/// Interpolates `{{name}}` in locale strings such as "About {{name}}".
pub fn t_named(key: &str, name: &str, lang: Language) -> String {
    t(key, lang).replace("{{name}}", name)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn italian_tags() {
        assert!(locale_tag_prefers_italian("it"));
        assert!(locale_tag_prefers_italian("it-IT"));
        assert!(locale_tag_prefers_italian("IT_IT.UTF-8"));
        assert!(!locale_tag_prefers_italian("en-US"));
        assert!(!locale_tag_prefers_italian("C.UTF-8"));
    }
}
