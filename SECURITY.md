# Security policy

## Supported versions

Only the latest **minor** version line is supported with security fixes. Older lines may receive patches at the maintainer's discretion.

## Reporting a vulnerability

Do **not** open a public GitHub issue for security problems.

Use **[Private vulnerability reporting](https://github.com/tommasomeli/sshfsgui/security/advisories/new)** on this repository (Security → **Report a vulnerability**). Include:

1. A description of the issue and the affected component (e.g. credential storage, import/export, mount handling).
2. Steps to reproduce on macOS, including app version and FUSE stack if relevant.
3. Your assessment of impact and any mitigations you've identified.

You'll receive an acknowledgement within 7 days. Coordinated disclosure timelines are agreed case-by-case but typically aim for a fix within 30 days of confirmation, followed by a GitHub Security Advisory when appropriate.

## Threat model

SSHFS GUI is a **local desktop app** that:

- Stores server configurations on disk under the user's Electron `userData` directory.
- Stores SSH passwords in the macOS Keychain via `keytar`.
- Runs `sshfs` and system mount tools with the privileges of the logged-in user.
- Imports and exports JSON configuration files chosen by the user.

Treat imported JSON and remote hosts as untrusted input. Do not import files from unknown sources. The app does not expose a network listener; outbound connections are limited to SSH (via `sshfs`) and optional GitHub release checks for updates.
