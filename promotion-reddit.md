# Reddit 帖子

## 标题 (r/golang)

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

**Cross-post (r/selfhosted):**

Most self-hosted password managers require running a server (Vaultwarden, Passbolt, etc.). VaultLite takes a different approach:
- Pure frontend web app — open index.html in a browser, it works
- CLI — Go binary for terminal use
- Sync — encrypted vault pushed to any GitHub repo. No server, no Docker
- Restore on a new device: enter master password + GitHub username. If the repo is public, no token needed

https://github.com/huziwoaini221/vaultlite
