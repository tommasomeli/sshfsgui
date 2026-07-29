use tauri::menu::{
    AboutMetadata, AboutMetadataBuilder, Menu, MenuBuilder, MenuItemBuilder, SubmenuBuilder,
    WINDOW_SUBMENU_ID,
};
use tauri::{AppHandle, Wry};

use crate::app_info::app_info;
use crate::locale::{t, t_named};
use crate::types::Language;

pub const MENU_ID_SETTINGS: &str = "settings";
pub const MENU_ID_REFRESH: &str = "refresh";
pub const MENU_ID_CHECK_UPDATES: &str = "check_updates";
pub const MENU_ID_TRAY_SHOW: &str = "tray_show";

fn about_metadata() -> AboutMetadata<'static> {
    let info = app_info();
    AboutMetadataBuilder::new()
        .name(Some(info.name.clone()))
        .version(Some(env!("CARGO_PKG_VERSION").to_string()))
        .authors(Some(vec![info.developer.clone()]))
        .website(Some(info.github.clone()))
        .build()
}

/// Builds and installs the macOS application menu bar, translated for the given language.
pub fn build_app_menu(app: &AppHandle, lang: Language) -> tauri::Result<Menu<Wry>> {
    let name = app_info().name.as_str();
    let settings_item = MenuItemBuilder::with_id(MENU_ID_SETTINGS, t("menu.settings", lang))
        .accelerator("Cmd+,")
        .build(app)?;
    let refresh_item = MenuItemBuilder::with_id(MENU_ID_REFRESH, t("menu.refresh", lang))
        .accelerator("Cmd+R")
        .build(app)?;
    let check_updates_item =
        MenuItemBuilder::with_id(MENU_ID_CHECK_UPDATES, t("menu.checkUpdates", lang)).build(app)?;

    let app_menu = SubmenuBuilder::new(app, name)
        .about_with_text(t_named("menu.about", name, lang), Some(about_metadata()))
        .separator()
        .item(&settings_item)
        .item(&refresh_item)
        .item(&check_updates_item)
        .separator()
        .hide_with_text(t_named("menu.hide", name, lang))
        .hide_others_with_text(t("menu.hideOthers", lang))
        .show_all_with_text(t("menu.showAll", lang))
        .separator()
        .quit_with_text(t_named("menu.quit", name, lang))
        .build()?;

    let file_menu = SubmenuBuilder::new(app, t("menu.file", lang))
        .close_window_with_text(t("menu.close", lang))
        .build()?;

    let edit_menu = SubmenuBuilder::new(app, t("menu.edit", lang))
        .undo_with_text(t("menu.undo", lang))
        .redo_with_text(t("menu.redo", lang))
        .separator()
        .cut_with_text(t("menu.cut", lang))
        .copy_with_text(t("menu.copy", lang))
        .paste_with_text(t("menu.paste", lang))
        .separator()
        .select_all_with_text(t("menu.selectAll", lang))
        .build()?;

    let view_menu = SubmenuBuilder::new(app, t("menu.view", lang))
        .fullscreen_with_text(t("menu.toggleFullscreen", lang))
        .build()?;

    let window_menu = SubmenuBuilder::with_id(app, WINDOW_SUBMENU_ID, t("menu.window", lang))
        .minimize_with_text(t("menu.minimize", lang))
        .maximize_with_text(t("menu.zoom", lang))
        .separator()
        .bring_all_to_front_with_text(t("menu.front", lang))
        .build()?;

    MenuBuilder::new(app)
        .items(&[
            &app_menu,
            &file_menu,
            &edit_menu,
            &view_menu,
            &window_menu,
        ])
        .build()
}

/// Builds the tray icon's right-click context menu: Show + Quit.
pub fn build_tray_menu(app: &AppHandle, lang: Language) -> tauri::Result<Menu<Wry>> {
    MenuBuilder::new(app)
        .text(MENU_ID_TRAY_SHOW, t("menu.show", lang))
        .separator()
        .quit_with_text(t_named("menu.quit", &app_info().name, lang))
        .build()
}
