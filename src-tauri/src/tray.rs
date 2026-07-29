use tauri::image::Image;
use tauri::tray::{MouseButton, MouseButtonState, TrayIcon, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Wry};

use crate::app_info::app_info;
use crate::menu::{build_tray_menu, MENU_ID_TRAY_SHOW};
use crate::types::Language;
use crate::window::show_or_create_window;

const SIZE: usize = 18;

fn set_px(buf: &mut [u8], x: i32, y: i32, alpha: u8) {
    if x < 0 || y < 0 || x as usize >= SIZE || y as usize >= SIZE {
        return;
    }
    let i = (y as usize * SIZE + x as usize) * 4;
    buf[i] = 0;
    buf[i + 1] = 0;
    buf[i + 2] = 0;
    buf[i + 3] = alpha;
}

fn h_line(buf: &mut [u8], x1: i32, x2: i32, y: i32, alpha: u8) {
    for x in x1..=x2 {
        set_px(buf, x, y, alpha);
    }
}

fn v_line(buf: &mut [u8], x: i32, y1: i32, y2: i32, alpha: u8) {
    for y in y1..=y2 {
        set_px(buf, x, y, alpha);
    }
}

fn rect(buf: &mut [u8], x1: i32, y1: i32, x2: i32, y2: i32, alpha: u8) {
    h_line(buf, x1, x2, y1, alpha);
    h_line(buf, x1, x2, y2, alpha);
    v_line(buf, x1, y1, y2, alpha);
    v_line(buf, x2, y1, y2, alpha);
}

/// Draws a minimalist "server rack" glyph as a macOS template tray image.
fn build_tray_icon_image() -> Image<'static> {
    let mut buf = vec![0u8; SIZE * SIZE * 4];

    // Server rack: three stacked units, each with a status-light pair.
    for (top, light_alpha) in [(2, 255u8), (7, 255), (12, 255)] {
        rect(&mut buf, 3, top, 14, top + 4, 255);
        let light_y = top + 2;
        set_px(&mut buf, 5, light_y, light_alpha);
        set_px(&mut buf, 6, light_y, light_alpha);
        set_px(&mut buf, 12, light_y, 128);
        set_px(&mut buf, 13, light_y, 128);
    }

    Image::new_owned(buf, SIZE as u32, SIZE as u32)
}

pub fn create_tray(app: &AppHandle, lang: Language) -> tauri::Result<TrayIcon<Wry>> {
    let menu = build_tray_menu(app, lang)?;

    TrayIconBuilder::with_id("main")
        .icon(build_tray_icon_image())
        .icon_as_template(true)
        .tooltip(&app_info().name)
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| {
            if event.id().as_ref() == MENU_ID_TRAY_SHOW {
                show_or_create_window(app);
            }
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                show_or_create_window(tray.app_handle());
            }
        })
        .build(app)
}
