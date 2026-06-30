# 少数派文章

## 标题

VaultLite：给开发者的本地优先密码管理器，CLI + Web，GitHub 同步

## 正文

作为一个开发者，密码管理这件事我一直很纠结。

Bitwarden 很好，但要跑服务器（或者付费）。KeePass 很稳，但跨设备同步要自己折腾。pass(1) 是终端党的最爱，但没有 GUI，团队友好看不懂。

我想要的东西其实很简单：

1. 终端能用，但偶尔也想打开浏览器看一眼
2. 密码和 TOTP 放在一起，不用再开一个 Authenticator 应用
3. 加密后再上传，服务商看不看得到无所谓
4. 跨设备恢复时，不用记一堆配置

于是写了 VaultLite。

---

### 设计思路

**加密层：PBKDF2 + AES-256-GCM**

为什么不是 Argon2？因为 Web Crypto API（浏览器）不支持 Argon2。Go 和浏览器需要兼容的 KDF 算法。600k 次迭代，解锁时间约 1 秒。

加密后的 vault 是一个 JSON 文件，包含 salt、nonce、ciphertext 和 tag，全部 base64 编码。Go CLI 和 Web UI 共用同一套加密格式。

**同步层：GitHub 作为 dumb file host**

既然 vault 在客户端已经加密，GitHub 看到的只是一堆随机字节。不需要建 sync server，不需要 Docker，只需要一个 GitHub repo。

Push/pull 到 `vaultlite-backup` 仓库，公开或私有都行。公开 repo 的话，在新设备恢复时连 token 都不需要，只需输入 master password + GitHub 用户名。

GitHub token 存在加密 vault 里——跨设备恢复时自动提取，不用反复配置。

**TOTP 内嵌：不再需要单独的验证器**

每个密码条目都可以绑定一个 TOTP secret。在列表里直接显示 6 位验证码 + 倒计时环，不用切换到另一个页面或另一个 App。

实现就是标准的 HMAC-SHA1 / 30 秒时间步长。测试向量 287082 已通过。

---

### CLI 演示

```bash
# 初始化密码库
$ vault init

# 添加条目（交互式）
$ vault add
Title: GitHub
Username: user@github.com
Password: ********
TOTP secret (base32): JBSWY3DPEHPK3PXP

# 列出所有条目（含内嵌 TOTP）
$ vault list

# 生成 TOTP 验证码
$ vault totp Google
Code: 551966
Expires: 8 seconds

# 同步到 GitHub
$ vault sync

# 从公开仓库恢复
$ vault pull huziwoaini221
```

### Web UI

纯前端 React 应用，托管在 Cloudflare Pages。核心页面只有三个：

- **Welcome**：设置主密码 / 从 GitHub 恢复
- **Unlock**：输入主密码解密
- **Vault**：统一的条目列表，密码 + TOTP 内嵌显示

PWA 支持，手机浏览器添加到主屏幕后像原生 App。

---

### 几个有意思的技术决策

1. **PBKDF2 vs Argon2**
   浏览器 Web Crypto API 不支持 Argon2 是最大的制约。如果能用 Argon2，移动端的解锁体验会更好（对 GPU/ASIC 攻击面的抵御也更强）。但在兼容性和算法先进性之间，我选了前者。

2. **统一视图 vs 标签页**
   最初设计了 Vault / Authenticator 两个标签页，但实际用起来发现很割裂——你要在密码和验证码之间反复切换。最终合并成一个列表，每个条目后面直接跟 TOTP 码。少点一下就是更好的体验。

3. **GitHub token 存在 vault 里**
   最早 token 存在 localStorage，但新设备恢复时本地没有 token，得先配 token 才能 restore，鸡生蛋问题。后来把 token 写进加密 vault，输入主密码后自动提取，新设备直接一步恢复。

4. **fine-grained PAT 不能创建仓库**
   GitHub 的 fine-grained PAT（`github_pat_`）在创建 repo 的 API 调用上有限制。必须用 classic PAT（`ghp_`）并勾选 `repo` scope。这点在文档里踩了坑。

---

### 使用场景

- **开发者的主力密码管理器**：终端操作效率高，Web UI 偶尔用
- **自部署替代方案**：不用 Docker，不用服务器，一个二进制 + 一个 GitHub repo
- **Bitwarden 迁移**：支持从 Bitwarden CSV 导入

项目地址：https://github.com/huziwoaini221/vaultlite

---

### 后续规划

- 短期：等社区反馈，修 bug，完善文档
- 中期：考虑用 Capacitor 打包 iOS/Android 原生应用
- 长期：如果 Web Crypto API 支持 Argon2，考虑升级 KDF

有想法或建议欢迎提 issue。
