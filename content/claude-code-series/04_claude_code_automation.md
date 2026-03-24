---
title: "Claude Code 自动化与自定义：把 AI 变成你的专属开发助手"
slug: "04_claude_code_automation"
date: 2026-03-24T00:00:00+08:00
draft: false
tags: ["Claude Code", "AI", "自动化", "DevOps"]
categories: ["Claude Code 专题"]
---

# Claude Code 自动化与自定义：把 AI 变成你的专属开发助手

## CLAUDE.md：项目级上下文

在项目根目录创建 `CLAUDE.md`，定义项目的技术栈、规范和工作流程。

```markdown
# CLAUDE.md

## 项目概述
这是一个 Uniswap V3 风格的 DEX 合约项目，使用 Foundry 开发。

## 技术栈
- Solidity ^0.8.20
- Foundry (forge/cast/chisel)
- TypeScript + Hardhat (前端)

## 代码规范
- 所有 external 函数必须有 NatSpec 注释
- 安全函数必须使用 SafeMath 或 0.8+ 的内置检查
- 测试覆盖率必须 > 90%

## 常用命令
- `forge build` - 编译
- `forge test` - 运行测试
- `forge coverage` - 覆盖率
- `forge script Deploy.s.sol` - 部署

## 项目结构
- `contracts/` - 合约源码
- `test/` - 测试文件
- `script/` - 部署脚本
- `src/` - 前端源码
```

Claude Code 会自动读取 CLAUDE.md，在整个对话中保持一致上下文。

## Git Hooks 集成

### pre-commit hook

创建 `.git/hooks/pre-commit`：
```bash
#!/bin/bash
claude --print "检查代码风格和安全问题"
```

### commit-msg hook（自动生成 commit message）
```bash
#!/bin/bash
claude --print "为以下 diff 生成一句简洁的 commit message：$(git diff --staged)"
git commit -m "$(claude --print "生成 commit message")"
```

## CI/CD 集成

### GitHub Actions 示例

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: foundry-rs/foundry-toolchain@v1
      - name: Run tests
        run: forge test
      - name: Security audit
        run: |
          claude --print "对 contracts/ 做安全审查，输出问题列表"
      - name: Gas snapshot
        run: forge snapshot
        if: github.event_name == 'pull_request'
```

## 快捷脚本

### 自动化代码审查
```bash
#!/bin/bash
# claude-review.sh
claude --print "审查 $1 文件，重点检查：
1. 安全性（授权、重入、溢出）
2. 代码风格（命名、注释）
3. 错误处理
输出格式化的审查报告"
```

### 自动化测试生成
```bash
#!/bin/bash
# claude-test.sh - 为指定合约生成测试
claude --print "为 $1 合约生成完整的 Foundry 测试：
- 正常路径测试
- 边界条件测试  
- 失败路径测试
- Gas 基准测试"
```

## 环境变量配置

```bash
# ~/.claude/settings.json
{
  "model": "claude-opus-4-20241120",
  "max_tokens": 8192,
  "temperature": 0.3,
  "api_key": "sk-ant-..."  // 推荐用环境变量
}
```

## 自定义指令模板

### Solidity 审查模板
```
## Solidity 合约审查清单
- [ ] 合约继承关系是否正确
- [ ] 函数可见性是否最小权限
- [ ] 是否有非零地址检查
- [ ] 是否有 Pause 机制
- [ ] 授权是否检查了 approve 额度
- [ ] 是否使用了 SafeERC20
- [ ] 重入防护是否到位
- [ ] 数学运算是否防溢出
```

### React 组件模板
```
## React 组件规范
- 使用 TypeScript，props 要有类型
- 使用 React Query 做数据获取
- 使用 Zustand 做状态管理
- 错误边界要处理
- Loading/Error/Success 三状态
- 响应式设计（移动优先）
```

## 生产力技巧

1. **常用任务存为脚本**：频繁执行的任务写成 `claude-xxx.sh`
2. **CLAUDE.md 要具体**：越详细的规范，Claude 执行越准确
3. **设置快捷别名**：
   ```bash
   alias cc="claude"
   alias ccr="claude-review"
   alias cct="claude-test"
   ```
4. **会话存档**：重要项目决策记录到 `docs/DECISIONS.md`
