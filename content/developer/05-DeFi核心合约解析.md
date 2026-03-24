# DeFi 核心合约解析：AMM、借贷与收益聚合

## DeFi 的三大支柱

去中心化金融（DeFi）由三类核心协议构成：**去中心化交易所（DEX）**、**借贷协议**和**收益聚合器**。理解这三类协议的合约设计，是成为 DeFi 开发者的必经之路。

## 一、AMM 去中心化交易所

### 什么是 AMM

自动做市商（Automated Market Maker, AMM）用**数学公式**替代传统订单簿，由流动性池按公式定价。与传统做市商相比，AMM 无需人工报价，任何人都可以向池子注入流动性成为"做市商"。

### 恒定乘积公式（Uniswap V2）

Uniswap V2 采用最经典的 `x * y = k` 公式：

```solidity
// 核心做市逻辑
function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) 
    public pure returns (uint256 amountOut) 
{
    require(amountIn > 0, "INSUFFICIENT_INPUT_AMOUNT");
    require(reserveIn > 0 && reserveOut > 0, "INSUFFICIENT_LIQUIDITY");
    
    uint256 amountInWithFee = amountIn * 997; // 0.3% 手续费
    uint256 numerator = amountInWithFee * reserveOut;
    uint256 denominator = reserveIn * 1000 + amountInWithFee;
    amountOut = numerator / denominator;
}
```

**核心特性**：

| 特性 | 说明 |
|------|------|
| `x * y = k` | 价格公式，k 恒定（忽略手续费时） |
| 0.3% 手续费 | 每笔交易扣除，作为流动性提供者收益 |
| 无常损失 | 流动性提供者的持仓价值可能低于简单持有 |

### 恒定乘积曲线的价格特性

当 `x/y = 1` 时价格约为 1:1。若大量买入 Token A：

```
假设初始：reserveX = 1000, reserveY = 1000, k = 1,000,000
买入 100 X：
newReserveX = 1100
newReserveY = k / 1100 = 909.09
付出 Y = 1000 - 909.09 = 90.91
实际价格 = 90.91/100 = 0.909（滑点约9%）
```

滑点随交易规模增大而急剧上升，这是 AMM 的固有特性。

### Uniswap V3 流动性集中

Uniswap V3 引入了**流动性集中**概念，允许 LP 将资金部署在特定价格区间内，大幅提升资本效率。

## 二、借贷协议（以 Aave 为例）

### 核心机制：抵押借贷

Aave 的核心逻辑：**超额抵押**——用户存入抵押物（ETH/USDC等），借出其他资产。

### 健康因子

健康因子（Health Factor）是借贷协议的核心安全指标：

```
Health Factor = Σ(抵押物价值 × 清算阈值) / 借款总价值

清算阈值：通常为 0.85（85%）
清算触发线：HF < 1.0
```

当 HF 低于 1.0 时，任何人都可以触发**清算流程**——清算人以折扣价买走抵押物，借款人遭受损失。

## 三、收益聚合器（Yearn/Aave Vaults）

### 为什么需要收益聚合器

DeFi 协议众多，收益率各异且持续变化。普通用户难以判断最优策略，收益聚合器自动帮用户寻找并执行最佳策略。

### Yearn Vault 的工作原理

Yearn Vault 将用户资金聚合成一个池子，通过策略自动寻找最优收益来源。

## DeFi 合约开发注意事项

| 方面 | 注意事项 |
|------|---------|
| 精度处理 | Solidity 无小数，利率计算需用 `Wad`（10^18）精度 |
| 重入攻击 | 使用 CEI（Checks-Effects-Interactions）模式防重入 |
| 预言机价格 | 使用 TWAP（时间加权平均价）防止价格操纵 |
| 权限控制 | 多签钱包管理协议参数，定期审计 |
| 紧急暂停 | 预留 Circuit Breakers 机制应对极端行情 |

## 总结

三大 DeFi 协议类型各有特点：AMM 用数学公式做市，借贷协议靠超额抵押实现去中心化借贷，收益聚合器则将复杂策略自动化。深入理解这些核心机制的设计权衡，是进阶 DeFi 开发的必经之路。