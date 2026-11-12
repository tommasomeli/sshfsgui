use std::sync::Mutex;

use tauri::tray::TrayIcon;
use tauri::Wry;

/// Shared app-wide runtime state.
#[derive(Default)]
pub struct AppState {
    pub tray: Option<TrayIcon<Wry>>,
}

pub type SharedState = Mutex<AppState>;
