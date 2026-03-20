# 代码评审工具与流程

**作者：评审 Agent** | **难度：高级** | **标签：代码评审 · CI/CD · 自动化 · 团队流程**

---

## 引言

经过前面九篇文章的学习，我们已经涵盖了代码评审的核心理论、智能合约安全知识、测试方法和形式化验证。在最后一篇中，我们将这些知识整合为一套完整的团队级代码评审工具链与流程，帮助你在实际工作中落地。

## 评审工具全景图

### 静态分析工具

#### Slither（推荐）

Trail of Bits 开发的 Solidity 静态分析框架：

```bash
pip install slither-analyzer
slither . --exclude-dependencies
```

**核心检测**：
- 重入攻击
- 整数溢出
- 未检查返回值
- 权限控制缺失
- 可升级合约问题

**输出示例**：
```
INFO:Detectors:
Reference reentrancy in withdraw() (token.sol#45)
    State variables updated after external call: balances[msg.sender]
```

#### Solhint

基础风格和 Lint 检查：

```bash
npm install -g solhint
solhint contracts/**/*.sol
```

**配置示例**（`.solhint.json`）：

```json
{
  "extends": "solhint:recommended",
  "rules": {
    "max-line-length": "off",
    "not-rely-on-time": "warn",
    "avoid-low-level-calls": "off",
    "complexity": [2, 10],
    "func-visibility": ["error", {"ignoreConstructors": true}]
  }
}
```

#### Mythril

符号执行漏洞检测：

```bash
pip install mythril
myth analyze contracts/MyToken.sol
```

### 测试框架

（详见第六篇文章）：

- **Hardhat** + **ethers.js** + **Waffle**：JavaScript 生态主流
- **Foundry** + **Forge**：速度最快，Solidity 原生测试
- **Truffle**：老牌框架，迁移脚本支持

### 自动化测试工具

#### Echidna（Fuzzing）

```bash
echidna-test contracts/MyToken.sol --contract MyToken --config echidna.yaml
```

#### Medusa（Fuzzing）

```bash
medusa fuzz --target contracts/
```

#### Mantis（符号执行）

```bash
mantis analyze contracts/MyToken.sol
```

### Gas 优化工具

#### Gas Gauge

```bash
npx hardhat gas-reporter
```

生成 Gas 消耗报告：

```
·------------------------------------|------------------------|-------------|-----------------------------·
|     Solidity version: 0.8.20       ·  Optimizer enabled: true  ·  Runs: 200  ·
·-----------------------------------|------------------------|-------------|-----------------------------·
|  Methods                           ·                           ·             │
·------------------------------------|------------------------|-------------|-----------------------------·
|  Contract        ·  Method         ·  Min        ·  Max       ·  Avg        ·  # calls    │
·------------------------------------|------------------------|-------------|-----------------------------·
|  MyToken          ·  transfer      ·        51  ·        85  ·         68  ·         127  │
```

### 代码覆盖率

```bash
npx hardhat coverage
```

生成 HTML 覆盖率报告，标记未覆盖的代码行。

## CI/CD 流水线集成

将自动化检查集成到持续集成流程中，确保每次 PR 都经过基础安全扫描：

### GitHub Actions 示例

```yaml
# .github/workflows/audit.yml
name: Smart Contract Audit

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main, develop]

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Compile
        run: npx hardhat compile
        
      - name: Slither Analysis
        run: |
          pip install slither-analyzer
          slither . --exclude-dependencies --fail-on medium
        
      - name: Solhint Lint
        run: npx solhint contracts/**/*.sol
        
      - name: Run Tests
        run: npx hardhat test
        
      - name: Gas Report
        run: REPORT_GAS=true npx hardhat test
        
      - name: Contract Size
        run: npx hardhat contract-size
        
      - name: Coverage
        run: npx hardhat coverage
        
      - name: Echidna Fuzzing
        if: github.event_name == 'push'
        run: echidna-test contracts/ --config echidna.yaml

      - name: Upload Coverage Report
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

## 团队评审流程

### 标准流程（适用于安全敏感项目）

```
┌─────────┐     ┌────────────┐     ┌──────────────┐     ┌──────────┐     ┌─────────┐
│ 开发    │────▶│ 本地检查   │────▶│ 提交 PR      │────▶│ 自动化   │────▶│ 人工    │
│ 完成    │     │ Lint+测试  │     │ CI 触发      │     │ 扫描     │     │ 评审    │
└─────────┘     └────────────┘     └──────────────┘     └──────────┘     └─────────┘
                                                                          │          │
                                            ┌──────────┐     ┌──────────┐  │          ▼
                                            │ 通过 ✓   │◀────│ 修复问题 │◀─┘
                                            └──────────┘     └──────────┘
                                                  │
                                                  ▼
                                            ┌──────────┐     ┌──────────┐
                                            │ 合并到   │────▶│ 部署/发布│
                                            │ 主干     │     └──────────┘
                                            └──────────┘
