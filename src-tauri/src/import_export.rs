use std::collections::HashSet;

use crate::app_info::app_info;
use crate::types::{AppSettings, ExportPayload, Language, ServerConfig};

pub fn build_export_payload(
    servers: Option<Vec<ServerConfig>>,
    settings: Option<AppSettings>,
) -> ExportPayload {
    let info = app_info();
    ExportPayload {
        format: info.export_format_key().to_string(),
        version: info.export_format_version,
        servers,
        settings,
    }
}

pub fn assert_valid_import_payload(value: &serde_json::Value) -> Result<(), String> {
    let format = value.get("_format").and_then(|v| v.as_str());
    if format != Some(app_info().export_format_key()) {
        return Err("Invalid file format".to_string());
    }
    Ok(())
}

pub fn merge_imported_servers(
    existing: Vec<ServerConfig>,
    incoming: &[serde_json::Value],
    normalize_path: impl Fn(&str) -> String,
) -> (Vec<ServerConfig>, usize) {
    let existing_ids: HashSet<String> = existing.iter().map(|c| c.id.clone()).collect();
    let mut configs = existing;
    let mut added = 0usize;

    for item in incoming {
        let Ok(mut server) = serde_json::from_value::<ServerConfig>(item.clone()) else {
            continue;
        };
        if existing_ids.contains(&server.id) {
            continue;
        }
        server.local_path = normalize_path(&server.local_path);
        server.identity_file = server.identity_file.as_deref().map(&normalize_path);
        configs.push(server);
        added += 1;
    }

    (configs, added)
}

pub fn merge_imported_settings(current: AppSettings, incoming: &serde_json::Value) -> AppSettings {
    let mut merged = current;
    let Some(obj) = incoming.as_object() else {
        return merged;
    };
    if let Some(v) = obj.get("launchAtLogin").and_then(|v| v.as_bool()) {
        merged.launch_at_login = v;
    }
    if let Some(v) = obj.get("unmountOnQuit").and_then(|v| v.as_bool()) {
        merged.unmount_on_quit = v;
    }
    if let Some(v) = obj.get("showInTray").and_then(|v| v.as_bool()) {
        merged.show_in_tray = v;
    }
    if let Some(v) = obj.get("language").and_then(|v| v.as_str()) {
        merged.language = match v {
            "en" => Language::En,
            "it" => Language::It,
            _ => Language::Auto,
        };
    }
    merged
}
