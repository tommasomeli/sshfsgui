use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AuthMethod {
    Password,
    Key,
    Agent,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ServerConfig {
    pub id: String,
    pub name: String,
    pub host: String,
    pub port: u16,
    pub user: String,
    pub remote_path: String,
    pub local_path: String,
    pub auth_method: AuthMethod,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub identity_file: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub extra_options: Option<String>,
    #[serde(default)]
    pub is_favorite: bool,
    #[serde(default)]
    pub mount_on_startup: bool,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize)]
pub struct ServerWithStatus {
    #[serde(flatten)]
    pub config: ServerConfig,
    pub mounted: bool,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ServerInput {
    #[serde(default)]
    pub id: Option<String>,
    pub name: String,
    pub host: String,
    pub port: u16,
    pub user: String,
    pub remote_path: String,
    pub local_path: String,
    pub auth_method: AuthMethod,
    #[serde(default)]
    pub identity_file: Option<String>,
    #[serde(default)]
    pub extra_options: Option<String>,
    #[serde(default)]
    pub is_favorite: bool,
    #[serde(default)]
    pub mount_on_startup: bool,
    #[serde(default)]
    pub password: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Language {
    Auto,
    En,
    It,
}

impl Default for Language {
    fn default() -> Self {
        Language::Auto
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    #[serde(default)]
    pub launch_at_login: bool,
    #[serde(default)]
    pub unmount_on_quit: bool,
    #[serde(default)]
    pub show_in_tray: bool,
    #[serde(default)]
    pub language: Language,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            launch_at_login: false,
            unmount_on_quit: false,
            show_in_tray: false,
            language: Language::Auto,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportPayload {
    #[serde(rename = "_format")]
    pub format: String,
    #[serde(rename = "_version")]
    pub version: u32,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub servers: Option<Vec<ServerConfig>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub settings: Option<AppSettings>,
}

#[derive(Debug, Clone, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ImportResult {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub servers: Option<usize>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub settings: Option<bool>,
}

#[derive(Debug, Clone, Serialize)]
pub struct UpdateInfo {
    pub version: String,
    pub url: String,
}
