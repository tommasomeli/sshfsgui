use std::path::Path;

use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;

fn apply_default_path<R: tauri::Runtime>(
    mut builder: tauri_plugin_dialog::FileDialogBuilder<R>,
    default_path: &Option<String>,
) -> tauri_plugin_dialog::FileDialogBuilder<R> {
    if let Some(path) = default_path {
        let p = Path::new(path);
        if p.is_dir() {
            builder = builder.set_directory(p);
        } else if let Some(parent) = p.parent().filter(|parent| !parent.as_os_str().is_empty()) {
            builder = builder.set_directory(parent);
        }
    }
    builder
}

#[tauri::command(rename_all = "camelCase")]
pub async fn dialog_select_directory(app: AppHandle, default_path: Option<String>) -> Option<String> {
    let builder = apply_default_path(app.dialog().file(), &default_path);
    builder.blocking_pick_folder().map(|fp| fp.to_string())
}

#[tauri::command(rename_all = "camelCase")]
pub async fn dialog_select_file(app: AppHandle, default_path: Option<String>) -> Option<String> {
    let builder = apply_default_path(app.dialog().file(), &default_path);
    builder.blocking_pick_file().map(|fp| fp.to_string())
}
