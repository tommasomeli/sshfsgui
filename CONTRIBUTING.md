# Contributing to SSHFS GUI

Thank you for considering a contribution. Pull requests against `main` are the standard workflow.

## Where to start

- **Bug:** open a [Bug Report](https://github.com/tommasomeli/sshfsgui/issues/new?template=bug_report.yml) with macOS version, FUSE stack, and steps to reproduce.
- **Feature idea:** open a [Feature Request](https://github.com/tommasomeli/sshfsgui/issues/new?template=feature_request.yml).
- **Code change:** check open [Issues](https://github.com/tommasomeli/sshfsgui/issues) first.

## Development setup

Requirements: **Node.js 20+**, **pnpm 10+**, **Rust** (stable), **macOS** for mount and signing workflows.

```bash
git clone https://github.com/tommasomeli/sshfsgui.git
cd sshfsgui
pnpm install
pnpm test
pnpm run dev
```

## Making changes

1. Create a branch: `git checkout -b fix/my-bug` or `feature/my-feature`.
2. Follow the conventions below. Run `pnpm run lint` and `pnpm test` before pushing.
3. Prefer clear commit messages and one logical change per commit when possible.

## Conventions

- **Languages:** TypeScript for the frontend and shared modules, Rust for the app shell in `src-tauri/`.
- **Typecheck:** `pnpm run lint` (`tsc --noEmit` for the node and web tsconfigs).
- **Tests:** `pnpm test` (Vitest). Prefer table-driven specs for pure logic in `src/shared/`.
- **No emojis** in source, comments, or PR descriptions.

## What to include in a PR

1. **Tests** for user-visible or security-sensitive behaviour (import/export, path handling, mount argument building, and similar).
2. **CHANGELOG** entry under `## [Unreleased]` using `### Added` / `### Changed` / `### Fixed`.
3. **README** updates only when install steps, features, or usage change.

## Submitting a pull request

1. Fork the repository and push your branch.
2. Open a pull request against `main` on [tommasomeli/sshfsgui](https://github.com/tommasomeli/sshfsgui).
3. Fill in the PR template: summary, linked issue (if any), and checklist.

CI runs lint, tests (Node 20/22), frontend build, `cargo check` on `src-tauri/`, and coverage on every push and pull request.

## Reporting bugs

Use the [Bug Report template](https://github.com/tommasomeli/sshfsgui/issues/new?template=bug_report.yml) and include:

- Steps to reproduce, plus expected vs actual behaviour
- App version, macOS version, and FUSE stack (FUSE-T or macFUSE)
- Relevant `sshfs` or app error output

For security issues, see [SECURITY.md](./SECURITY.md). Do not open a public issue.

## Releases

Maintainer-only:

1. Configure GitHub Actions secrets for Apple code signing and notarization (`CERTIFICATE_P12_BASE64`, `CERTIFICATE_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`).
2. Bump `version` in `package.json` only. For product identity / install docs / sshfs defaults, edit files under `src/shared/` (and locales under `src/locales/`). Run `pnpm run sync:meta`, then add a dated section in `CHANGELOG.md`.
3. Push to `main`. The [`release.yml`](./.github/workflows/release.yml) workflow compares the version with the latest GitHub release and, when new, runs `tauri build`, produces signed macOS DMGs, and publishes the release.

Pushes that do not bump `version` are skipped automatically.
