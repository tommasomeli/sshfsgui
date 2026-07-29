use std::fs;

use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_opener::OpenerExt;

use crate::app_info::app_info;
use crate::import_export::{
    assert_valid_import_payload, build_export_payload, merge_imported_servers,
    merge_imported_settings,
};
use crate::types::ImportResult;
use crate::{paths, storage};

#[tauri::command]
pub fn shell_open_external(app: AppHandle, url: String) -> Result<(), String> {
    app.opener().open_url(url, None::<&str>).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn app_is_packaged() -> bool {
    crate::is_packaged()
}

#[tauri::command]
pub fn app_quit(app: AppHandle) {
    app.exit(0);
}

#[tauri::command(rename_all = "camelCase")]
pub async fn app_export(
    app: AppHandle,
    servers: Option<bool>,
    server_ids: Option<Vec<String>>,
    settings: Option<bool>,
) -> Result<bool, String> {
    let servers_payload = if servers.unwrap_or(false) {
        let mut configs = storage::load_configs();
        if let Some(ids) = &server_ids {
            if !ids.is_empty() {
                configs.retain(|c| ids.contains(&c.id));
            }
        }
        Some(configs)
    } else {
        None
    };
    let settings_payload = if settings.unwrap_or(false) {
        Some(storage::load_settings())
    } else {
        None
    };

    let payload = build_export_payload(servers_payload, settings_payload);
    let json = serde_json::to_string_pretty(&payload).map_err(|e| e.to_string())?;

    let file_path = app
        .dialog()
        .file()
        .set_file_name(app_info().export_default_filename())
        .add_filter("JSON", &["json"])
        .blocking_save_file();

    let Some(file_path) = file_path else {
        return Ok(false);
    };
    let path = file_path.into_path().map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
pub async fn app_import(app: AppHandle) -> Result<Option<ImportResult>, String> {
    let file_path = app
        .dialog()
        .file()
        .add_filter("JSON", &["json"])
        .blocking_pick_file();

    let Some(file_path) = file_path else {
        return Ok(None);
    };
    let path = file_path.into_path().map_err(|e| e.to_string())?;
    let raw = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let data: serde_json::Value = serde_json::from_str(&raw).map_err(|e| e.to_string())?;
    assert_valid_import_payload(&data)?;

    let mut result = ImportResult::default();

    if let Some(servers) = data.get("servers").and_then(|v| v.as_array()) {
        let (configs, added) =
            merge_imported_servers(storage::load_configs(), servers, paths::collapse_home);
        storage::save_configs(&configs)?;
        result.servers = Some(added);
    }

    if let Some(settings_value) = data.get("settings").filter(|v| v.is_object()) {
        let merged = merge_imported_settings(storage::load_settings(), settings_value);
        storage::save_settings(&merged)?;
        result.settings = Some(true);
    }

    Ok(Some(result))
}
