---
title: "OpenClaw 免费模型配置指南：通义千问、MiniMax 等国产模型一网打尽"
date: "2026-03-24"
draft: false
tags:
  - OpenClaw
  - AI模型
  - 通义千问
  - MiniMax
  - Moonshot
  - 智谱GLM
  - 国产大模型
  - 免费
categories:
  - AI工具
  - OpenClaw系列
---

## 前言

OpenClaw 作为一款开源的个人 AI 助手，支持多模型接入，国内开发者最关心的问题之一就是：**有没有免费模型可以用？如何配置？**

好消息是，OpenClaw 确实内置了对多款国产大模型的支持，其中部分模型提供免费额度或免费接入方式。本文将详细介绍 OpenClaw 可免费使用的模型、配置方法、各模型特点及适用场景，并提供完整的配置示例。

<!-- more -->

## 一、OpenClaw 模型提供商概述

在深入免费模型之前，先了解 OpenClaw 的模型接入机制。OpenClaw 使用 `provider/model` 格式引用模型，例如 `qwen-portal/coder-model` 表示通义千问的代码模型。

OpenClaw 支持两类提供商：

- **内置提供商**：如 `anthropic`、`openai`、`zai`、`qwen-portal`、`minimax-portal` 等，已在 OpenClaw 的插件目录中预定义，只需设置认证凭据，无需手动配置 `models.providers`。
- **自定义提供商**：如 `moonshot`、`deepseek` 等，需要在 `openclaw.json` 的 `models.providers` 字段中手动配置 baseUrl、API Key、API 协议和模型列表。

配置时建议始终设置 `models.mode: "merge"`，确保自定义提供商会与内置提供商并存，而不是覆盖掉内置列表。

## 二、真正的免费模型

### 2.1 通义千问（Qwen）— 完全免费

**推荐指数：⭐⭐⭐⭐⭐**

通义千问是 OpenClaw 中最容易上手的免费模型。通过 `qwen-portal` 提供商接入，使用 OAuth 设备码认证，**无需购买 API Key，每日免费额度 2,000 次请求**，对于个人用户来说非常充裕。

#### 特点

- 完全免费，每日 2,000 次请求
- 国内网络直连，无需 VPN
- OAuth 自动刷新 Token，无需手动管理
- 若已安装 Qwen Code CLI 并登录，OpenClaw 可复用已有凭据
- 提供代码模型和视觉多模态模型

#### 适用场景

日常问答、文本写作、代码辅助、轻量级编程任务。如果你的使用量不大，这是最佳入门选择。

#### 配置步骤

**第一步：启用插件**

```bash
openclaw plugins enable qwen-portal-auth
openclaw gateway restart  # 如果网关已在运行，需要重启
```

**第二步：登录认证**

```bash
openclaw models auth login --provider qwen-portal --set-default
```

执行后会显示一个设备码和链接，在浏览器中打开链接并输入设备码完成认证。

**第三步：设置默认模型**

在 `openclaw.json` 中配置：

```json
{
  "agents": {
    "defaults": {
      "model": { "primary": "qwen-portal/coder-model" },
      "models": {
        "qwen-portal/coder-model": { "alias": "Qwen Coder" },
        "qwen-portal/vision-model": { "alias": "Qwen Vision" }
      }
    }
  }
}
```

**可用模型列表：**

| 模型引用 | 说明 |
|---|---|
| `qwen-portal/coder-model` | Qwen Coder，代码生成和辅助 |
| `qwen-portal/vision-model` | Qwen Vision，多模态（文本+图片） |

### 2.2 MiniMax Coding Plan — 免费接入

**推荐指数：⭐⭐⭐⭐**

MiniMax 提供了 Coding Plan（编程计划），可通过 OAuth 方式免费接入 OpenClaw，无需 API Key。这是除了通义千问之外，OpenClaw 中另一个真正零成本的接入方式。

#### 特点

- 通过 OAuth 免费接入，无需购买 API Key
- 支持国内端点（api.minimaxi.com），访问速度快
- 提供 M2.1、M2.5 等主力模型
- 同一 API Key 额度全平台共享，所有工具共同消耗 prompt 用量
- 极速版（highspeed）无需额外 Key，修改模型 ID 即可启用

#### 适用场景

