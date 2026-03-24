---
title: "Claude Code 交互模式：多轮对话完成复杂任务"
date: 2026-03-24T00:00:00+08:00
draft: false
tags: ["Claude Code", "AI", "工作流"]
categories: ["Claude Code 专题"]
---

# Claude Code 交互模式：多轮对话完成复杂任务

## 单次模式 vs 交互模式

Claude Code 支持两种主要工作模式：

### 单次任务模式
```bash
claude "帮我写一个排序算法"
```
适合简单、独立的编程任务。

### 交互模式
```bash
claude
# 进入交互式对话
```
适合复杂、多步骤的项目开发。

## 多轮对话的艺术

### 1. 上下文累积

Claude Code 会自动维护对话上下文：

```
> claude
# 第一轮：创建项目结构
帮我初始化一个 React + TypeScript 项目

# 第二轮：继续开发
现在添加一个用户登录页面

# 第三轮：添加功能
登录成功后跳转到 dashboard
```

Claude 知道项目已经初始化、已有哪些文件，所以每次新请求都在正确上下文中执行。

### 2. 精确引用文件

使用 `@` 符号精确引用文件：
```
帮我改进 @src/utils/auth.ts 里的 token 刷新逻辑
```

Claude 会直接读取该文件内容并提出改进建议。

### 3. 分步骤执行

不要一次让 Claude 做太多事：
```
# 建议：分步骤
第一步：设计数据库 Schema
第二步：写 API 路由
第三步：写前端组件
第四步：测试集成
```

### 4. TDD 开发流程

```
# 1. 先写测试
帮我为 calculateSwap() 函数写 Foundry 测试，覆盖：
- 正常路径
- 余额不足
- 无授权

# 2. 运行测试确认失败
forge test

# 3. 实现功能
帮我实现 calculateSwap() 函数，让测试通过
```

## 常用交互命令

| 命令 | 作用 | 示例 |
|------|------|------|
| `@file` | 引用文件 | `@src/app.ts` |
| `/web` | 搜索网络 | `/web latest Next.js release` |
| `/grep` | 搜索代码 | `/grep "TODO" **/*.ts` |
| `/ask` | 简单问题 | `/ask React useEffect vs useLayoutEffect` |
| `/review` | 代码审查 | `/review @src/auth.ts` |

## 实战：重构一个大文件

```
# 第一轮：让 Claude 分析
帮我分析 @src的大型文件.ts 的结构，列出主要函数和依赖关系

# 第二轮：制定拆分计划
根据分析结果，我要把这个文件拆成 3 个模块：
- validators/ - 数据验证
- processors/ - 业务逻辑
- handlers/ - 外部接口

# 第三轮：执行拆分
按上述计划拆分，每完成一个模块我来确认
```

## 最佳实践

1. **每次任务明确**：不要模糊请求，给出具体输入输出
2. **及时纠正**：Claude 理解错了马上说"不对，应该是..."
3. **检查中间结果**：大任务中途让它暂停，确认后再继续
4. **保留上下文**：重要决策记录在 CLAUDE.md 里
