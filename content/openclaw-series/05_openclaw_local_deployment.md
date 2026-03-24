---
title: "OpenClaw 安全实践：自托管数据控制与权限管理"
date: 2026-03-23
draft: false
tags: ["OpenClaw", "AI", "工具"]
categories: ["OpenClaw 深度探索"]
---

# OpenClaw 安全实践：自托管数据控制与权限管理

> **标签**：OpenClaw / 安全 / 隐私 / 深度  
> **日期**：2026-03-23  
> **专题**：OpenClaw 深度探索

---

## 自托管的核心价值：你的数据你做主

很多人问我：为什么不用 ChatGPT？答案很简单：**数据控制**。

用第三方 AI 服务，你的对话历史、文件、偏好都会被服务商存储和分析。OpenClaw 的自托管模式，让所有数据都留在你自己的机器上——这是它与 SaaS AI 工具最本质的区别。

---

## 数据安全的多层防护

### 第一层：本地存储

```
~/.openclaw/
├── agents/           # Agent 工作区
│   ├── main/
│   ├── researcher/
│   └── developer/
├── credentials/      # 加密存储的凭证
├── workspace/        # 项目文件
└── venv/            # Python 虚拟环境
```

**关键原则**：所有文件都在本地，只有 AI API 调用走网络。

### 第二层：凭证隔离

API Keys 和 Bot Tokens 存在 `~/.openclaw/credentials/`：

```bash
~/.openclaw/credentials/
├── feishu-main-allowFrom.json   # 飞书凭证（只允许特定用户）
├── telegram-allowFrom.json       # Telegram 凭证
└── .env                         # API Keys（不提交 git）
```

这些文件权限设置为 `600`，防止其他用户读取：

```bash
chmod 600 ~/.openclaw/credentials/*.json
```

### 第三层：channel 路由控制

飞书群里的消息只路由到 main Agent，不直接暴露给其他 Agent：

```json
{
  "channels": {
    "feishu": {
      "enabled": true,
      "requireMention": true,    // 只响应 @机器人 的消息
      "dmPolicy": "pairing",     // 私聊需要配对
      "groupPolicy": "allowlist"  // 只允许白名单群
    }
  }
}
```

---

## API Key 安全实践

### ❌ 错误做法：硬编码

```python
# SKILL.md 中直接写 API Key
OPENAI_API_KEY="sk-xxxxx"  # ❌ 危险！
```

### ✅ 正确做法：环境变量 + 分层配置

```python
# 通过环境变量读取
import os
api_key = os.environ.get("OPENAI_API_KEY")

# 或者通过 openclaw.json 配置
# skills.entries.image-generation.env 中配置
```

```json
// ~/.openclaw/openclaw.json
{
  "skills": {
    "entries": {
      "image-generation": {
        "enabled": true,
        "env": {
          "MINIMAX_API_KEY": "sk-xxx"  // 仅本机可读
        }
      }
    }
  }
}
```

---

## 频道权限控制

### 飞书：allowFrom 白名单

```json
{
  "channels": {
    "feishu": {
      "accounts": {
        "main": {
          "appId": "cli_xxx",
          "appSecret": "xxx"
        }
      }
    }
  }
}
```

在 `credentials/` 中配置白名单：

```json
// credentials/feishu-main-allowFrom.json
{
  "allowFrom": [
    "ou_d556752e827a6d6cf526c640b7dcb044"  // 只有 阿白 可以访问
  ]
}
```

### Telegram：Bot Token 保护

```bash
# Bot Token 只在本地使用，不要写入任何共享文档
openclaw channels add --channel telegram --token <TOKEN>
```

### 对外消息：审核机制

```
用户消息 → main Agent → 分析 → 需要对外发布？
                                        │
                                        ├── 是 → 先确认用户（安全过滤）
                                        │
                                        └── 否 → 直接执行
```

---

## 多 Agent 权限隔离

每个 Agent 只能访问自己的工作区：

```
workspace-researcher/  # 研究员只能读写这里
  ├── SOUL.md
  ├── projects/
  └── memory/

workspace-developer/   # 开发者只能读写这里
  ├── SOUL.md
  ├── projects/
  └── memory/
```

这样做的好处：
- 研究员无法读取开发者的代码（信息隔离）
- 一个 Agent 被攻破，不会影响其他 Agent 的数据
- 敏感项目（如密钥管理）可以单独隔离 Agent

---

## 危险操作拦截

OpenClaw 的执行策略：

