mod app_info;
mod commands;
mod import_export;
mod locale;
mod menu;
mod mount;
mod paths;
mod sshfs_args;
mod state;
mod storage;
mod system;
mod tray;
mod types;
mod updater;
mod window;

use std::sync::Mutex;
use std::time::Duration;

use tauri::{Emitter, Manager, RunEvent};
use tauri_plugin_autostart::{MacosLauncher, ManagerExt};

use state::{AppState, SharedState};

/// True for release builds (`cargo build --release` / `tauri build`).
pub fn is_packaged() -> bool {
    !cfg!(debug_assertions)
}

async fn mount_startup_servers() {
    let configs = storage::load_configs();
    for config in configs.into_iter().filter(|c| c.mount_on_startup) {
        if !mount::is_mounted(&config.local_path).await {
            if let Err(e) = mount::mount_server(&config).await {
                eprintln!("[startup] failed to mount {}: {e}", config.name);
            }
        }
    }
}

async fn unmount_all() {
    for config in storage::load_configs() {
        if mount::is_mounted(&config.local_path).await {
            let _ = mount::unmount_server(&config.local_path).await;
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            None,
        ))
        .manage(Mutex::new(AppState::default()) as SharedState)
        .invoke_handler(tauri::generate_handler![
            commands::system::system_check,
            commands::system::system_install_instructions,
            commands::system::system_ready_seen,
            commands::system::system_mark_ready_seen,
            commands::servers::servers_list,
            commands::servers::servers_save,
            commands::servers::servers_delete,
            commands::servers::servers_mount,
            commands::servers::servers_unmount,
            commands::servers::servers_status,
            commands::servers::servers_reveal,
            commands::app::shell_open_external,
            commands::dialog::dialog_select_directory,
            commands::dialog::dialog_select_file,
            commands::settings::settings_get,
            commands::settings::settings_save,
            commands::app::app_is_packaged,
            commands::app::app_quit,
            commands::app::app_export,
            commands::app::app_import,
        ])
        .setup(|app| {
            let handle = app.handle().clone();
            let settings = storage::load_settings();
            let lang = locale::resolve_language(settings.language);

            let app_menu = menu::build_app_menu(&handle, lang)?;
            app.set_menu(app_menu)?;

            app.on_menu_event(move |app_handle, event| match event.id().as_ref() {
                menu::MENU_ID_SETTINGS => {
                    window::show_or_create_window(app_handle);
                    if let Some(win) = app_handle.get_webview_window(window::MAIN_WINDOW_LABEL) {
                        let _ = win.emit("open-settings", ());
                    }
                }
                menu::MENU_ID_REFRESH => {
                    if let Some(win) = app_handle.get_webview_window(window::MAIN_WINDOW_LABEL) {
                        let _ = win.emit("refresh", ());
                    }
                }
                menu::MENU_ID_CHECK_UPDATES => {
                    let handle = app_handle.clone();
                    tauri::async_runtime::spawn(async move {
                        let lang = locale::resolve_language(storage::load_settings().language);
                        updater::check_for_updates(&handle, true, lang).await;
                    });
                }
                _ => {}
            });

            if settings.launch_at_login {
                let _ = handle.autolaunch().enable();
            }

            if settings.show_in_tray && is_packaged() {
                let tray = tray::create_tray(&handle, lang)?;
                handle.state::<SharedState>().lock().unwrap().tray = Some(tray);
            }

            if let Some(window) = app.get_webview_window(window::MAIN_WINDOW_LABEL) {
                let window_handle = window.clone();
                window.on_window_event(move |event| {
                    window::handle_window_event(&window_handle, event);
                });
            }

            tauri::async_runtime::spawn(mount_startup_servers());

            let update_handle = handle.clone();
            tauri::async_runtime::spawn(async move {
                tokio::time::sleep(Duration::from_secs(3)).await;
                loop {
                    let lang = locale::resolve_language(storage::load_settings().language);
                    updater::check_for_updates(&update_handle, false, lang).await;
                    tokio::time::sleep(Duration::from_secs(30 * 60)).await;
                }
            });

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| match event {
            RunEvent::ExitRequested { api, .. } => {
                let settings = storage::load_settings();
                if settings.unmount_on_quit {
                    api.prevent_exit();
                    tauri::async_runtime::spawn(async move {
                        unmount_all().await;
                        std::process::exit(0);
                    });
                }
            }
            #[cfg(target_os = "macos")]
            RunEvent::Reopen { .. } => {
                window::show_or_create_window(app_handle);
            }
            _ => {}
        });
}
