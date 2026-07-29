use tauri::State;

use crate::state::SharedState;
use crate::system;
use crate::types::{InstallInstructions, SystemStatus};

#[tauri::command]
pub async fn system_check() -> SystemStatus {
    system::check_system_requirements().await
}

#[tauri::command]
pub fn system_install_instructions() -> InstallInstructions {
    system::get_install_instructions()
}

#[tauri::command]
pub fn system_ready_seen(state: State<'_, SharedState>) -> bool {
    state.lock().unwrap().system_ready_seen
}

#[tauri::command]
pub fn system_mark_ready_seen(state: State<'_, SharedState>) {
    state.lock().unwrap().system_ready_seen = true;
}
