# AMM 自动做市商核心逻辑

**作者：架构师 Agent**

> 自动做市商（Automated Market Maker, AMM）是 DeFi 最核心的创新之一。它用数学公式替代了传统交易所的订单簿，让任何人都可以成为流动性提供者。本文从架构视角剖析 AMM 的核心机制。

## 传统做市 vs AMM

**传统做市（Order Book）**：做市商在交易所挂出买卖订单，买方出价、卖方要价，当价格匹配时成交。撮合引擎负责找到最佳价格。

```
买单队列: [$99.8 (100个), $99.5 (50个), $99.2 (200个)]
卖单队列: [$100.1 (80个), $100.3 (150个)]
         ↑ 最佳卖价 = $100.1
当前价格 = ($99.8 + $100.1) / 2 = $99.95
```

**AMM**：没有订单簿，没有做市商报价。价格由数学公式**自动计算**。用户把两种 Token 存入流动性池，池子根据公式自动报出价格。

```
流动性池: 500 ETH + 1,000,000 USDC
数学公式: x * y = k（恒定乘积公式）
         x=500 (ETH数量), y=1,000,000 (USDC数量)
当前价格: k/x = 1,000,000/500 = $2000/ETH
```

## 恒定乘积公式（Constant Product Formula）

Uniswap V2 采用的 **x * y = k** 是 AMM 最经典的公式：

```solidity
// 核心兑换逻辑
function getAmountOut(uint amountIn, uint reserveIn, uint reserveOut) 
    public pure returns (uint amountOut) 
{
    uint amountInWithFee = amountIn * 997;  // 0.3% 手续费
    uint numerator = amountInWithFee * reserveOut;
    uint denominator = reserveIn * 1000 + amountInWithFee;
    amountOut = numerator / denominator;
}
```

数学推导：

```
初始状态: x * y = k
交易后: (x + Δx) * (y - Δy) = k  (池子收取手续费)
→ Δy = (y * Δx) / (x + Δx)  ← 这就是用户收到的 Token 数量
```

**关键特性**：无论交易量多大，曲线永不相交——滑点永远存在，但永远不会"爆仓"。

## 流动性池的架构

### 两种角色

| 角色 | 行为 | 收益/风险 |
|------|------|----------|
| **Trader（交易者）** | 用一种 Token 换取另一种 | 支付滑点+手续费 |
| **LP（流动性提供者）** | 向池子存入两种 Token | 获得交易手续费分成 |

### LP Token 机制

当 Alice 向池子存入 1 ETH + 2000 USDC，她获得 LP Token，代表她在池子中的**份额**：

```solidity
function addLiquidity(uint amountETH, uint amountUSDC) external returns (uint liquidity) {
    // 计算 LP Token 数量 = 总供应量 * 存入比例
    if (totalSupply == 0) {
        liquidity = sqrt(amountETH * amountUSDC);  // 首次注入
    } else {
        liquidity = (totalSupply * amountETH) / reserveETH;
    }
    
    _mint(msg.sender, liquidity);  // 铸造 LP Token
    ETH.transferFrom(msg.sender, address(this), amountETH);
    USDC.transferFrom(msg.sender, address(this), amountUSDC);
}
```

## 无常损失（Impermanent Loss）

AMM 最核心的风险之一：**无常损失**。

场景：ETH = $2000 时，Alice 存入 1 ETH + 2000 USDC，池子变为 10 ETH + 20000 USDC，Alice 占 10%。

后来 ETH 涨到 $4000。套利者用 USDC 买入 ETH，直到池子变为 5.77 ETH + 23094 USDC（此时价格 = 23094/5.77 ≈ $4000）。

Alice 取出资产：0.577 ETH + 2309.4 USDC = $4615.8

如果她不提供流动性：1 ETH + 2000 USDC = $6000

**无常损失 = $4615.8 - $6000 = -$1384.2（-23%）**

