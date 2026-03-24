---
title: "Rebasing 池子是什么？弹性供应代币的 AMM 挑战"
date: 2026-03-21T11:30:00+08:00
description: "深入理解 Rebasing 代币的工作原理、AMM 池子的特殊挑战，以及如何正确处理弹性供应代币的流动性"
tags: ["Rebasing", "弹性供应", "AMM", "DeFi"]
categories: ["技术指南"]
draft: false
---

## 什么是 Rebasing 代币

Rebasing（弹性供应）代币是一种**供应量会自动调整**的加密货币机制。通过算法定期调整总流通量，以达到目标价格或分配奖励。

### 核心机制

| 场景 | 操作 | 效果 |
|------|------|------|
| 价格高于目标 | 正向 Rebase（+supply） | 代币数量增加，单价下降 |
| 价格低于目标 | 负向 Rebase（-supply） | 代币数量减少，单价上升 |

**关键点**：用户的持币比例保持不变，但绝对数量会变化。

### 代表项目

- **AMPL**：最早的弹性供应稳定币，目标是 $1
- **aToken**（Aave）：存款产生利息时数量增加
- **stETH**：质押收益体现为代币数量增长

## Rebasing 池子的特殊挑战

### 传统 AMM 的问题

标准 AMM（如 Uniswap V2/V3）假设代币供应是**固定或可预测变化**的。当 Rebasing 代币的供应突然变化时：

```
案例：池中有 1000 AMPL + 1000 USDC

正向 Rebase 后：AMPL 供应变为 1100（+10%）
    
传统 AMM 认知：
→ 误判为需求减少 → AMPL 价值被低估
→ LP 遭受" divergence loss"
```

### 问题本质

1. **价值泄露**：AMM 无法识别"供应增加"还是"需求减少"
2. **无常损失加剧**：供应调整带来的额外波动
3. **池子偿付风险**：极端负向 Rebase 可能导致池子资不抵债

## 解决方案：专用 AMM

### 1. ElasticSwap

专为弹性供应代币设计的 AMM，能正确感知 Rebase 事件：

```solidity
// ElasticSwap 核心逻辑
function _update() {
    // 识别 Rebase 事件
    uint256 totalSupplyBefore = totalSupply();
    uint256 rebaseAmount = getRebaseDelta();
    
    // 调整池子参数而非错误定价
    if (rebaseAmount != 0) {
        adjustForRebase(rebaseAmount);
    }
}
```

### 2. Poolside

专门优化 Rebasing 和价值累积代币的 AMM：
- 正确整合弹性供应资产
- 防止价值泄露
- 保护 LP 免受非预期损失

## LP 注意事项

### 风险

1. **Rebase 风险**：不一定直接获得正向 Rebase 收益
2. **定价偏差**：传统池子可能持续低价
3. **池子失效**：极端负 Rebase 导致流动性枯竭

### 建议

- 优先选择**支持 Rebasing 的专用 AMM**
- 仔细阅读协议文档
- 监控 Rebase 历史数据
- 控制仓位，不要 all-in

## 实际案例

### AMPL 在 Uniswap V2

早期 AMPL 在标准 AMM 上经历了严重问题：
- 每次 Rebase 后价格大幅波动
- LP 遭受系统性无常损失
- 最终社区转向专用池

### stETH/ETH 池

Lido 的 stETH 是典型的价值累积代币：
- 随着 ETH 质押收益增加，stETH 数量会增长
- Curve 专门设计了针对性的池子
- 需要特殊机制处理"预期增长"

## 总结

Rebasing 代币代表了**代币经济学的新范式**——通过动态供应调节价格或分配收益。但它们对 AMM 提出了全新挑战，传统DEX无法正确处理弹性供应。

**记住**：
- 不是所有池子都适合 Rebasing 代币
- 专用 AMM 是解决方案
- LP 需要理解 Rebase 机制才能避免坑

---

**相关阅读**：
- [AMM 原理详解](/dex-bok/posts/01-amm-principles/)
- [无常损失深度解析](/dex-bok/posts/08-impermanent-loss/)
