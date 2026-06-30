# VaultLite

一个面向开发者的本地优先密码管理器，支持加密保险库（PBKDF2 + AES-256-GCM）、TOTP 验证器，以及可选的 GitHub 备份。

- **CLI** — Go 单文件二进制，无运行时依赖
- **Web** — 纯前端（React + TypeScript），浏览器中直接运行，支持 PWA
- **加密** — PBKDF2（SHA-256，60 万次迭代）+ AES-256-GCM
- **TOTP** — 符合 RFC 6238 标准，与密码同屏显示
- **备份** — 加密 vault 推送到 GitHub，支持公开 / 私有仓库

## 快速开始

### 网页版

可以直接使用 Cloudflare Pages 在线版，或本地构建。支持 PWA——Android/iOS 添加到主屏幕。

```bash
cd web
npm install
npm run build
# 用任意静态文件服务器托管 web/dist/
```

部署到 Cloudflare Pages：
1. 推送代码到 GitHub
2. 在 CF Pages 控制台连接仓库
3. 构建命令：`cd web && npm install && npm run build`
4. 输出目录：`web/dist`

### CLI

从 [Releases](https://github.com/huziwoaini221/vaultlite/releases) 下载对应平台的二进制文件：

```bash
# Linux / macOS
chmod +x vault-*
./vault-linux-amd64 init
```

或从源码构建：
```bash
make cli
./dist/vault init
```

### 首次使用

```bash
# 初始化 vault（设置主密码）
vault init

# 添加密码条目
vault add

# 列出条目
vault list

# 同步到 GitHub
vault config set github-token <你的_token>
vault sync

# 从公开仓库恢复（无需 token）
vault pull <你的-github-用户名>
```

### 跨设备恢复

**第一台设备** —— 配置一次 GitHub：
1. 在 GitHub 设置中输入 token → **Make repo public**
2. 点 Sync——token 会自动存入加密 vault

**新设备** —— 无需 token 即可恢复：
1. 网页版：欢迎页选择 **Restore from GitHub**，输入主密码 + GitHub 用户名
2. CLI：`vault pull <你的-github-用户名>`，输入主密码

Token 会自动从 vault 提取并保存到本地，后续可直接 Sync。

## 功能

### 密码管理
- 添加、编辑、删除、搜索条目（标题、用户名、网址、标签）
- 统一视图——密码和 TOTP 验证码同排显示
- 条目字段：标题、用户名、密码（始终遮盖）、网址、备注、标签、TOTP 密钥

### TOTP 验证器
- 符合 RFC 6238 标准（HMAC-SHA1，30 秒步长）
- 6 位验证码 + 圆环倒计时动画
- Base32 密钥输入，每条目内联显示

### 密码生成器
- 可配置长度（1–128 字符）
- 字符集开关：大写、小写、数字、符号
- 排除易混淆字符（0、O、I、l、1 等）
- 一键复制

### 强度检测
- 实时评分：分数、熵值（bits）、等级标签
- 输入时即时反馈

### GitHub 备份
- 推送到公开或私有仓库
- vault 变更时自动备份（30 秒防抖）
- 手动 Sync 按钮可立即备份
- 恢复时自动回退到前一个 commit
- Token 存于加密 vault 内，跨设备恢复自动提取

### 导入 / 导出
- 导出为 `.enc` 文件（加密，可移植）
- 从 `.enc` 文件导入
- 从 Bitwarden CSV 导入

## 安全

- 主密码永不存储——仅派生密钥，会话期内存驻留
- PBKDF2 60 万次迭代
- AES-256-GCM 认证加密
- 浏览器使用 Web Crypto API，CLI 使用 Go 标准库
- GitHub 仅存储密文——服务端零知识

## 构建

```bash
git clone <仓库地址>

# 仅构建 Web（输出: web/dist/）
make web

# 仅构建 CLI（输出: dist/vault）
make cli

# 构建全部
make build

# 交叉编译 CLI 到所有平台
make cli-release
```

## 协议

MIT

## 反馈

- [提交 Issue](https://github.com/huziwoaini221/vaultlite/issues)
- 邮箱: sailnowhealth@outlook.com
- Telegram 群: [t.me/+oHG72-4yjqM0MTBl](https://t.me/+oHG72-4yjqM0MTBl)