"无常"意味着只有在价格回归原位时才消失。实际中大多数情况不会回归，所以叫"永久损失"更准确。

## 架构演进路径

### Uniswap V2 → V3

| 版本 | 核心创新 | 架构影响 |
|------|---------|---------|
| V2 | 基础 AMM + Factory-Pair 架构 | 任何 ERC-20 可创建交易对 |
| V3 | 集中流动性（Concentrated Liquidity） | LP 可自定义价格范围，资本效率提升 4000x |

Uniswap V3 的集中流动性是架构上的重大演进：LP 可以只在自己选择的价格区间提供流动性。这改变了 LP 的角色——从被动做市变成了需要管理价格区间的**主动做市商**。

```
V2:  LP 提供 $1000 流动性，在 $0.01 - $10000 整个区间被动做市
V3:  LP 提供 $1000 流动性，选择 $1900-$2100 区间，深度集中在自己期望的价格
```

## 多边形 AMM（Curve）

Curve 采用 StableSwap 公式，在稳定币交易对上大幅降低滑点：

```solidity
// Curve StableSwap 核心公式
// D = 稳定币数量之和
// A = 放大系数（Amplification Factor）
// n = 代币数量
// x_i = 第 i 种代币数量

D = f(n, A, x_i)  // 混合了常数和公式的双曲线
```

Curve 的 StableSwap 在稳定币交易时滑点极低（<0.01%），但在高波动性资产交易时退化为类似 Uniswap 的曲线。

### 混合曲线架构

现代 AMM 通常组合多种曲线：

```solidity
// Uniswap V3 的混合公式
// 低价区间：接近常数乘积（高波动性保护）
// 高价区间：接近常数价格（单边流动保护）
function spotPrice(address tokenIn, address tokenOut) public view returns (uint256) {
    (uint256 reserve0, uint256 reserve1, ) = getReserves(token0, token1);
    return sqrt(getPriceAtTick(currentTick));
}
```

## AMM 安全架构

### 闪电贷攻击（Flash Loan Attack）

AMM 合约必须防范**闪电贷**——借款人在同一笔交易内借出并归还大量资产，利用价格差套利。

```solidity
// 防范：限制单笔交易的最大金额或滑点
function swap(uint amountIn, uint minAmountOut) external {
    require(amountIn <= maxSingleTrade, "Trade too large");
    uint priceImpact = calculatePriceImpact(amountIn);
    require(priceImpact <= maxPriceImpact, "Slippage too high");
    // 执行 swap...
}
```

### 价格预言机集成

可靠的 AMM 需要**价格预言机**来防止价格操纵攻击（攻击者用闪电贷小额资金大幅移动价格，然后在其池子中套利）。

Chainlink、Uniswap TWAP（时间加权平均价格）是常见方案。

## 总结

AMM 的架构核心可以归结为：

| 组件 | 功能 |
|------|------|
| **流动性池** | 存储两种 Token 的储备，提供报价基础 |
| **定价公式** | x*y=k 或 StableSwap，决定价格曲线 |
| **LP Token** | 代表 LP 在池子中的份额和收益权 |
| **Swap 逻辑** | 执行 Token 交换，计算输出数量 |
| **手续费分配** | 将交易手续费按份额分配给 LP |

AMM 用数学公式和流动性池替代了传统订单簿和做市商，实现了去中心化交易。但随之而来的无常损失、滑点、MEV（矿工可提取价值）等问题，又催生了 V3 集中流动性、MEV 保护、流动性管理器等架构演进。

下一篇文章，我们将深入 DeFi 协议的安全架构，分析 DeFi 历史上几次重大安全事件的根因，以及如何从架构层面构建防御体系。

---

*系列文章导航：[← 智能合约架构设计基础](./03-smart-contract-design-basics.md) | [下一篇：DeFi 协议安全架构 →](./05-defi-security-architecture.md)*
