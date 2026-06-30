# VaultLite <a href="./README.zh.md"><img src="https://img.shields.io/badge/README-中文-blue" alt="中文"></a>

A developer-focused, local-first password manager with encrypted vault (PBKDF2 + AES-256-GCM), TOTP authenticator, and optional GitHub backup.

- **CLI** — Go single binary, no runtime deps
- **Web** — Pure frontend (React + TypeScript), runs fully in browser, PWA-ready
- **Encrypted** — PBKDF2 (SHA-256, 600k iterations) + AES-256-GCM
- **TOTP** — RFC 6238 compliant, inline with passwords in unified view
- **Backup** — Push/pull encrypted vault to GitHub, public or private repo

## Quick Start

### Web

Try it on Cloudflare Pages, or build locally. PWA supported — add to home screen on Android/iOS:

```bash
cd web
npm install
npm run build
# Serve web/dist/ with any static file server
```

Deploy to Cloudflare Pages:
1. Push repo to GitHub
2. On CF Pages dashboard, connect repo
3. Build command: `cd web && npm install && npm run build`
4. Build output: `web/dist`

### CLI

Download the latest binary from [Releases](https://github.com/huziwoaini221/vaultlite/releases) for your platform:

```bash
# Linux / macOS
chmod +x vault-*
./vault-linux-amd64 init
```

Or build from source:
```bash
make cli
./dist/vault init
```

### First use

```bash
# Initialise vault (sets master password)
vault init

# Add a password entry
vault add

# List entries
vault list

# Sync to GitHub
vault config set github-token <your_pat>
vault sync

# Restore from public repo (no token needed)
vault pull huziwoaini221
```

### Cross-device restore

**First device** — configure GitHub backup once:
1. Enter token in GitHub Settings → **Make repo public**
2. Sync — token is stored inside the encrypted vault

**New device** — restore without token:
1. Web: On Welcome page, choose **Restore from GitHub**, enter master password + GitHub username
2. CLI: `vault pull <your-github-username>`, enter master password

Token from vault is extracted and saved automatically. Subsequent Syncs work without re-entering the token.

## Features

### Password management
- Add, edit, delete, search entries by title, username, URL, or tags
- Unified view — passwords and TOTP codes inline per entry
- Fields: title, username, password (always masked), URL, note, tags, TOTP secret

### TOTP authenticator
- RFC 6238 compliant (HMAC-SHA1, 30-second time step)
- 6-digit codes with visual countdown ring
- Base32 secret input, displayed inline per entry

### Password generator
- Configurable length (1–128 characters)
- Character set toggles: uppercase, lowercase, digits, symbols
- Exclude ambiguous characters (0, O, I, l, 1, etc.)
- One-click copy

### Strength checker
- Real-time scoring: score, entropy (bits), level label
- Visual feedback while typing

### GitHub backup
- Push vault to public or private repo
- Automatic on vault changes (debounced 30s)
- Manual Sync button for immediate backup
- Restore from latest commit or auto-fallback to previous commit
- Token stored inside encrypted vault for cross-device restore

### Import / Export
- Export vault as `.enc` file (encrypted, portable)
- Import from `.enc` file
- Import from Bitwarden CSV

## Security

- Master password never stored — derived key only, in-memory per session
- PBKDF2 with 600k iterations
- AES-256-GCM authenticated encryption
- All crypto in Web Crypto API (browser) or Go stdlib
- GitHub stores only ciphertext — service has zero knowledge

## Build

```bash
# Install dependencies
git clone <repo-url>

# Web only (output: web/dist/)
make web

# CLI only (output: dist/vault)
make cli

# All targets
make build

# Cross-compile CLI for all platforms
make cli-release
```

## License

MIT

## Feedback

- [Open an issue](https://github.com/huziwoaini221/vaultlite/issues)
- Email: sailnowhealth@outlook.com
- Telegram: [t.me/+oHG72-4yjqM0MTBl](https://t.me/+oHG72-4yjqM0MTBl)
