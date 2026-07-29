use tauri::{ActivationPolicy, AppHandle, Manager, WebviewWindow, WindowEvent, Wry};

pub const MAIN_WINDOW_LABEL: &str = "main";

/// On close, hide the window instead of destroying it so tray / dock / menu can
/// bring it back via `show_or_create_window` without recreating the webview.
pub fn handle_window_event(window: &WebviewWindow<Wry>, event: &WindowEvent) {
    if let WindowEvent::CloseRequested { api, .. } = event {
        api.prevent_close();
        let _ = window.hide();
        hide_dock_if_tray_active(window.app_handle());
    }
}

/// Shows the dock icon (if hidden) and brings the main window to front, focusing it.
pub fn show_or_create_window(app: &AppHandle<Wry>) {
    let _ = app.set_activation_policy(ActivationPolicy::Regular);
    if let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

/// Hides the dock icon when the window closes, but only while the tray icon keeps the app reachable.
pub fn hide_dock_if_tray_active(app: &AppHandle<Wry>) {
    let has_tray = app
        .try_state::<crate::state::SharedState>()
        .map(|state| state.lock().unwrap().tray.is_some())
        .unwrap_or(false);
    if has_tray {
        let _ = app.set_activation_policy(ActivationPolicy::Accessory);
    }
}