编程辅助、代码生成、Agent 工作流开发。如果你的主要需求是 coding，MiniMax Coding Plan 是不错的选择。

#### 配置步骤

**第一步：启用 OAuth 插件**

```bash
openclaw plugins enable minimax-portal-auth
openclaw gateway restart
```

**第二步：OAuth 登录**

```bash
openclaw onboard --auth-choice minimax-portal
```

登录时会提示选择端点：
- **Global** — 国际用户（api.minimax.io）
- **CN** — 国内用户（api.minimaxi.com）

**第三步：配置默认模型**

```json
{
  "agents": {
    "defaults": {
      "model": { "primary": "minimax-portal/MiniMax-M2.5" }
    }
  }
}
```

**MiniMax 主要模型参考：**

| 模型引用 | 说明 |
|---|---|
| `minimax-portal/MiniMax-M2.5` | 最新模型，极致性价比 |
| `minimax-portal/MiniMax-M2.5-highspeed` | 极速版，速度更快 |
| `minimax-portal/MiniMax-M2.1` | 强大多语言编程能力 |
| `minimax-portal/MiniMax-M2.1-highspeed` | 极速版 |

## 三、需要 API Key 的国产模型（部分有免费额度）

以下模型需要获取 API Key，但部分平台提供免费试用额度，适合有更高需求的用户。

### 3.1 Moonshot AI（Kimi）

**推荐指数：⭐⭐⭐⭐**

Moonshot AI 提供的 Kimi 系列模型在长上下文和代码生成方面表现突出。OpenClaw 中有两个独立的提供商：`moonshot`（通用 API）和 `kimi-coding`（编程专项）。

#### 特点

- 256K 超长上下文窗口
- Kimi K2.5 是最新通用模型，K2 Thinking 版具备推理增强能力
- 支持 OpenAI 兼容 API
- **注意**：Moonshot API 和 Kimi Coding 是独立提供商，API Key 不可互换

#### 适用场景

需要处理长文档、超长代码文件的场景；复杂的多步骤编程任务。

#### 配置步骤

