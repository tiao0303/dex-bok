---
title: "用 OpenClaw 构建多智能体团队：角色划分与任务协调实战"
slug: "03_openclaw_multi_agent"
date: 2026-03-23
draft: false
tags: ["OpenClaw", "AI", "工具"]
categories: ["OpenClaw 深度探索"]
---

# 用 OpenClaw 构建多智能体团队：角色划分与任务协调实战

> **标签**：OpenClaw / 多智能体 / 实战  
> **日期**：2026-03-23  
> **专题**：OpenClaw 深度探索

---

## 从单兵作战到团队协作

用 AI 写代码不难，但用 AI 做复杂项目（调研 → 架构 → 开发 → 评审 → 决策）就复杂了。一个通用的 AI 无法同时精通所有领域。

OpenClaw 的解决方案是：**多智能体团队**——每个 Agent 专注一个角色，协同完成复杂任务。

---

## 团队角色设计

```
        ┌─────────────────────────────┐
        │     main (协调员)             │
        │  接收任务 → 分析 → 分派 → 汇总   │
        └──────────┬──────────────────┘
                   │
    ┌──────────────┼──────────────────────┐
    ▼              ▼                      ▼
 researcher    architect              developer
 (调研员)       (架构师)               (开发者)
    │              │                      │
    ▼              ▼                      ▼
  reviewer     frontend             security
 (评审)        (前端)               (安全)
                   │
                   ▼                decider
               (决策者)
```

### 各角色职责

| 角色 | 输入 | 输出 | 特点 |
|------|------|------|------|
| **researcher** | 问题/背景 | 调研报告、市场分析 | 广度优先，信息挖掘 |
| **architect** | 需求 | 架构设计、技术选型 | 系统性、前瞻性 |
| **developer** | 设计稿 | 代码实现 | 可执行、可测试 |
| **frontend** | 需求 | UI设计方案、组件规范 | 用户视角 |
| **reviewer** | 方案/代码 | 评审报告、改进建议 | 批判性思维 |
| **security** | 方案/代码 | 风险矩阵、安全建议 | 底线思维 |
| **decider** | 各方意见 | 最终决策 | 权衡利弊、拍板 |

---

## 任务分配流程

### 案例：DEX 聚合器项目

```
用户（阿白）
    │
    ▼ 发起项目请求
main (协调员)
    │
    ├── 解析任务 → 需要：调研 + 架构 + 开发 + 前端 + 安全 + 评审 + 决策
    │
    ▼ 并行派发（5路同时）
    ┌─────────┬──────────┬─────────┬────────┬────────┐
    ▼         ▼          ▼         ▼        ▼        │
researcher architect developer frontend security        │
    │         │          │         │        │        │
    │         │          │         │        │        │
    │         │          │         │        │        │
    └─────────┴──────────┴─────────┴────────┴────────┘
                        │
                        ▼ 各自输出报告
                    reviewer (综合评审)
                        │
                        ▼ 评审结论
                     decider (最终决策)
                        │
                        ▼
                    汇总报告 → 发给用户
```

### 实际执行命令

```bash
# main 协调员收到 阿白 的请求后
main: @architect @researcher @developer @frontend @security 
      基于DEX聚合器项目，各自输出方案

# 各 Agent 并行工作
researcher  → 输出 RESEARCH.md（竞品分析）
architect   → 输出 ARCHITECTURE.md（系统架构）
developer   → 输出 DEVELOP.md（合约设计）
frontend   → 输出 FRONTEND.md（UI设计）
security   → 输出 SECURITY.md（风险矩阵）

# 评审汇总
reviewer   → 输出 REVIEW.md（综合评审）

# 最终决策
decider    → 输出 DECISION.md（Go/No-Go）
```

---

## 工作区隔离设计

每个 Agent 的工作区完全独立：

```
~/.openclaw/workspace/
├── projects/
│   └── dex-aggregator/
│       ├── architect/ARCHITECTURE.md
│       ├── researcher/RESEARCH.md
│       ├── developer/DEVELOP.md
│       ├── frontend/FRONTEND.md
│       ├── security/SECURITY.md
│       ├── reviewer/REVIEW.md
│       └── decider/DECISION.md
│
~/.openclaw/workspace-researcher/
├── SOUL.md     # 研究员人格
├── USER.md     # 用户偏好
└── projects/   # 研究员自己的项目
```

这样做的好处：
- 研究员写的文档不会覆盖开发者的代码
- 每个 Agent 可以独立重置，不影响其他 Agent
- 敏感信息（如 API Key）可以在不同 Agent 间差异化配置

---

## 通信机制：sessions

Agent 之间通过 `sessions` 传递消息和结果：

```bash
# main 向 researcher 派发任务
sessions_send(sessionKey="agent:researcher:xxx", message="任务描述")

# researcher 完成任务后汇报
sessions_send(sessionKey="agent:main:yyy", message="调研完成，报告已落盘")

# main 收到结果后继续下一步
```

---

## 协同的黄金法则

### ✅ 正确做法

1. **并行优先**：多任务互不依赖 → 同时派给多个 Agent
2. **专业事派专业角色**：调研 → researcher，架构 → architect
3. **对内直接做，对外先确认**：内部读文件/分析直接做，对外发消息/发布先确认
4. **交付物落盘**：所有输出必须写到文件，不能只存在于对话中

### ❌ 错误做法

- 串行等待：等 researcher 完再让 developer 开始（应该并行）
- 一个 Agent 干所有事：main 既做调研又写代码又做安全（应该分派）
- 不写文件：所有结论只存在于聊天中（应该落盘到 workspace）

---

## 实战技巧

### 技巧 1：利用 SOUL.md 定义角色

每个 Agent 的 `SOUL.md` 定义了它的性格和风格，确保输出符合预期：

```markdown
# SOUL.md - 研究员
角色：研究员
职责：深度调研、竞品分析、数据挖掘
风格：结构化、引用来源、数据驱动
```

### 技巧 2：利用 AGENTS.md 定义工作流

```markdown
## 效率
### 并行优先
多任务互不依赖 → 同时派给多个角色，不要串行

### 专业事派专业角色
| 任务类型 | 派给 |
|----------|------|
| 调研/查资料 | researcher |
| 架构/方案设计 | architect |
| 开发/写代码 | developer |
```

### 技巧 3：利用 HEARTBEAT 做周期性工作

配置 `HEARTBEAT.md` 让 Agent 定期自动执行任务：

```markdown
- 每 4 小时：检查邮件
- 每天早上 8 点：收集新闻摘要
- 每周一：生成周报
```

---

## 适用场景 vs 不适用场景

| 场景 | 适合多智能体？ |
|------|--------------|
| 复杂项目（需要架构+开发+评审） | ✅ 非常适合 |
| 快速问答 | ❌ 单 Agent 即可 |
| 简单代码生成 | ❌ 单 Developer 即可 |
| 需要多轮讨论的决策 | ✅ 需要 Decider |
| 纯写作/文案 | ❌ 单 Agent 即可 |

---

*系列下一篇：[OpenClaw Skills 插件系统实战：从零构建你的第一个 Skill](../openclaw-series/04-skills.md)*
