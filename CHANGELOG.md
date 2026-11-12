# Changelog

## [Unreleased]

## 1.2.0

- sshfs and FUSE-T built into the app: nothing else to install, and it coexists with any sshfs, macFUSE or FUSE-T already installed
- Mac-native interface: translucent sidebar with filters, system light/dark theme and accent color
- Server list with inline actions and a resizable detail panel
- Multiple selection with checkboxes or by dragging, with bulk clone, export and delete
- Native context menus and keyboard shortcuts (⌘N, ⌘F, ⌘A, ⌘⌫, Enter, arrow keys)

## 1.1.0

- Migrated the app shell from Electron to Tauri 2

## 1.0.1

- UI fixes and refinements
- Smaller build via improved compression

## 1.0.0

Initial release.

- Manage multiple SSH server configurations
- One-click mount/unmount via sshfs
- SSH agent, SSH key, and password authentication
- Passwords stored in macOS Keychain
- Favorites and filters (all, favorites, mounted)
- Auto-mount on app startup
- Menu bar (tray) mode
- Import/export servers and settings as JSON
- Bulk actions (clone, export, delete)
- Multi-language support (English, Italian)
- Launch at login, unmount all on quit
- Reveal mounted directories in Finder
