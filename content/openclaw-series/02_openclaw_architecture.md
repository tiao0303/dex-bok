---
title: "OpenClaw 架构解析：Gateway、Agent、Channel 三层架构深度剖析"
date: 2026-03-23
draft: false
tags: ["OpenClaw", "AI", "工具"]
categories: ["OpenClaw 深度探索"]
---

# OpenClaw 架构解析：Gateway、Agent、Channel 三层架构深度剖析

> **标签**：OpenClaw / 架构 / 深度  
> **日期**：2026-03-23  
> **专题**：OpenClaw 深度探索

---

## 为什么理解架构很重要

很多用户把 OpenClaw 当作"飞书/Telegram 接入 AI"的简单工具。但真正理解它的架构后，你会发现它本质上是一个**本地 AI 智能体运行平台**——有调度器、有工作区隔离、有多渠道分发。

理解架构，才能用好 OpenClaw 的高级特性（多智能体、Skills、cron 定时任务等）。

---

## 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                     OpenClaw Gateway                         │
│                                                             │
│  ┌──────────────┐     ┌─────────────┐     ┌────────────┐ │
│  │   Channel    │     │    Agent   │     │   Skills   │ │
│  │  (消息收发)   │ ──▶ │  (智能体)   │ ──▶ │  (工具)    │ │
│  └──────────────┘     └─────────────┘     └────────────┘ │
│         │                   │                    │        │
│         └───────────────────┴────────────────────┘        │
│                            │                              │
│                   ┌────────▼────────┐                     │
│                   │   Message Bus    │                     │
│                   │   (消息总线)     │                     │
│                   └─────────────────┘                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 第一层：Channel（渠道）

Channel 负责**与外部聊天平台通信**。

### 支持的平台

| 渠道 | 说明 | 配置项 |
|------|------|--------|
| **Telegram** | Bot API | botToken |
| **Discord** | Bot Token | botToken |
| **Feishu（飞书）** | 企业自建应用 | appId + appSecret |
| **WhatsApp** | WhatsApp Web | pairing 模式 |
| **iMessage** | macOS Messages.app | 本地插件 |

### Channel 的核心职责

1. **接收消息**：从外部平台拉取或接收消息
2. **解析消息**：提取文本、提及（@）、附件、语音等
3. **发送响应**：将 AI 的回复推送回对应平台
4. **多账号路由**：一个渠道可以有多个账号（如多个飞书机器人）

### 关键设计：消息归一化

不同平台的消息格式完全不同（Discord 有 embeds、飞书有 at_mention、Telegram 有 reply_to），Channel 层统一转换为内部标准格式：

```json
{
  "chat_id": "oc_xxxx",
  "sender_id": "ou_xxxx",
  "channel": "feishu",
  "was_mentioned": true,
  "body": "用户消息内容"
}
```

---

## 第二层：Agent（智能体）

Agent 是 OpenClaw 的**核心执行单元**，每个 Agent 有自己独立的工作区（workspace）和会话。

### Agent 的结构

```
Agent
├── workspace/     # 独立文件系统工作区
├── SOUL.md        # 角色定义（人格、语气）
├── USER.md        # 用户偏好
├── AGENTS.md      # 工作规范
├── skills/        # 可用技能
└── sessions/      # 对话历史
```

### 内置 Agent 类型

| Agent | 角色 | 职责 |
|-------|------|------|
| **main** | 协调员 | 总入口，路由任务 |
| **researcher** | 研究员 | 调研、分析、竞品分析 |
| **architect** | 架构师 | 系统设计、技术选型 |
| **developer** | 开发者 | 写代码、实现功能 |
| **frontend** | 前端 | UI/UX 设计 |
| **reviewer** | 评审 | 代码/方案评审 |
| **security** | 安全 | 安全风险分析 |
| **decider** | 决策者 | 最终拍板 |

### 任务调度机制

当 main 收到一个任务时：

```
用户消息
    │
    ▼
main (协调员) ── 分析任务类型 ──▶ 派发给对应 Agent
    │
    ├── 调研类 ──▶ researcher
    ├── 架构类 ──▶ architect
    ├── 开发类 ──▶ developer
    └── 安全类 ──▶ security
```

每个 Agent 独立运行在自己的 workspace 中，互不干扰，通过 `sessions` 机制汇报结果。

---

## 第三层：Skills（技能系统）

Skills 是 OpenClaw 的**扩展工具层**，让 AI 智能体能够执行具体操作。

### 内置 Skills

| Skill | 功能 |
|-------|------|
| **image-generation** | AI 图片生成（DALL-E、MiniMaxi、FLUX） |
| **text-to-video** | AI 视频生成 |
| **video-frames** | 视频帧提取 |
| **weather** | 天气预报 |
| **github** | GitHub API 操作 |
| **feishu-doc** | 飞书文档读写 |
| **feishu-bitable** | 飞书多维表格操作 |
| **gog** | Google Workspace（Gmail、Calendar） |
| **1password** | 密码管理 |

### Skills 调用机制

当 Agent 需要执行某个技能时（如生成图片），会通过统一的 Skill 接口调用：

```bash
python3 ~/.openclaw/workspace/skills/image-generation/image_generate.py \
  --prompt "..." \
  --output ~/Downloads/image.png
```

Skills 返回结构化的结果给 Agent，Agent 再将结果整合到回复中。

---

## 消息总线（Message Bus）

Channel、Agent、Skills 之间的协作靠消息总线协调：

1. **Channel** 把用户消息发给 main Agent
2. **main Agent** 分析后派生子任务给专业 Agent
3. **子 Agent** 调用 Skills 执行具体操作
4. **结果** 通过消息总线返回 main
5. **main** 汇总结果通过 Channel 发回用户

---

## 持久化层

| 数据 | 存储位置 |
|------|----------|
| 对话历史 | `~/.openclaw/agents/<id>/sessions/` |
| 文件系统 | 各 Agent 的 `workspace/` |
| 凭证信息 | `~/.openclaw/credentials/`（加密） |
| 定时任务 | `~/.openclaw/cron/` |
| 插件配置 | `~/.openclaw/openclaw.json` |

---

## 架构带来的优势

1. **工作区隔离**：每个 Agent 在独立目录工作，不会互相污染
2. **弹性扩展**：新增渠道或 Agent 只需配置，不需要改代码
3. **本地优先**：所有数据留在本地，只有 AI API 调用走网络
4. **技能可插拔**：Skills 系统让任何工具都能接入 AI

---

*系列下一篇：[用 OpenClaw 构建多智能体团队](../openclaw-series/03-multi-agent.md)*
