# 智能合约审计实战：从自检到专业审计

## 为什么需要审计

智能合约审计是对合约代码进行系统性安全检查的过程，目的是在部署前发现并修复漏洞。2022 年 Web3 因安全问题损失超过 37 亿美元，**绝大多数损失本可以通过审计避免**。

## 目标合约：SimpleLending

本文以一个借贷协议的简化版本为例，演示从自检到专业审计的完整流程。

## 第一阶段：自检清单

### 快速检查清单

| ✅ | 检查项 | 说明 |
|----|--------|------|
| ⬜ | 重入保护 | 所有外部调用是否在状态更新后？是否使用 ReentrancyGuard？ |
| ⬜ | 权限控制 | onlyOwner 修饰器是否正确使用？构造函数是否调用 _disableInitializers？ |
| ⬜ | 输入验证 | 零值检查、边界检查、状态检查 |
| ⬜ | 整数溢出 | Solidity 0.8+ 自动检查，或使用 SafeMath |
| ⬜ | 预言机 | 是否依赖外部价格？是否有操控风险？ |
| ⬜ | 事件 | 所有状态变更是否触发事件？ |
| ⬜ | 错误处理 | revert 消息是否清晰？ |
| ⬜ | 代理兼容性 | 是否有 initializer？存储是否安全？ |

## 第二阶段：工具扫描

### Slither 静态分析

```bash
# 安装
pip install slither-analyzer

# 运行
slither . --exclude-dependencies
```

### Mythril 符号执行

```bash
pip install mythril
myth analyze contracts/SimpleLending.sol
```

## 第三阶段：手动审计要点

### 漏洞 1：repay 函数的部分还款逻辑缺陷

```solidity
// 问题代码
if (amount >= col.borrowedAmount) {
    col.borrowedAmount = 0;
} else {
    col.borrowedAmount -= amount;
}

totalBorrowed[token] -= amount; // 潜在问题：未考虑部分还款
```

**修复建议**：

```solidity
uint256 toRepay = amount >= col.borrowedAmount ? col.borrowedAmount : amount;
col.borrowedAmount -= toRepay;
totalBorrowed[token] -= toRepay;
```

### 漏洞 2：liquidation 函数边界检查缺失

```solidity
// 问题：清算比例可能超过抵押物数量
uint256 collateralToLiquidate = repayAmount * BPS / collateralFactor[collateral];
// 应该检查：collateralToLiquidate <= col.amount
```

## 第四阶段：审计报告结构

专业审计报告通常包含：

```
## 项目概述
- 项目名称
- 合约列表
- 审计范围

## 发现的漏洞
### 高危
- [H-01] 标题
- 影响描述
- 详细分析
- 概念验证代码
- 修复建议

### 中危
...

### 低危
...
```

## 审计资源与工具

| 工具/资源 | 用途 |
|-----------|------|
| Slither | 静态分析，自动检测常见漏洞模式 |
| Mythril | 符号执行，发现复杂漏洞 |
| Echidna | 模糊测试，属性检查 |
| Surya | 可视化合约结构 |
| OZ Contracts | 经验证的安全实现库 |

## 总结：审计的最佳实践

1. **代码冻结前审计**：审计应在部署前完成，而非之后补救
2. **多次审计**：重大版本更新后重新审计
3. **Bug Bounty**：主网上线后配合赏金计划
4. **渐进式发布**：先小TVL试运行，逐步扩大规模
5. **监控告警**：部署后持续监控异常活动

记住：**没有任何审计能保证 100% 无漏洞**，但专业的审计能发现绝大多数问题。审计不是终点，安全是一个持续的过程。

---

**10 篇博客系列到此完结。从编程入门到智能合约审计，我们涵盖了区块链开发者需要掌握的核心知识体系。祝你的 DeFi 开发之旅一路顺风！**