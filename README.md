<p align="center">
  <img src="resources/icon.svg" width="128" height="128" alt="SSHFS GUI">
</p>

<h1 align="center">SSHFS GUI</h1>

<p align="center">
  A simple macOS app to mount remote filesystems over SSH.<br>
  No terminal needed — just point, click, and browse your remote files in Finder.
</p>

<p align="center">
  <img src="https://github.com/tommasomeli/sshfsgui/actions/workflows/ci.yml/badge.svg" alt="CI">
  <a href="https://github.com/tommasomeli/sshfsgui/releases"><img src="https://img.shields.io/github/v/release/tommasomeli/sshfsgui" alt="Release"></a>
  <img src="https://img.shields.io/badge/platform-macOS-blue" alt="macOS">
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-ISC-green.svg" alt="License"></a>
  <a href="https://buymeacoffee.com/tommasomeli"><img src="https://img.shields.io/badge/Buy%20me%20a%20coffee-FFDD00?logo=buy-me-a-coffee&logoColor=black" alt="Buy me a coffee"></a>
</p>

<p align="center">
  <img src="resources/screenshot.png" width="720" alt="SSHFS GUI main window with saved servers, favorites filter, and mount actions">
</p>

---

## Features

- **Multiple servers** — Save, edit, clone, and organize as many SSH connections as you need
- **One-click mount/unmount** — Mount remote directories to local folders with a single click
- **Favorites & filters** — Star your most-used servers, filter by favorites or mounted status
- **Auto-mount on startup** — Automatically reconnect to selected servers when the app launches
- **Secure credential storage** — Passwords are stored in the macOS Keychain, never in plain text
- **Multiple auth methods** — SSH agent, SSH key, or password authentication
- **Menu bar mode** — Optionally run as a menu bar app with quick access from the tray icon
- **Import / Export** — Transfer server configurations and settings between machines via JSON
- **Bulk actions** — Select multiple servers to clone, export, or delete at once
- **Multi-language** — English and Italian, with automatic detection or manual override
- **Native macOS look** — Dark mode, custom title bar, smooth animations
- **Reveal in Finder** — Open mounted directories directly in Finder

## Requirements

SSHFS GUI needs a **FUSE stack** on macOS: a FUSE implementation plus an `sshfs` binary. Homebrew’s core formula `sshfs` depends on Linux (`libfuse`) and **does not install on macOS** — use the references below, or install via Homebrew (pick one stack).

**References (downloads & documentation):** [FUSE-T](https://github.com/macos-fuse-t/fuse-t) · [FUSE-T SSHFS](https://github.com/macos-fuse-t/sshfs) · [macFUSE](https://macfuse.io/) · [Homebrew](https://brew.sh)

### Install with Homebrew

#### Option A — FUSE-T + SSHFS (no kernel extension)

Uses NFS locally instead of a kext; usually the simplest path on recent macOS.

```bash
brew tap macos-fuse-t/homebrew-cask
brew install --cask fuse-t fuse-t-sshfs
```

On some macOS versions with FUSE-T, Finder may need extra `sshfs` options (e.g. `-o nonamedattr`); add them in the app’s SSHFS extra options if you hit mount or copy issues.

#### Option B — macFUSE + SSHFS (kernel extension)

Use this if you need the classic macFUSE stack or already rely on it.

1. Install [macFUSE](https://macfuse.io/) (allow the system extension when macOS prompts you).

   ```bash
   brew install --cask macfuse
   ```

2. Install **SSHFS for macFUSE** (separate from Homebrew core `sshfs`):

   ```bash
   brew install gromgit/fuse/sshfs-mac
   ```

This tap targets macFUSE; upstream SSHFS is older than on Linux — see the formula caveats. Alternatively, install SSHFS from the [macFUSE / SSHFS project](https://github.com/macfuse/sshfs) if you prefer their official packages.

The app checks for these dependencies and shows guidance if `sshfs` or FUSE is missing.

## Installation

Download the latest `.dmg` from [Releases](https://github.com/tommasomeli/sshfsgui/releases), open it, and drag **SSHFS GUI** to your Applications folder.

## Usage

### Adding a server

1. Click **+ New** in the top bar
2. Fill in the connection details:
   - **Name** — A friendly label (e.g. "Production DB")
   - **Host** — Hostname or IP address
   - **Port** — SSH port (default: 22)
   - **User** — SSH username
   - **Remote path** — The directory to mount (e.g. `/var/www`)
   - **Local mount point** — Where to mount it locally (e.g. `~/mnt/prod`)
3. Choose an authentication method:
   - **SSH agent** — Uses your running `ssh-agent`
   - **SSH key** — Specify a private key file
   - **Password** — Stored securely in macOS Keychain
4. Click **Create server**

### Mounting

Click **Mount** on any server card. The green dot indicates an active mount. Click **Unmount** to disconnect.

Use the folder icon to reveal the mounted directory in Finder.

### Bulk operations

Use the checkboxes on each server card to select multiple servers. The bottom bar shows available actions: **Clone**, **Export**, and **Delete**.

### Settings

Open settings via the gear icon or `⌘,`:

- **Language** — System, English, or Italian
- **Launch at login** — Start the app when you log in
- **Unmount all on quit** — Disconnect everything when closing
- **Show in menu bar** — Run as a tray app (packaged builds only)
- **Import / Export** — Transfer servers and settings as JSON

## Development

Use any Node package manager you like. Example with [npm](https://docs.npmjs.com/cli/):

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for macOS
npm run build:mac

# Run tests
npm test

# Typecheck
npm run lint
```

### Tech stack

- [Electron](https://www.electronjs.org/) + [electron-vite](https://electron-vite.org/)
- [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- [Zustand](https://zustand.docs.pmnd.rs/) for state management
- [i18next](https://www.i18next.com/) for internationalization
- [keytar](https://github.com/nicedoc/keytar) for Keychain integration

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Bug reports and feature requests use the GitHub issue templates.

## License

[ISC](LICENSE) — Tommaso Meli