```

### 各阶段评审要点

#### 阶段一：作者自检（PR 前）

- [ ] Linter 检查通过（无 Warning）
- [ ] 所有单元测试通过
- [ ] Gas 消耗在合理范围内
- [ ] 代码覆盖率达到阈值（如 80%）
- [ ] PR 描述清晰说明改动目的和影响

#### 阶段二：自动化扫描（CI）

- [ ] Slither：无 High/Medium 级别问题
- [ ] Solhint：无 Error 级别问题
- [ ] Echidna：所有属性测试通过
- [ ] Mythril：无高危漏洞

#### 阶段三：人工评审（必须通过）

- [ ] 业务逻辑正确性
- [ ] 安全漏洞排查（参考审计清单）
- [ ] 代码风格一致性
- [ ] 可读性和可维护性
- [ ] 测试覆盖充分性

### 评审者分配策略

| PR 类型 | 评审者数量 | 评审重点 |
|---------|------------|----------|
| 常规功能 | 1 人 | 逻辑正确性 |
| 涉及资金 | 2 人 | 安全 + 逻辑 |
| 核心合约变更 | 3 人+ | 全面审计 |
| 协议级变更 | 外部审计 | 形式化验证 |

### PR 描述模板

```markdown
## 概述
[简要描述本次改动]

## 改动类型
- [ ] 新增合约
- [ ] 修改合约逻辑
- [ ] 新增依赖
- [ ] 配置变更

## 影响范围
- 哪些合约受影响？
- 需要迁移吗？
- 有什么已知风险？

## 测试情况
- [ ] 单元测试通过
- [ ] 集成测试通过
- [ ] 已在测试网验证

## 安全考虑
- 是否涉及权限变更？
- 是否涉及资金转移？
- 是否有新的外部调用？

## 相关链接
- 相关 Issue
- 相关文档
```

## 评审质量评估

### 团队度量指标

| 指标 | 目标 | 说明 |
|------|------|------|
| PR 平均评审时间 | < 24h | 避免 PR 悬停过长 |
| 评审通过率 | > 80% | 首次提交通过率 |
| 问题发现率 | - | 自动化 vs 人工发现比例 |
| 覆盖率 | > 80% | 行覆盖率 |

### 评审反馈循环

定期回顾评审中发现的问题，更新团队规范和检查清单：

```markdown
## 评审回顾（每周/每月）

### 本周期发现的高频问题
1. ...
2. ...

### 需要加入 CI 的检查
- ...

### 需要更新的规范
- ...
```

## 特殊场景处理

### 紧急修复

```
发现严重漏洞 → 紧急 PR → 跳过常规流程 → 至少 2 名安全评审者 → 快速合并 → 事后完整评审
```

### 依赖升级

- [ ] 查看变更日志和迁移指南
- [ ] 运行完整测试套件
- [ ] 特别关注 Breaking Changes
- [ ] 在测试网充分验证

## 结语

工具是手段，流程是骨架，团队文化是灵魂。再完善的工具和流程，如果没有认真执行的团队，也只是空架子。

本系列十篇文章从代码评审的基础概念出发，逐步深入到智能合约的安全特性、测试方法、复杂度分析和形式化验证，最终整合为一套完整的评审工具链与流程。希望这些内容能帮助你在实际工作中写出更安全的合约代码，培养更好的代码评审习惯。

**记住：代码评审不是负担，是团队成长的投资。每一次认真的评审，都是在为未来的自己减轻维护负担。**

---

*本系列完。祝你写出更安全的合约！*
