use std::collections::HashMap;

use tauri_plugin_opener::reveal_item_in_dir;
use uuid::Uuid;

use crate::types::{AuthMethod, ServerConfig, ServerInput, ServerWithStatus};
use crate::{mount, paths, storage};

#[tauri::command]
pub async fn servers_list() -> Result<Vec<ServerWithStatus>, String> {
    let configs = storage::load_configs();
    let mut result = Vec::with_capacity(configs.len());
    for config in configs {
        let mounted = mount::is_mounted(&config.local_path).await;
        result.push(ServerWithStatus { config, mounted });
    }
    Ok(result)
}

#[tauri::command]
pub async fn servers_save(input: ServerInput) -> Result<ServerWithStatus, String> {
    let mut configs = storage::load_configs();
    let now = now_millis();
    let existing_idx = input
        .id
        .as_ref()
        .and_then(|id| configs.iter().position(|c| &c.id == id));

    let local_path = paths::collapse_home(&input.local_path);
    let identity_file = input.identity_file.as_deref().map(paths::collapse_home);

    let base = match existing_idx {
        Some(idx) => ServerConfig {
            name: input.name.clone(),
            host: input.host.clone(),
            port: input.port,
            user: input.user.clone(),
            remote_path: input.remote_path.clone(),
            local_path,
            auth_method: input.auth_method,
            identity_file,
            extra_options: input.extra_options.clone(),
            is_favorite: input.is_favorite,
            mount_on_startup: input.mount_on_startup,
            updated_at: now,
            ..configs[idx].clone()
        },
        None => ServerConfig {
            id: input.id.clone().unwrap_or_else(|| Uuid::new_v4().to_string()),
            name: input.name.clone(),
            host: input.host.clone(),
            port: input.port,
            user: input.user.clone(),
            remote_path: input.remote_path.clone(),
            local_path,
            auth_method: input.auth_method,
            identity_file,
            extra_options: input.extra_options.clone(),
            is_favorite: input.is_favorite,
            mount_on_startup: input.mount_on_startup,
            created_at: now,
            updated_at: now,
        },
    };

    match existing_idx {
        Some(idx) => configs[idx] = base.clone(),
        None => configs.push(base.clone()),
    }
    storage::save_configs(&configs)?;

    if base.auth_method == AuthMethod::Password {
        if let Some(pw) = input.password.as_deref().filter(|p| !p.is_empty()) {
            storage::set_password(&base.id, pw)?;
        }
    } else {
        let _ = storage::delete_password(&base.id);
    }

    let mounted = mount::is_mounted(&base.local_path).await;
    Ok(ServerWithStatus {
        config: base,
        mounted,
    })
}

#[tauri::command]
pub async fn servers_delete(id: String) -> Result<(), String> {
    let mut configs = storage::load_configs();
    if let Some(target) = configs.iter().find(|c| c.id == id).cloned() {
        if mount::is_mounted(&target.local_path).await {
            let _ = mount::unmount_server(&target.local_path).await;
        }
    }
    configs.retain(|c| c.id != id);
    storage::save_configs(&configs)?;
    let _ = storage::delete_password(&id);
    Ok(())
}

#[tauri::command]
pub async fn servers_mount(id: String) -> Result<(), String> {
    let configs = storage::load_configs();
    let config = configs
        .into_iter()
        .find(|c| c.id == id)
        .ok_or_else(|| "Server not found".to_string())?;
    mount::mount_server(&config).await
}

#[tauri::command]
pub async fn servers_unmount(id: String) -> Result<(), String> {
    let configs = storage::load_configs();
    let config = configs
        .into_iter()
        .find(|c| c.id == id)
        .ok_or_else(|| "Server not found".to_string())?;
    mount::unmount_server(&config.local_path).await
}

#[tauri::command]
pub async fn servers_status() -> HashMap<String, bool> {
    let configs = storage::load_configs();
    let mut result = HashMap::with_capacity(configs.len());
    for config in configs {
        let mounted = mount::is_mounted(&config.local_path).await;
        result.insert(config.id, mounted);
    }
    result
}

#[tauri::command(rename_all = "camelCase")]
pub async fn servers_reveal(local_path: String) -> Result<(), String> {
    let resolved = paths::expand_home(&local_path);
    reveal_item_in_dir(resolved).map_err(|e| e.to_string())
}

fn now_millis() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}
