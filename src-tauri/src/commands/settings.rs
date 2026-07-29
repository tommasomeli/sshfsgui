use tauri::{ActivationPolicy, AppHandle, State};
use tauri_plugin_autostart::ManagerExt;

use crate::locale::resolve_language;
use crate::menu::build_app_menu;
use crate::state::SharedState;
use crate::storage;
use crate::tray::create_tray;
use crate::types::AppSettings;

#[tauri::command]
pub fn settings_get() -> AppSettings {
    storage::load_settings()
}

#[tauri::command]
pub fn settings_save(
    app: AppHandle,
    state: State<'_, SharedState>,
    settings: AppSettings,
) -> Result<(), String> {
    storage::save_settings(&settings)?;

    if settings.launch_at_login {
        let _ = app.autolaunch().enable();
    } else {
        let _ = app.autolaunch().disable();
    }

    let lang = resolve_language(settings.language);
    let should_show_tray = settings.show_in_tray && crate::is_packaged();

    let mut guard = state.lock().unwrap();
    if should_show_tray {
        if let Some(tray) = &guard.tray {
            let menu = crate::menu::build_tray_menu(&app, lang).map_err(|e| e.to_string())?;
            let _ = tray.set_menu(Some(menu));
        } else {
            let tray = create_tray(&app, lang).map_err(|e| e.to_string())?;
            guard.tray = Some(tray);
        }
    } else if guard.tray.take().is_some() {
        let _ = app.set_activation_policy(ActivationPolicy::Regular);
    }
    drop(guard);

    if let Ok(menu) = build_app_menu(&app, lang) {
        let _ = app.set_menu(menu);
    }

    Ok(())
}
