use std::sync::OnceLock;

use tokio::process::Command;

use crate::types::{FuseStatus, InstallInstructions, SshfsStatus, SystemStatus};

/// Resolves a command to an absolute path using the user's login shell environment
/// (PATH from `.zprofile` / `.zshrc`), since GUI apps don't inherit a login shell PATH.
async fn find_command(cmd: &str) -> Option<String> {
    let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string());
    let output = Command::new(&shell)
        .arg("-lc")
        .arg(format!("command -v {cmd}"))
        .output()
        .await
        .ok()?;
    if !output.status.success() {
        return None;
    }
    let p = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if p.is_empty() {
        None
    } else {
        Some(p)
    }
}

async fn get_version(full_path: &str) -> Option<String> {
    let output = Command::new(full_path).arg("--version").output().await.ok()?;
    let combined = if !output.stdout.is_empty() {
        output.stdout
    } else {
        output.stderr
    };
    let text = String::from_utf8_lossy(&combined);
    text.lines().next().map(|s| s.trim().to_string())
}

/// True if a BOM/receipt exists for an installed .pkg matching any of the given id prefixes.
async fn pkgutil_matches(prefixes: &[&str]) -> bool {
    let Ok(output) = Command::new("/usr/sbin/pkgutil").arg("--pkgs").output().await else {
        return false;
    };
    let stdout = String::from_utf8_lossy(&output.stdout);
    stdout
        .lines()
        .any(|line| prefixes.iter().any(|p| line.trim().starts_with(p)))
}

/// macFUSE: helper on PATH (when the installer links it) or installer receipt.
async fn is_macfuse_installed() -> bool {
    if find_command("mount_macfuse").await.is_some() {
        return true;
    }
    pkgutil_matches(&["io.macfuse.", "com.github.osxfuse."]).await
}

/// FUSE-T: NFS helper on PATH (uncommon) or org.fuse-t.* receipts from the .pkg.
async fn is_fuse_t_installed() -> bool {
    if find_command("go-nfsv4").await.is_some() {
        return true;
    }
    pkgutil_matches(&["org.fuse-t."]).await
}

pub async fn check_system_requirements() -> SystemStatus {
    let sshfs_path = find_command("sshfs").await;
    let sshfs_version = match &sshfs_path {
        Some(p) => get_version(p).await,
        None => None,
    };

    SystemStatus {
        sshfs: SshfsStatus {
            installed: sshfs_path.is_some(),
            version: sshfs_version,
        },
        fuse_t: FuseStatus {
            installed: is_fuse_t_installed().await,
        },
        macfuse: FuseStatus {
            installed: is_macfuse_installed().await,
        },
    }
}

pub fn get_install_instructions() -> InstallInstructions {
    static INSTRUCTIONS: OnceLock<InstallInstructions> = OnceLock::new();
    INSTRUCTIONS
        .get_or_init(|| {
            serde_json::from_str(include_str!("../../src/shared/system-instructions.json"))
                .expect("invalid src/shared/system-instructions.json")
        })
        .clone()
}