| 操作类型 | 是否需要确认 |
|----------|------------|
| 读文件、搜索、发消息 | ✅ 自动执行 |
| 删除文件、发送外部消息 | ⚠️ 先确认 |
| 暴露凭证、执行外部命令 | ❌ 拒绝 |
| 未知插件安装 | ❌ 拒绝 |

### exec 工具的安全策略

```json
// openclaw.json 配置
{
  "gateway": {
    "exec": {
      "policy": "allowlist",    // 白名单模式
      "allowedCommands": [
        "python3", "git", "node", "npm"
      ],
      "deniedPatterns": [
        "rm -rf /",              // 防删库
        "curl .* | sh",           // 防远程脚本注入
        ".* --dangerous.*"       // 防危险参数
      ]
    }
  }
}
```

---

## 飞书消息安全要点

### 1. 不要在群里暴露 API Keys

飞书群聊是公开的，任何人都能看到历史消息。如果在群里分享了 API Key：

```
❌ 错误
"API Key 是 sk-xxx，请帮我配置"

✅ 正确
"API Key 已私信给我"（私聊发送）
```

### 2. Bot 权限最小化

飞书应用只需要这些权限：
- `im:message` — 收发消息
- `docx:document` — 读写文档
- `bitable:app` — 操作多维表格

**不要开通**文件管理权限、通讯录权限等非必要权限。

### 3. Bot 只响应 @提及

```json
{
  "requireMention": true  // 不 @ 就不会响应，防止被滥用
}
```

---

## 定时任务（Cron）安全

OpenClaw 的定时任务可以定期执行敏感操作，要格外小心：

```json
// ~/.openclaw/cron/tasks.json
{
  "tasks": [
    {
      "schedule": "0 9 * * *",  // 每天 9 点
      "action": "HEARTBEAT",      // 只执行心跳检查
      "agents": ["main"]
    }
  ]
}
```

**安全建议**：
- Cron 任务只执行只读操作（检查邮件、天气等）
- 不要在 Cron 中执行删除操作
- Cron 任务的日志要定期清理

---

## 安全检查清单

部署 OpenClaw 后，逐项检查：

- [ ] `~/.openclaw/credentials/` 目录权限为 `700`，文件权限为 `600`
- [ ] 飞书/Telegram Bot Token 不在任何公开文档中
- [ ] `openclaw.json` 中的 API Keys 使用环境变量而非硬编码
- [ ] 飞书应用权限最小化（只开通必要的几个）
- [ ] `requireMention: true`（飞书 Bot 只响应 @）
- [ ] `dmPolicy: pairing`（私聊需要配对）
- [ ] `exec.policy: allowlist`（执行白名单模式）
- [ ] 不在群聊中暴露任何敏感信息

---

## OpenClaw 的安全边界

最后需要说明的是，OpenClaw 是**本地网关**，它的安全边界止于你的机器：

```
OpenClaw 安全边界
    │
    ├── ✅ 保护：你的本地文件、Agent 工作区、凭证
    ├── ✅ 保护：聊天内容不被第三方服务商存储
    ├── ⚠️ 局限：AI API 调用（OpenAI/MiniMax 等）由第三方处理
    └── ⚠️ 局限：飞书/Telegram 等平台的消息由平台方存储
```

自托管解决了"AI 服务商数据留存"的问题，但"AI API 服务商"和"聊天平台"本身的数据安全问题，仍然需要依赖这些平台的隐私政策。

---

## 总结

OpenClaw 的安全核心：**数据留在本地，操作经过授权，敏感信息多重隔离**。作为自托管工具，它在易用性和安全性之间做到了很好的平衡——你不需要成为安全专家，也能安全地运行一个强大的 AI 助手团队。

---

*专题持续更新中 🎉*

**系列目录：**
1. [OpenClaw 入门指南：自托管 AI 网关](../openclaw-series/01-openclaw-入门指南.md)
2. [OpenClaw 架构解析：Gateway、Agent、Channel 三层架构](../openclaw-series/02-openclaw-架构解析.md)
3. [用 OpenClaw 构建多智能体团队](../openclaw-series/03-openclaw-多智能体团队.md)
4. [OpenClaw Skills 插件系统实战](../openclaw-series/04-openclaw-skills插件系统.md)
5. [OpenClaw 安全实践：自托管数据控制与权限管理](../openclaw-series/05-openclaw-安全实践.md)
6. [OpenClaw 记忆系统：让 AI 拥有持续进化的记忆](../openclaw-series/06-openclaw-记忆系统.md)
