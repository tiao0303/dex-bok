---
title: "Claude Code 入门指南：AI 编程第一课，让 AI 替你写代码"
date: 2026-03-24T00:00:00+08:00
draft: false
tags: ["Claude Code", "AI", "编程工具"]
categories: ["Claude Code 专题"]
---

# Claude Code 入门指南：AI 编程第一课，让 AI 替你写代码

## 什么是 Claude Code

Claude Code 是 Anthropic 官方推出的命令行工具，让你直接在终端里调用 Claude 进行编程任务。本质上是一个本地 AI 编程伴侣，支持 macOS、Linux、Windows（WSL）。

核心能力：读写文件、执行命令、搜索代码、多轮对话。

## 安装与初始化

npm 安装：
```bash
npm install -g @anthropic-ai/claude-code
claude --version
```

认证：
```bash
claude auth login
export ANTHROPIC_API_KEY="sk-ant-..."
```

## 第一个项目

启动会话：
```bash
cd ~/my-project
claude
```

Claude 会分析请求、创建/修改文件、展示改动，等你确认（y/n）。

## 核心命令

| 命令 | 作用 |
|------|------|
| claude | 启动交互会话 |
| claude "任务" | 单次任务模式 |
| claude --print | 非交互模式 |
| /clear | 清空对话 |
| /compact | 压缩上下文 |
| /review | 审查当前文件 |
| /test | 运行测试 |

## 与 Git 集成

Claude Code 与 Git 无缝集成，可以自动生成 commit message：

```bash
# 查看当前改动
claude "帮我 review 当前的改动"

# 提交代码
claude "提交当前的改动，commit message 要清晰"
```

## 为什么用 Claude Code

| 工具 | 适合场景 | 缺点 |
|------|---------|------|
| ChatGPT | 快速问答 | 无法直接操作文件 |
| GitHub Copilot | 补全代码 | 能力有限 |
| Claude Code | 复杂任务、文件操作、多步任务 | 需要本地环境 |

Claude Code 是目前最强大的 CLI 编程助手，可以独立完成从零构建项目、代码审查、性能优化等任务。
