use std::fs;
use std::path::PathBuf;

use keyring::Entry;

use crate::app_info::app_info;
use crate::types::{AppSettings, ServerConfig};

/// `~/Library/Application Support/sshfsgui`.
pub fn data_dir() -> PathBuf {
    dirs::home_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("Library")
        .join("Application Support")
        .join(app_info().data_dir_name())
}

fn configs_file() -> PathBuf {
    data_dir().join("servers.json")
}

fn settings_file() -> PathBuf {
    data_dir().join("settings.json")
}

pub fn load_configs() -> Vec<ServerConfig> {
    let file = configs_file();
    let Ok(raw) = fs::read_to_string(&file) else {
        return Vec::new();
    };
    match serde_json::from_str::<Vec<ServerConfig>>(&raw) {
        Ok(configs) => configs,
        Err(err) => {
            // Tolerate partial or unknown fields by parsing entries individually.
            eprintln!("Failed to parse servers.json as array ({err}), trying per item");
            let Ok(values) = serde_json::from_str::<Vec<serde_json::Value>>(&raw) else {
                eprintln!("servers.json is not a JSON array");
                return Vec::new();
            };
            values
                .into_iter()
                .filter_map(|value| match serde_json::from_value::<ServerConfig>(value) {
                    Ok(config) => Some(config),
                    Err(item_err) => {
                        eprintln!("Skipping invalid server entry: {item_err}");
                        None
                    }
                })
                .collect()
        }
    }
}

pub fn save_configs(configs: &[ServerConfig]) -> Result<(), String> {
    let file = configs_file();
    if let Some(dir) = file.parent() {
        fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string_pretty(configs).map_err(|e| e.to_string())?;
    fs::write(&file, json).map_err(|e| e.to_string())
}

pub fn load_settings() -> AppSettings {
    let file = settings_file();
    let Ok(raw) = fs::read_to_string(&file) else {
        return AppSettings::default();
    };
    serde_json::from_str(&raw).unwrap_or_default()
}

pub fn save_settings(settings: &AppSettings) -> Result<(), String> {
    let file = settings_file();
    if let Some(dir) = file.parent() {
        fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string_pretty(settings).map_err(|e| e.to_string())?;
    fs::write(&file, json).map_err(|e| e.to_string())
}

pub fn get_password(server_id: &str) -> Result<Option<String>, String> {
    let entry = Entry::new(app_info().keychain_service(), server_id).map_err(|e| e.to_string())?;
    match entry.get_password() {
        Ok(pw) => Ok(Some(pw)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

pub fn set_password(server_id: &str, password: &str) -> Result<(), String> {
    let entry = Entry::new(app_info().keychain_service(), server_id).map_err(|e| e.to_string())?;
    entry.set_password(password).map_err(|e| e.to_string())
}

pub fn delete_password(server_id: &str) -> Result<(), String> {
    let entry = Entry::new(app_info().keychain_service(), server_id).map_err(|e| e.to_string())?;
    match entry.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}
