# 掘金文章

## 标题

用 Go 写了个密码管理器 CLI：PBKDF2 + AES-256-GCM + TOTP，GitHub 当后端

## 正文

### 前言

密码管理器选了一圈，没有完全满意的：

- 1Password / Bitwarden → 要付费或自建服务器
- KeePass → 跨设备同步太折腾
- pass(1) → 纯终端，没有 GUI，团队协作要装插件
- 浏览器自带 → 只能在一个浏览器里用

我想要的是：**终端 + Web 都能用，密码和 TOTP 放一起，加密后再上传，跨设备恢复够简单。**

于是写了 VaultLite，Go CLI + React Web UI，GitHub 做同步后端。

项目地址：https://github.com/huziwoaini221/vaultlite

---

### 架构概览

```
┌─────────────┐     ┌──────────────┐     ┌────────────┐
│  Go CLI     │     │  React Web   │     │  GitHub    │
│  (单文件)    │◄───►│  (纯前端)     │◄───►│  vault.enc │
│  PBKDF2+    │     │  PBKDF2+     │     │  (密文)     │
│  AES-256-GCM│     │  AES-256-GCM │     │            │
└─────────────┘     └──────────────┘     └────────────┘
```

**关键设计：加密格式两端兼容**

Go 和浏览器都加密/解密同一种 JSON 格式：

```json
{
  "salt": "base64...",
  "nonce": "base64...",
  "ciphertext": "base64...",
  "tag": "base64..."
}
```

加密流程：Master Password → PBKDF2(SHA-256, 600k) → 32 字节 key → AES-256-GCM 加密。

解密流程同理，密码不对 → GCM 认证失败 → 直接报错，不会返回乱码。

---

### Go 实现亮点

**1. 兼容 Web Crypto API 的加密模块**

Go 用 `golang.org/x/crypto/pbkdf2` 派生密钥，`crypto/aes` + `crypto/cipher` 做 AES-256-GCM。

坑点：Go 的 `cipher.AEAD` Nonce 是 12 字节，Overhead 是 16 字节（GCM tag）。而 Web Crypto API 默认 nonce 也是 12 字节，tag 拼在 ciphertext 后面。两边格式对齐就没问题。

**2. TOTP 实现**

标准 HMAC-SHA1 + 30 秒时间步长，base32 解码：

```go
func generateTotpCode(secret string) (string, int, error) {
    decoded, _ := base32.StdEncoding.DecodeString(secret)
    counter := time.Now().Unix() / 30
    remaining := int(30 - (time.Now().Unix() % 30))

    counterBytes := make([]byte, 8)
    binary.BigEndian.PutUint64(counterBytes, uint64(counter))

    mac := hmac.New(sha1.New, decoded)
    mac.Write(counterBytes)
    hs := mac.Sum(nil)

    offset := hs[19] & 0xf
    code := int(hs[offset]&0x7f)<<24 |
        int(hs[offset+1]&0xff)<<16 |
        int(hs[offset+2]&0xff)<<8 |
        int(hs[offset+3]&0xff)
    code %= 1000000

    return fmt.Sprintf("%06d", code), remaining, nil
}
```

RFC 6238 测试向量 `287082` 已通过验证。

**3. 交互式终端**

用 `golang.org/x/term` 的 `ReadPassword` 读主密码。`bufio.Scanner` 读其他输入。

注意：`term.ReadPassword` 需要真实 TTY，piped input 不工作。这也是为什么 add/edit 必须是交互式命令。

**4. 单二进制分发**

`CGO_ENABLED=0 go build -ldflags="-s -w"`，交叉编译 5 个平台：

```makefile
cli-release:
    GOOS=linux GOARCH=amd64  → dist/vault-linux-amd64
    GOOS=linux GOARCH=arm64  → dist/vault-linux-arm64
    GOOS=darwin GOARCH=amd64 → dist/vault-darwin-amd64
    GOOS=darwin GOARCH=arm64 → dist/vault-darwin-arm64
    GOOS=windows GOARCH=amd64 → dist/vault-windows-amd64
```

---

### Web UI 实现

React 19 + TypeScript + Vite，纯前端，托管在 Cloudflare Pages。

关键依赖：无（Web Crypto API 是浏览器内置的）。

**IndexedDB 存储层**

其实严格来说不需要数据库——vault 是一个文件，每次加解密都是整体操作。IndexedDB 只是缓存的角色，防止每次解锁都从 GitHub 下载。

两个 store：
- `vault`：加密的 vault 数据
- `settings`：UI 偏好

**GitHub API 集成**

使用 `@octokit/rest` 操作 GitHub 仓库：
- 创建 `vaultlite-backup` 仓库（如果不存在）
- Push/Pull `vault.enc` 文件
- 获取 commit 历史（用于回滚）

30 秒防抖自动备份，也有手动 "Sync Now" 按钮。

---

### 关于安全

我知道密码管理器最容易被质疑的就是安全性。说几点：

1. **加密在客户端完成**：GitHub 只存储密文，服务端不可能解密
2. **零信任架构**：我没有自己的服务器，不需要信任任何第三方
3. **600k PBKDF2 迭代**：Web Crypto API 的性能上限大致在这，~1 秒解锁
4. **公开仓库也是安全的**：因为没有密钥，ciphertext 对任何人都是无意义的字节
5. **不建议在共享设备上使用**：因为没有远程注销机制

开源的目的是让任何人都能审查加密逻辑。欢迎提 issue 讨论。

---

### CLI 命令速览

| 命令 | 说明 |
|------|------|
| `vault init` | 初始化密码库 |
| `vault list` | 列出所有条目 |
| `vault add` | 交互式添加 |
| `vault get <query>` | 搜索条目 |
| `vault edit <id>` | 编辑条目 |
| `vault rm <id>` | 删除条目 |
| `vault totp <query>` | 生成 TOTP 验证码 |
| `vault sync` | 推送到 GitHub |
| `vault pull [username]` | 从 GitHub 恢复 |
| `vault generate` | 生成随机密码 |
| `vault export` | 导出为 CSV |

---

### 遇到的一些坑

1. **`>>>` 位运算截断**：JavaScript 的 `>>>` 是 32 位无符号右移，超过 2^32 的 counter 会被截断。TOTP 的 counter = unix_epoch / 30，短期内不会超过 32 位，但正确做法是用 `BigInt` + `DataView`。

2. **Fine-grained PAT 不能创建 repo**：GitHub 的 fine-grained PAT 不支持创建仓库的 API，必须用 classic PAT（`ghp_`）并勾选 `repo` scope。这点 GitHub 文档写得不清楚，踩了半小时坑。

3. **CF Pages 构建失败**：`package-lock.json` 版本陈旧导致锁定文件冲突。删除后重新 `npm install` 生成，构建命令改为 `npm install` 而非 `npm ci`。

4. **TOTP 内嵌到 add 流程**：最初 `vault add` 没有 TOTP 输入项，要编辑才能加。后来加了个可选的 `TOTP secret (base32)` 提示，留空就跳过，填了就存。这个改动让使用流程流畅很多。

---

### 后续计划

- [ ] 社区反馈收集，修复 bug
- [ ] 完善单元测试覆盖
- [ ] 考虑 Capacitor 打包 iOS/Android
- [ ] 如果 Web Crypto API 支持 Argon2，升级 KDF

GitHub：https://github.com/huziwoaini221/vaultlite

欢迎 star、提 issue、贡献代码。
