use serde::Deserialize;
use std::sync::OnceLock;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppInfo {
    pub name: String,
    pub slug: String,
    pub app_id: String,
    pub developer: String,
    pub github: String,
    /// Present in shared JSON / synced into package and Tauri metadata; unused at runtime.
    #[allow(dead_code)]
    pub description: String,
    pub export_format_version: u32,
}

impl AppInfo {
    pub fn keychain_service(&self) -> &str {
        &self.app_id
    }

    pub fn data_dir_name(&self) -> &str {
        &self.slug
    }

    pub fn export_format_key(&self) -> &str {
        &self.slug
    }

    pub fn export_default_filename(&self) -> String {
        format!("{}-export.json", self.slug)
    }
}

/// Single source of truth: `src/shared/app-info.json` (shared with the frontend).
pub fn app_info() -> &'static AppInfo {
    static INFO: OnceLock<AppInfo> = OnceLock::new();
    INFO.get_or_init(|| {
        serde_json::from_str(include_str!("../../src/shared/app-info.json"))
            .expect("invalid src/shared/app-info.json")
    })
}
