use serde::Deserialize;
use std::sync::OnceLock;

use crate::types::{AuthMethod, ServerConfig};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SshfsDefaults {
    default_options: Vec<String>,
}

fn defaults() -> &'static SshfsDefaults {
    static DEFAULTS: OnceLock<SshfsDefaults> = OnceLock::new();
    DEFAULTS.get_or_init(|| {
        serde_json::from_str(include_str!("../../src/shared/sshfs-defaults.json"))
            .expect("invalid src/shared/sshfs-defaults.json")
    })
}

pub fn build_sshfs_args(config: &ServerConfig, has_password: bool) -> Vec<String> {
    let mut args = vec![
        format!("{}@{}:{}", config.user, config.host, config.remote_path),
        config.local_path.clone(),
        "-p".to_string(),
        config.port.to_string(),
    ];

    for option in &defaults().default_options {
        args.push("-o".to_string());
        args.push(option.clone());
    }
    args.push("-o".to_string());
    args.push(format!("volname={}", config.name));

    if config.auth_method == AuthMethod::Key {
        if let Some(identity) = &config.identity_file {
            args.push("-o".to_string());
            args.push(format!("IdentityFile={}", identity));
        }
    }

    if config.auth_method == AuthMethod::Password && has_password {
        args.push("-o".to_string());
        args.push("password_stdin".to_string());
    }

    if let Some(extra) = &config.extra_options {
        for part in extra.split_whitespace() {
            args.push("-o".to_string());
            args.push(part.to_string());
        }
    }

    args
}
