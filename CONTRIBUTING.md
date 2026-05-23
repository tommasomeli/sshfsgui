# Contributing to SSHFS GUI

Thank you for considering a contribution. PRs against `main` are the standard workflow.

## Where to start

- **Found a bug?** Open a [Bug Report](https://github.com/tommasomeli/sshfsgui/issues/new?template=bug_report.yml) with macOS version, FUSE stack, and steps to reproduce.
- **Have a feature idea?** Open a [Feature Request](https://github.com/tommasomeli/sshfsgui/issues/new?template=feature_request.yml).
- **Want to fix something?** Check the [Issues](https://github.com/tommasomeli/sshfsgui/issues) tab for open items.

## Development setup

Requirements: **Node.js 20+**, **pnpm 10+**, **macOS** for full mount/signing workflows.

```bash
git clone https://github.com/tommasomeli/sshfsgui.git
cd sshfsgui
pnpm install
pnpm test
pnpm run dev
```

## Making changes

- **Create a branch:** `git checkout -b fix/my-bug` or `feature/my-feature`.
- **Write code:** follow the conventions below. Run `pnpm run lint` and `pnpm test` before pushing.
- **Commit:** clear, concise messages. One logical change per commit when possible.

## Conventions

- **Source language**: TypeScript for main, preload, renderer, and shared modules.
- **Typecheck**: `pnpm run lint` (dual `tsc --noEmit` for node and web tsconfigs).
- **Tests**: `pnpm test` (Vitest). Prefer table-driven specs for pure logic in `src/shared/` and exported helpers under `src/main/`.
- **No emojis** in source, comments, or PR descriptions.

## What to include in a PR

1. **Tests** for user-visible or security-sensitive behaviour (import/export, path handling, mount argument building, etc.).
2. **CHANGELOG** entry under `## [Unreleased]` using `### Added` / `### Changed` / `### Fixed`.
3. **README** updates only when install steps, features, or usage change.

## Submitting a Pull Request

1. Fork the repo and push your branch to your fork.
2. Open a Pull Request against the `main` branch of [tommasomeli/sshfsgui](https://github.com/tommasomeli/sshfsgui).
3. Fill in the PR template: summary, linked issue (if any), and the checklist.

CI runs lint, tests (Node 20/22), build, and coverage on every push and PR.

## Reporting bugs

Use the [Bug Report template](https://github.com/tommasomeli/sshfsgui/issues/new?template=bug_report.yml) and include:

- Steps to reproduce and expected vs actual behaviour.
- App version, macOS version, and FUSE stack (FUSE-T or macFUSE).
- Relevant `sshfs` or app error output.

For security issues, see [SECURITY.md](./SECURITY.md) — do not open a public issue.

## Releases

Maintainer-only:

1. Configure GitHub Actions secrets for Apple code signing and notarization (`CERTIFICATE_P12_BASE64`, `CERTIFICATE_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`).
2. Bump `version` in `package.json` and add a dated section in `CHANGELOG.md`.
3. Push to `main`. The [`release.yml`](./.github/workflows/release.yml) workflow compares the version with the latest GitHub release and, when new, builds signed macOS DMGs and publishes a release.

Pushes that do not bump `version` are skipped automatically.
