use std::process::Stdio;

use tokio::io::AsyncWriteExt;
use tokio::process::Command;
use tokio::sync::OnceCell;

use crate::bundled::{bundled_sshfs, NFS_SERVER_ENV};
use crate::paths::expand_home;
use crate::sshfs_args::build_sshfs_args;
use crate::storage;
use crate::types::{AuthMethod, ServerConfig};

/// The sshfs shipped inside the app. Development builds run from `target/` without it and use
/// the `sshfs` on the developer's login-shell PATH.
async fn get_sshfs_path() -> Result<String, String> {
    if let Some(bundled) = bundled_sshfs() {
        return Ok(bundled.sshfs.to_string_lossy().into_owned());
    }
    if cfg!(debug_assertions) {
        return development_sshfs_path().await;
    }
    Err("sshfs is missing from the app. Reinstall SSHFS GUI.".to_string())
}

async fn development_sshfs_path() -> Result<String, String> {
    static SSHFS_PATH: OnceCell<String> = OnceCell::const_new();
    SSHFS_PATH
        .get_or_try_init(|| async {
            let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string());
            let output = Command::new(&shell)
                .arg("-lc")
                .arg("command -v sshfs")
                .output()
                .await
                .map_err(|e| e.to_string())?;
            let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if output.status.success() && !path.is_empty() {
                Ok(path)
            } else {
                Err("Development builds use the sshfs on your PATH, and none was found.".to_string())
            }
        })
        .await
        .cloned()
}

pub async fn is_mounted(local_path: &str) -> bool {
    let resolved = expand_home(local_path);
    let Ok(output) = Command::new("/sbin/mount").output().await else {
        return false;
    };
    let stdout = String::from_utf8_lossy(&output.stdout);
    let needle = format!(" on {resolved} (");
    stdout.lines().any(|line| line.contains(&needle))
}

pub async fn mount_server(config: &ServerConfig) -> Result<(), String> {
    let local_path = expand_home(&config.local_path);
    let mut for_sshfs = config.clone();
    for_sshfs.local_path = local_path.clone();
    if let Some(identity) = &config.identity_file {
        for_sshfs.identity_file = Some(expand_home(identity));
    }

    if !std::path::Path::new(&local_path).exists() {
        std::fs::create_dir_all(&local_path)
            .map_err(|_| format!("Failed to create mount point: {local_path}"))?;
    }

    if is_mounted(&config.local_path).await {
        return Err(format!("Mount point {local_path} is already in use."));
    }

    let sshfs_path = get_sshfs_path().await?;
    let password = if config.auth_method == AuthMethod::Password {
        storage::get_password(&config.id)?
    } else {
        None
    };
    let args = build_sshfs_args(&for_sshfs, password.is_some());

    let mut command = Command::new(&sshfs_path);
    if let Some(bundled) = bundled_sshfs() {
        command.env(NFS_SERVER_ENV, &bundled.nfs_server);
    }
    let mut child = command
        .args(&args)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| e.to_string())?;

    if let Some(pw) = &password {
        if let Some(mut stdin) = child.stdin.take() {
            stdin
                .write_all(format!("{pw}\n").as_bytes())
                .await
                .map_err(|e| e.to_string())?;
            let _ = stdin.shutdown().await;
        }
    } else {
        drop(child.stdin.take());
    }

    let output = child.wait_with_output().await.map_err(|e| e.to_string())?;
    if output.status.success() {
        Ok(())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        if stderr.is_empty() {
            Err(format!(
                "sshfs exited with code {}",
                output.status.code().unwrap_or(-1)
            ))
        } else {
            Err(stderr)
        }
    }
}

pub async fn unmount_server(local_path: &str) -> Result<(), String> {
    let resolved = expand_home(local_path);

    let status = Command::new("/sbin/umount")
        .arg(&resolved)
        .status()
        .await
        .map_err(|e| e.to_string())?;
    if status.success() {
        return Ok(());
    }

    let output = Command::new("/usr/sbin/diskutil")
        .args(["unmount", "force", &resolved])
        .output()
        .await
        .map_err(|e| e.to_string())?;
    if output.status.success() {
        Ok(())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        Err(if stderr.is_empty() {
            format!("Failed to unmount {resolved}")
        } else {
            stderr
        })
    }
}
