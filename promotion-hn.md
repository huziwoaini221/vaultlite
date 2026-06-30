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

**Screenshots / Demo:**

![demo](https://raw.githubusercontent.com/huziwoaini221/vaultlite/main/demo.gif)

Would love feedback on the approach, the crypto choices, or anything else.

https://github.com/huziwoaini221/vaultlite
