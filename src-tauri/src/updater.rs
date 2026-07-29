use serde::Deserialize;
use tauri::{AppHandle, Emitter};
use tauri_plugin_dialog::{DialogExt, MessageDialogKind};

use crate::app_info::app_info;
use crate::locale::t;
use crate::types::{Language, UpdateInfo};

#[derive(Debug, Deserialize)]
struct GithubRelease {
    tag_name: String,
    html_url: String,
}

fn is_newer(remote: &str, local: &str) -> bool {
    let parse = |v: &str| -> Vec<u64> {
        v.split('.')
            .map(|p| p.parse::<u64>().unwrap_or(0))
            .collect()
    };
    let r = parse(remote);
    let l = parse(local);
    for i in 0..3 {
        let rv = r.get(i).copied().unwrap_or(0);
        let lv = l.get(i).copied().unwrap_or(0);
        if rv > lv {
            return true;
        }
        if rv < lv {
            return false;
        }
    }
    false
}

pub async fn check_for_updates(app: &AppHandle, manual: bool, lang: Language) {
    let info = app_info();
    let repo_path = info
        .github
        .trim_start_matches("https://github.com/")
        .trim_end_matches('/');
    let api_url = format!("https://api.github.com/repos/{repo_path}/releases/latest");

    let result = reqwest::Client::new()
        .get(&api_url)
        .header("Accept", "application/vnd.github.v3+json")
        .header("User-Agent", info.slug.as_str())
        .send()
        .await;

    let response = match result {
        Ok(r) if r.status().is_success() => r,
        _ => {
            let _ = app.emit("update-available", Option::<UpdateInfo>::None);
            if manual {
                show_message(app, &t("update.checkFailed", lang));
            }
            return;
        }
    };

    let release = match response.json::<GithubRelease>().await {
        Ok(r) => r,
        Err(_) => {
            let _ = app.emit("update-available", Option::<UpdateInfo>::None);
            if manual {
                show_message(app, &t("update.checkFailed", lang));
            }
            return;
        }
    };

    let remote_version = release.tag_name.trim_start_matches('v');
    let local_version = app.package_info().version.to_string();

    if is_newer(remote_version, &local_version) {
        let _ = app.emit(
            "update-available",
            Some(UpdateInfo {
                version: remote_version.to_string(),
                url: release.html_url,
            }),
        );
    } else {
        let _ = app.emit("update-available", Option::<UpdateInfo>::None);
        if manual {
            show_message(app, &t("update.upToDate", lang));
        }
    }
}

fn show_message(app: &AppHandle, message: &str) {
    app.dialog()
        .message(message)
        .kind(MessageDialogKind::Info)
        .show(|_| {});
}
