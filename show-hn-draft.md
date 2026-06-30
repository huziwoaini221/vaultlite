# Show HN 帖子

## 标题

Show HN: VaultLite – Local-first password manager, CLI/Web, syncs via GitHub

## 正文

I built a password manager for developers who prefer the terminal but also want a web UI.

**How it works:**
- CLI written in Go (single binary), Web UI in React + TypeScript (pure frontend, no backend)
- Vault encrypted with PBKDF2 (SHA-256, 600k iterations) + AES-256-GCM
- TOTP (RFC 6238) inline with passwords — unified view, no separate authenticator app
- Backup via push/pull to a GitHub repo (public or private). Encrypted vault is stored as a single `vault.enc` file
- Cross-device restore without re-entering your GitHub token: token is stored inside the encrypted vault

**Why I made it:**
I wanted something like pass(1) but with a web UI for occasional GUI use, and TOTP built in rather than needing a separate app. All existing solutions either required a server (Bitwarden) or had no cross-device story (KeePass).

**Technical trade-offs I ran into:**
- Chose PBKDF2 instead of Argon2 because Web Crypto API (browser) doesn't support Argon2. Go and the browser need compatible KDF. 600k iterations was the sweet spot for acceptable unlock time (~1s) on mobile
- GitHub as storage backend instead of building a sync server. Vault is already encrypted client-side, so GitHub sees only ciphertext. Zero-knowledge by default
- Merge vault and authenticator into one view instead of tabs. Every entry can have a TOTP secret; the 6-digit code and countdown ring show inline. One less place to click

Would love feedback on the approach, the crypto choices, or anything else.

https://github.com/huziwoaini221/vaultlite

---

# Reddit 帖子 (r/golang)

## 标题

I built a password manager CLI in Go with PBKDF2+AES-256-GCM, TOTP, and GitHub sync

## 正文

Wanted a password manager that works in the terminal but also has a web GUI. Built it in Go for the CLI, React for the web UI.

**What's interesting from a Go perspective:**

Single binary, zero runtime deps. Crypto uses `crypto/aes`, `crypto/cipher`, `golang.org/x/crypto/pbkdf2`. The encrypted vault format (JSON with base64-encoded salt/nonce/ciphertext/tag) is compatible with the Web Crypto API in the browser — both sides encrypt/decrypt the same format.

TOTP uses HMAC-SHA1 from `crypto/hmac` + `crypto/sha1`. Passes the RFC 6238 test vector.

**CLI commands:**
```
vault init          # create vault
vault add           # interactive add
vault totp <query>  # generate 2FA code
vault sync          # push to GitHub
vault pull <user>   # restore from public repo
```

GitHub is the sync backend — vault encrypts before it leaves your machine, so GitHub only ever sees ciphertext.

**One thing I'd do differently:** Go's `term.ReadPassword` doesn't work well with piped input. The interactive add/edit flow requires a real TTY. If anyone has a clean solution for this, I'd love to hear it.

https://github.com/huziwoaini221/vaultlite

---

# Reddit 帖子 (r/selfhosted)

## 标题

VaultLite – self-hosted password manager, no server needed, syncs via GitHub

## 正文

Most self-hosted password managers require running a server (Vaultwarden, Passbolt, etc.). VaultLite takes a different approach:

- **Pure frontend web app** – open index.html in a browser, it works. PBKDF2 + AES-256-GCM runs in Web Crypto API
- **CLI** – Go binary for terminal use
- **Sync** – encrypted vault pushed to any GitHub repo (public or private). No server, no database, no Docker
- **Vault file** – single `vault.enc` file, portable. Import/export supported

TOTP authenticator is built in — inline with each password entry, no separate app needed.

The vault is encrypted before it ever leaves your device. GitHub is just a dumb file host.

**Restore on a new device:** enter master password + GitHub username. If you made the repo public, no token needed at all.

https://github.com/huziwoaini221/vaultlite

---

# Product Hunt 发布帖

## Tagline

Local-first password manager for developers. CLI + Web, encrypted vault, TOTP built in.

## Description

VaultLite is a password manager designed for developers who live in the terminal but occasionally want a GUI.

**Key features:**
- CLI (Go, single binary) + Web UI (React, pure frontend)
- PBKDF2 + AES-256-GCM encryption, 600k iterations
- TOTP authenticator built into every entry — no separate app
- GitHub backup: push/pull encrypted vault to your own repo
- Cross-device restore without re-entering tokens
- Password generator + strength checker
- Import from Bitwarden CSV
- PWA support — add to home screen on mobile

**Why different:**
No server to run. No Docker. Just a binary and a GitHub repo for sync. The vault encrypts before it leaves your device — zero knowledge by default.

**First image:** Terminal showing `vault add`, `vault list`, `vault totp`
**Second image:** Web UI showing unified vault view with TOTP codes
**Third image:** GitHub repo showing the encrypted vault.enc file
