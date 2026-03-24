---
title: "OpenClaw Skills 插件系统实战：从零构建你的第一个 Skill"
slug: "04_openclaw_skills"
date: 2026-03-23
draft: false
tags: ["OpenClaw", "AI", "工具"]
categories: ["OpenClaw 深度探索"]
---

# OpenClaw Skills 插件系统实战：从零构建你的第一个 Skill

> **标签**：OpenClaw / Skills / 插件 / 实战  
> **日期**：2026-03-23  
> **专题**：OpenClaw 深度探索

---

## 什么是 Skills

Skills 是 OpenClaw 的**扩展工具层**，它让 AI Agent 能够执行具体的外部操作：

- 生成图片 → 调用 `image-generation` Skill
- 发飞书消息 → 调用 `feishu-doc` Skill
- 搜索 GitHub → 调用 `github` Skill
- 发送邮件 → 调用 `gog` Skill

本质上，Skill 就是一个**封装好的命令行工具**，AI Agent 通过标准化接口调用它。

---

## Skills 的标准结构

```
~/.openclaw/workspace/skills/
└── my-skill/
    ├── SKILL.md          # 技能说明文档（AI 会读取）
    ├── scripts/           # 可执行脚本
    │   └── run.sh
    └── references/        # 参考文档
        └── examples.md
```

### SKILL.md 的标准格式

```markdown
---
name: my-skill
description: 技能的简短描述，激活关键词
---

# My Skill

## 激活场景
当用户提到以下内容时使用本技能：
- 生成图片
- 画一张图
- AI 画图

## 工作流程
1. 理解需求
2. 调用脚本
3. 返回结果

## 使用方式

### 基本用法
```bash
python3 my_skill.py --param value
```

## 示例
python3 my_skill.py --prompt "一只猫" --output ~/Downloads/cat.png
```

---

## 实战：构建一个"区块链价格查询" Skill

### 第一步：创建目录结构

```bash
mkdir -p ~/.openclaw/workspace/skills/crypto-price/
```

### 第二步：编写 SKILL.md

```markdown
---
name: crypto-price
description: 查询加密货币实时价格，激活于"价格"、"行情"、"币价"
---

# Crypto Price Skill

## 激活场景
当用户提到：
- BTC 现在多少钱
- ETH 价格
- 查看某个币的行情

## 工作流程
1. 解析币种和查询参数
2. 调用 CoinGecko API 获取价格
3. 格式化输出结果

## 使用方式

### 查询单个币种
python3 crypto_price.py --symbol BTC

### 查询多个币种
python3 crypto_price.py --symbols BTC,ETH,SOL

### 指定法币
python3 crypto_price.py --symbol BTC --currency CNY
```

### 第三步：编写执行脚本

```python
#!/usr/bin/env python3
"""Crypto Price Skill - 查询加密货币价格"""

import argparse
import requests
import sys

COINGECKO_API = "https://api.coingecko.com/api/v3"

def get_price(symbol: str, currency: str = "usd") -> dict:
    # symbol 转 id（简化版）
    symbol_map = {
        "btc": "bitcoin", "eth": "ethereum", 
        "sol": "solana", "bnb": "binancecoin"
    }
    coin_id = symbol_map.get(symbol.lower(), symbol.lower())
    
    url = f"{COINGECKO_API}/simple/price"
    params = {"ids": coin_id, "vs_currencies": currency}
    
    resp = requests.get(url, params=params, timeout=10)
    data = resp.json()
    
    price = data.get(coin_id, {}).get(currency)
    return {"symbol": symbol.upper(), "price": price, "currency": currency.upper()}

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--symbol", required=True)
    parser.add_argument("--currency", default="usd")
    args = parser.parse_args()
    
    result = get_price(args.symbol, args.currency)
    print(f"{result['symbol']}: ${result['price']:,.2f} {result['currency']}")
```

### 第四步：注册 Skill

在 `~/.openclaw/openclaw.json` 中注册：

```json
{
  "skills": {
    "entries": {
      "crypto-price": {
        "enabled": true,
        "env": {
          "COINGECKO_API_KEY": "your_free_api_key"
        }
      }
    }
  }
}
```

---

## 已有 Skills 一览

OpenClaw 内置了大量开箱即用的 Skills：

### 媒体类

| Skill | 功能 | API 依赖 |
|-------|------|----------|
| **image-generation** | DALL-E / MiniMaxi / FLUX 图片生成 | OpenAI / MiniMaxi |
| **text-to-video** | MiniMaxi / Luma AI 视频生成 | MiniMaxi |
| **video-frames** | FFmpeg 视频帧提取 | FFmpeg |

### 办公类

| Skill | 功能 | API 依赖 |
|-------|------|----------|
| **feishu-doc** | 飞书文档读写 | 飞书应用 |
| **feishu-bitable** | 飞书多维表格 | 飞书应用 |
| **feishu-wiki** | 飞书知识库 | 飞书应用 |
| **gog** | Gmail/Calendar/Drive | Google OAuth |

### 开发类

| Skill | 功能 | API 依赖 |
|-------|------|----------|
| **github** | GitHub CLI 操作 | gh CLI |
| **coding-agent** | 派给 Codex/Claude Code | OpenAI API |
| **summarize** | URL/文件/视频摘要 | 内置 |

### 金融类

| Skill | 功能 | API 依赖 |
|-------|------|----------|
| **weather** | 天气预报 | 无（wttr.in） |
| **crypto-price** | 加密货币价格 | CoinGecko |
| **quant-finance** | 量化策略 | 交易所 API |

---

## Skill 调用机制详解

当 AI Agent 决定调用 Skill 时：

```
Agent 决策：用户要查加密货币价格
    │
    ▼
读取 SKILL.md，理解接口格式
    │
    ▼
构建命令行：
python3 ~/.openclaw/workspace/skills/crypto-price/crypto_price.py \
    --symbol BTC --currency USD
    │
    ▼
exec 工具执行命令
    │
    ▼
捕获 stdout 返回结果
    │
    ▼
Agent 将结果整合进回复
```

---

## 从 ClawdHub 安装新 Skills

OpenClaw 的 Skills 市场叫 [ClawdHub](https://clawhub.com)，安装新 Skill 只需：

```bash
clawhub install <skill-name>
```

例如安装一个"Twitter/X 操作" Skill：

```bash
clawhub install xurl
```

安装后 Skill 会出现在 `~/.openclaw/workspace/skills/` 目录下，自动被 OpenClaw 识别。

---

## 构建 Skill 的最佳实践

1. **SKILL.md 要详细**：AI 通过它理解何时调用、如何调用
2. **错误处理要做好**：脚本失败时要有清晰的错误信息
3. **路径用绝对路径**：`~/.openclaw/workspace/skills/...` 不要用相对路径
4. **结果要结构化**：尽量返回 JSON，方便 Agent 解析
5. **API Key 放 env**：不要硬编码敏感信息

---

## 适用场景判断

| 任务 | 用 Skill 还是 Agent？ |
|------|---------------------|
| 查询天气、加密货币价格 | ✅ 用 Skill（轻量） |
| 发飞书消息、读文档 | ✅ 用 Skill（工具调用） |
| 调研报告、架构设计 | ❌ 用 Agent（需要推理） |
| 代码生成 | Agent + Skill（Agent 写代码，Skill 执行验证） |

---

*系列下一篇：[OpenClaw 安全实践：自托管数据控制与权限管理](../openclaw-series/05-security.md)*
