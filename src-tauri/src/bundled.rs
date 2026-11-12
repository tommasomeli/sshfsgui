//! SSHFS bundled inside `SSHFS GUI.app`, built against FUSE-T.
//!
//! Layout inside the app bundle:
//! - `Contents/MacOS/sshfs`: sshfs linked to `@rpath/libfuse3.4.dylib`
//! - `Contents/MacOS/go-nfsv4`: FUSE-T NFS server
//! - `Contents/Frameworks/libfuse3.4.dylib`: FUSE-T libfuse3
//!
//! libfuse-t starts the NFS server from `FUSE_NFSSRV_PATH`, so every sshfs
//! process spawned by the app gets that variable pointing at the bundled server.

use std::path::{Path, PathBuf};
use std::sync::OnceLock;

/// Environment variable read by libfuse-t to locate the NFS server binary.
pub const NFS_SERVER_ENV: &str = "FUSE_NFSSRV_PATH";

#[derive(Debug, Clone)]
pub struct BundledSshfs {
    pub sshfs: PathBuf,
    pub nfs_server: PathBuf,
}

fn find_in(dir: &Path) -> Option<BundledSshfs> {
    let sshfs = dir.join("sshfs");
    let nfs_server = dir.join("go-nfsv4");
    (sshfs.is_file() && nfs_server.is_file()).then_some(BundledSshfs { sshfs, nfs_server })
}

/// Bundled sshfs next to the app executable (`Contents/MacOS`), when present.
pub fn bundled_sshfs() -> Option<BundledSshfs> {
    static CACHE: OnceLock<Option<BundledSshfs>> = OnceLock::new();
    CACHE
        .get_or_init(|| {
            let exe = std::env::current_exe().ok()?;
            find_in(exe.parent()?)
        })
        .clone()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn finds_both_binaries() {
        let dir = std::env::temp_dir().join(format!("sshfsgui-bundled-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        assert!(find_in(&dir).is_none());
        std::fs::write(dir.join("sshfs"), b"").unwrap();
        assert!(find_in(&dir).is_none());
        std::fs::write(dir.join("go-nfsv4"), b"").unwrap();
        let found = find_in(&dir).unwrap();
        assert_eq!(found.sshfs, dir.join("sshfs"));
        assert_eq!(found.nfs_server, dir.join("go-nfsv4"));
        std::fs::remove_dir_all(&dir).unwrap();
    }
}