**获取 API Key：** 访问 [Moonshot 开放平台](https://platform.moonshot.cn/) 注册并创建 API Key。

**配置示例（openclaw.json）：**

```json
{
  "env": { "MOONSHOT_API_KEY": "sk-..." },
  "agents": {
    "defaults": {
      "model": { "primary": "moonshot/kimi-k2.5" },
      "models": {
        "moonshot/kimi-k2.5": { "alias": "Kimi K2.5" },
        "moonshot/kimi-k2-thinking": { "alias": "Kimi K2 Thinking" }
      }
    }
  },
  "models": {
    "mode": "merge",
    "providers": {
      "moonshot": {
        "baseUrl": "https://api.moonshot.cn/v1",
        "apiKey": "${MOONSHOT_API_KEY}",
        "api": "openai-completions",
        "models": [
          {
            "id": "kimi-k2.5",
            "name": "Kimi K2.5",
            "reasoning": false,
            "input": ["text"],
            "contextWindow": 256000,
            "maxTokens": 8192
          },
          {
            "id": "kimi-k2-thinking",
            "name": "Kimi K2 Thinking",
            "reasoning": true,
            "input": ["text"],
            "contextWindow": 256000,
            "maxTokens": 8192
          }
        ]
      }
    }
  }
}
```

**可用模型：**

| 模型引用 | 推理能力 | 说明 |
|---|---|---|
| `moonshot/kimi-k2.5` | ❌ | 最新通用模型 |
| `moonshot/kimi-k2-thinking` | ✅ | 推理增强版 |
| `moonshot/kimi-k2-thinking-turbo` | ✅ | 快速推理版 |

### 3.2 智谱 GLM（Z.AI）

**推荐指数：⭐⭐⭐**

智谱的 GLM 系列是国内最早成熟的大模型之一，通过 Z.AI 平台接入，zai 是 OpenClaw 的内置提供商，配置极为简便。

#### 特点

- 内置提供商，只需设置 API Key，无需手动配置 models.providers
- GLM-4.7 是最新旗舰模型，擅长复杂系统工程与长程 Agent 任务
- 支持 Bearer Token 认证
- 提供多种规格（标准版、轻量高速版）适配不同场景

#### 适用场景

需要强推理、长程规划、复杂工具调用的 Agent 任务。

#### 配置步骤

**获取 API Key：** 访问 [Z.AI 控制台](https://open.bigmodel.cn/) 注册并获取 API Key。

```bash
openclaw onboard --auth-choice zai-api-key
# 或非交互式：
openclaw onboard --zai-api-key "$ZAI_API_KEY"
```

**配置示例（openclaw.json）：**

```json
{
  "env": { "ZAI_API_KEY": "sk-..." },
  "agents": {
    "defaults": {
      "model": { "primary": "zai/glm-4.7" },
      "models": {
        "zai/glm-4.7": { "alias": "GLM-4.7" },
        "zai/glm-4.6": { "alias": "GLM-4.6" }
      }
    }
  }
}
```

**可用模型：**

| 模型引用 | 说明 |
|---|---|
| `zai/glm-4.7` | 最新旗舰，复杂系统工程与长程 Agent 任务 |
| `zai/glm-4.6` | 上一代模型，高性价比 |

### 3.3 DeepSeek

**推荐指数：⭐⭐⭐**

DeepSeek 以开源和高性价比著称，其 DeepSeek Chat 模型可以通过 OpenAI 兼容接口接入 OpenClaw。

#### 特点

- 开源模型，成本极低
- API 协议为 openai-completions，配置简单
- 适合对成本敏感的场景

#### 配置示例：

```json
{
  "env": { "DEEPSEEK_API_KEY": "sk-..." },
  "models": {
    "mode": "merge",
    "providers": {
      "deepseek": {
        "baseUrl": "https://api.deepseek.com",
        "apiKey": "${DEEPSEEK_API_KEY}",
        "api": "openai-completions",
        "models": [
          {
            "id": "deepseek-chat",
            "name": "DeepSeek Chat",
            "contextWindow": 64000,
            "maxTokens": 8192
          }
        ]
      }
    }
  }
}
```

### 3.4 小米 MiMo

**推荐指数：⭐⭐**

小米 MiMo 是小米的大模型产品，通过 anthropic-messages 协议接入。

```json
{
  "env": { "XIAOMI_API_KEY": "sk-..." },
  "models": {
    "mode": "merge",
    "providers": {
      "xiaomi": {
        "baseUrl": "https://api.xiaomimimo.com/v1",
        "apiKey": "${XIAOMI_API_KEY}",
        "api": "anthropic-messages",
        "models": [
          {
            "id": "mimo-v2-flash",
            "name": "MiMo V2 Flash"
          }
        ]
      }
    }
  }
}
```

## 四、配置管理常用命令

配置完成后，使用以下命令管理模型：

```bash
# 查看所有已配置模型状态
openclaw models status

# 列出所有可用模型
openclaw models list

# 设置默认模型（命令行方式）
openclaw models set minimax-portal/MiniMax-M2.5

# 检查配置是否正常（发送真实请求）
openclaw models status --probe

# 查看网关运行状态
openclaw gateway status
```

## 五、总结对比

| 模型 | 免费情况 | 认证方式 | 配置难度 | 特点 |
|---|---|---|---|---|
| **通义千问** | ✅ 每日 2,000 次免费 | OAuth | ⭐ 极简 | 零成本入门首选 |
| **MiniMax** | ✅ Coding Plan 免费 | OAuth | ⭐ 简单 | 编程场景友好 |
| **Moonshot/Kimi** | ❌ 需付费 | API Key | ⭐⭐ 中等 | 超长上下文 |
| **智谱 GLM** | ❌ 需付费 | API Key | ⭐ 内置 | 长程 Agent 任务 |
| **DeepSeek** | ❌ 需付费 | API Key | ⭐⭐ 中等 | 成本极低 |
| **小米 MiMo** | ❌ 需付费 | API Key | ⭐⭐ 中等 | 轻量级场景 |

## 结语

对于刚接触 OpenClaw 的国内用户，**通义千问（qwen-portal）和 MiniMax Coding Plan** 是两个真正零成本的起点，前者每日 2,000 次免费请求，后者通过 OAuth 免费接入。如果免费额度不能满足需求，再根据具体场景选择 Kimi（长上下文）、GLM（复杂 Agent 任务）或 DeepSeek（低成本）作为进阶方案。

希望这篇指南能帮助你快速配置心仪的模型。如果还有其他问题，欢迎在评论区留言！
