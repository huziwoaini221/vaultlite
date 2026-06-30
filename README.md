# VaultLite

A developer-focused, local-first password manager with encrypted vault (PBKDF2 + AES-256-GCM), TOTP authenticator, and optional GitHub backup.

- **CLI** — Go single binary, no runtime deps
- **Web** — Pure frontend (React + TypeScript), runs fully in browser
- **Encrypted** — PBKDF2 (SHA-256, 600k iterations) + AES-256-GCM
- **TOTP** — RFC 6238 compliant, inline with passwords in unified view
- **Backup** — Push/pull encrypted vault to private GitHub repo

## Quick Start

### Web

Open in browser — no install needed.

Build locally:
```bash
cd web
npm install
npm run build
# Serve web/dist/ with any static file server
```

Deploy to Cloudflare Pages:
1. Push repo to GitHub
2. On CF Pages dashboard, connect repo
3. Build command: `cd web && npm ci && npm run build`
4. Build output: `web/dist`

### CLI

Download the latest binary from [Releases](https://github.com/USER/vaultlite/releases) for your platform:

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

# Restore from GitHub
vault pull
```

## Features

- **Password management** — Add, edit, delete, search entries (title, username, URL, tags)
- **TOTP authenticator** — 6-digit code with countdown ring, inline per entry
- **Password generator** — Configurable length, character sets, exclude ambiguous
- **Strength checker** — Score, entropy, level feedback
- **GitHub backup** — Automatic push on changes, debounced 30s, private repo
- **Import/Export** — `.enc` vault files, Bitwarden CSV

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
cd vaultlite
make web    # web/dist/ — deploy to CF Pages
make cli    # dist/vault — single binary

# All targets
make build

# CLI only
make cli

# Web only
make web

# Cross-compile CLI releases
make cli-release
```

## License

MIT
