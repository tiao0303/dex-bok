---
title: "DeFi 量化策略 - 套利与做市实战完全指南"
date: 2026-03-19T14:00:00+08:00
description: "深入分析 DeFi 量化交易策略，包括三角套利、流动性做市、资金费率套利，提供完整代码实现与风险控制方案"
tags: ["DeFi", "量化", "套利", "做市", "策略"]
categories: ["量化交易"]
draft: false
---

## 前言

DeFi 市场的低效性为量化交易者创造了大量机会。本文将深入分析主流量化策略，提供可落地的代码实现，并探讨风险控制方法。

## 一、套利策略全景图

### 1.1 主要套利类型

| 策略类型 | 利润来源 | 复杂度 | 资金要求 |
|----------|----------|--------|----------|
| 跨DEX套利 | 价格差 | ⭐⭐ | 中 |
| 三角套利 | 汇率差 | ⭐⭐⭐ | 低 |
| 资金费率套利 | 资金费差额 | ⭐⭐⭐ | 高 |
| 跨链套利 | 跨链价差 | ⭐⭐⭐⭐⭐ | 高 |
| 期现套利 | 期货溢价 | ⭐⭐ | 中 |

## 二、跨DEX三角套利策略

### 2.1 策略原理

利用三个交易对之间的价格不平衡进行无风险获利：

```
路径：ETH → USDC → USDT → ETH

1. 用 ETH 换 USDC（DEX A）
2. 用 USDC 换 USDT（DEX B）
3. 用 USDT 换 ETH（DEX C）

如果：汇率乘积 ≠ 1，则存在利润
profit = initial_amount × (rate1 × rate2 × rate3 - 1)
```

**数学公式**：

$$
\text{利润率} = \frac{ETH_{out}}{ETH_{in}} - 1
$$

最优路径需要满足：

$$
\prod_{i=1}^{n} r_i > 1 + \text{gas\_cost}
$$

### 2.2 完整代码实现

```typescript
import { ethers } from 'hardhat';
import IUniswapV2Router02 from '@uniswap/v2-periphery/build/IUniswapV2Router02.json';
import IUniswapV2Factory from '@uniswap/v2-core/build/IUniswapV2Factory.json';

// 三角套利机器人
class TriangleArbitrageBot {
    private routerA: ethers.Contract;  // Uniswap
    private routerB: ethers.Contract;  // Sushiswap  
    private routerC: ethers.Contract;  // PancakeSwap
    
    private WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
    private USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
    private USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
    
    // 最小利润阈值（防止 MEV 被抢）
    private minProfit = ethers.utils.parseEther('0.01');
    private gasLimit = 500000;
    
    constructor(
        private signer: ethers.Wallet,
        routerAddresses: string[]
    ) {
        this.routerA = new ethers.Contract(
            routerAddresses[0], 
            IUniswapV2Router02.abi, 
            signer
        );
        this.routerB = new ethers.Contract(
            routerAddresses[1], 
            IUniswapV2Router02.abi, 
            signer
        );
        this.routerC = new ethers.Contract(
            routerAddresses[2], 
            IUniswapV2Router02.abi, 
            signer
        );
    }
    
    /**
     * 获取三个DEX的价格
     */
    async getPrices() {
        // ETH -> USDC (路径: ETH→USDC)
        const pathA = [this.WETH, this.USDC];
        const amountsOutA = await this.routerA.getAmountsOut(
            ethers.utils.parseEther('1'),
            pathA
        );
        
        // USDC -> USDT
        const pathB = [this.USDC, this.USDT];
        const amountsOutB = await this.routerB.getAmountsOut(
            amountsOutA[1],
            pathB
        );
        
        // USDT -> ETH
        const pathC = [this.USDT, this.WETH];
        const amountsOutC = await this.routerC.getAmountsOut(
            amountsOutB[1],
            pathC
        );
        
        return {
            ethToUsdc: amountsOutA[1],
            usdcToUsdt: amountsOutB[1],
            usdtToEth: amountsOutC[1],
            totalOutput: amountsOutC[1],
            profit: amountsOutC[1].sub(ethers.utils.parseEther('1'))
        };
    }
    
    /**
     * 执行三角套利
     */
    async executeArbitrage(amountIn: BigNumber) {
        // 1. 授权代币
        await this.approveTokens();
        
        // 2. 构建多路径交易
        const paths = [
            [this.WETH, this.USDC],  // ETH → USDC
            [this.USDC, this.USDT],  // USDC → USDT
            [this.USDT, this.WETH]   // USDT → ETH
        ];
        
        // 3. 闪电 Swap
        const amounts = await this.routerA.getAmountsOut(amountIn, paths[0]);
        
        // 在单笔交易中执行完整路径
        const tx = await this.routerA.swapExactETHForTokens(
            0,  // 接受任意输出
            paths.flat(),
            this.signer.address,
            Math.floor(Date.now() / 1000) + 300,
            {
                value: amountIn,
                gasLimit: this.gasLimit
            }
        );
        
        return tx.wait();
    }
    
    /**
     * 监控循环
     */
    async startMonitoring() {
        console.log('🔍 三角套利监控启动...');
        
        setInterval(async () => {
            try {
                const prices = await this.getPrices();
                
                // 检查是否有利润
                if (prices.profit.gt(this.minProfit)) {
                    console.log(`📈 发现套利机会！`);
                    console.log(`   预计利润: ${ethers.utils.formatEther(prices.profit)} ETH`);
                    
                    // 检查 Gas 是否划算
                    const gasCost = await this.estimateGasCost();
                    if (prices.profit.gt(gasCost)) {
                        console.log('✅ Gas 划算，执行套利...');
                        await this.executeArbitrage(
                            ethers.utils.parseEther('1')
                        );
                    }
                }
            } catch (error) {
                console.error('❌ 监控错误:', error);
            }
        }, 3000);  // 每3秒检查一次
    }
    
    private async estimateGasCost(): Promise<BigNumber> {
        const gasPrice = await this.signer.provider!.getGasPrice();
        return gasPrice.mul(this.gasLimit);
    }
    
    private async approveTokens() {
        // 授权逻辑
    }
}
```

### 2.3 Gas 优化技巧

```typescript
// 批量获取价格 - 使用 Multicall
const multicall = new ethers.Contract(
    '0xeefBa1e63905eF1D7ACbA5Bd8517194e5E6B913e',
    ['function aggregate((address,bytes)[]) view returns (uint256,bytes[])'],
    this.signer
);

const calls = [
    [routerA.address, routerA.interface.encodeFunctionData('getAmountsOut', [amount, path1])],
    [routerB.address, routerB.interface.encodeFunctionData('getAmountsOut', [amount, path2])],
    [routerC.address, routerC.interface.encodeFunctionData('getAmountsOut', [amount, path3])],
];

const [, results] = await multicall.aggregate(calls);
```

## 三、流动性做市策略

### 3.1 被动做市策略

最基础的做市策略 - 在固定价格区间提供流动性：

```typescript
import { Position } from '@uniswap/v3-sdk';

// 被动做市策略
class PassiveMarketMaker {
    private positionManager: ethers.Contract;
    
    /**
     * 在当前价格附近提供流动性
     * @param token0 Token0 地址
     * @param token1 Token1 地址
     * @param fee 手续费等级 (3000 = 0.3%)
     * @param width 价格区间宽度（百分比）
     */
    async provideLiquidity(
        token0: string,
        token1: string,
        fee: number,
        width: number,  // 如 2% = 200
        amount0: BigNumber,
        amount1: BigNumber
    ) {
        // 1. 获取当前价格
        const pool = await this.getPool(token0, token1, fee);
        const slot0 = await pool.slot0();
        const currentPrice = slot0.sqrtPriceX96;
        
        // 2. 计算价格区间
        const tickSpacing = await pool.tickSpacing();
        const currentTick = slot0.tick;
        
        const priceLower = currentPrice.mul(10000 - width * 50).div(10000);
        const priceUpper = currentPrice.mul(10000 + width * 50).div(10000);
        
        const tickLower = this.priceToTick(priceLower, tickSpacing);
        const tickUpper = this.priceToTick(priceUpper, tickSpacing);
        
        // 3. 授权代币
        await this.approveTokens();
        
        // 4. 添加流动性
        const params = {
            token0,
            token1,
            fee,
            tickLower,
            tickUpper,
            amount0Desired: amount0,
            amount1Desired: amount1,
            amount0Min: 0,
            amount1Min: 0,
            recipient: this.signer.address,
            deadline: Math.floor(Date.now() / 1000) + 600
        };
        
        const tx = await this.positionManager.mint(params);
        return tx.wait();
    }
    
    /**
     * 将价格转换为 Tick
     */
    private priceToTick(price: BigNumber, tickSpacing: number): number {
        const tick = Math.log(Number(price) / 2**96) / Math.log(1.0001);
        return Math.round(tick / tickSpacing) * tickSpacing;
    }
}
```

### 3.2 主动做市策略 - 动态区间调整

```typescript
/**
 * 主动做市策略：根据波动率动态调整区间
 */
class ActiveMarketMaker {
    private readonly VOLATILITY_PERIOD = 3600;  // 1小时
    private readonly RECENT_PERIOD = 300;       // 5分钟
    
    /**
     * 计算建议的做市区间
     */
    async calculateOptimalRange(
        pool: ethers.Contract
    ): Promise<{ tickLower: number; tickUpper: number; width: number }> {
        // 1. 获取历史价格数据
        const observations = await this.getHistoricalTicks(pool);
        
        // 2. 计算波动率
        const volatility = this.calculateVolatility(observations);
        
        // 3. 获取当前价格
        const slot0 = await pool.slot0();
        const currentTick = slot0.tick;
        
        // 4. 根据波动率计算区间宽度
        // 高波动 → 宽区间
        // 低波动 → 窄区间
        const width = Math.max(
            Math.min(volatility * 3, 2000),  // 最大 20%
            100                               // 最小 1%
        );
        
        const tickSpacing = await pool.tickSpacing();
        const halfWidth = Math.floor((currentTick * width / 10000) / tickSpacing) * tickSpacing;
        
        return {
            tickLower: currentTick - halfWidth,
            tickUpper: currentTick + halfWidth,
            width
        };
    }
    
    /**
     * 自动再平衡策略
     */
    async rebalanceIfNeeded(position: Position) {
        const range = await this.calculateOptimalRange(position.pool);
        
        // 如果当前区间与最优区间偏差超过 20%
        if (Math.abs(position.tickLower - range.tickLower) / range.width > 0.2 ||
            Math.abs(position.tickUpper - range.tickUpper) / range.width > 0.2) {
            
            console.log('🔄 检测到价格偏离，执行再平衡...');
            
            // 1. 移除当前流动性
            await this.removeLiquidity(position.tokenId);
            
            // 2. 在新区间提供流动性
            await this.provideLiquidityInRange(
                range.tickLower,
                range.tickUpper,
                position.amount0,
                position.amount1
            );
        }
    }
    
    private calculateVolatility(ticks: number[]): number {
        const returns = [];
        for (let i = 1; i < ticks.length; i++) {
            returns.push(Math.log(ticks[i] / ticks[i-1]));
        }
        
        // 计算标准差
        const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
        const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
        
        return Math.sqrt(variance) * Math.sqrt(365 * 24) * 100;  // 年化波动率 %
    }
}
```

### 3.3 资金费率套利策略

利用永续合约资金费率与借贷利率的差异：

```typescript
/**
 * 资金费率套利策略
 * 
 * 原理：
 * - 当资金费率为正：多头支付空头 → 做多现货，做空期货
 * - 当资金费率为负：空头支付多头 → 做空现货，做多期货
 */
class FundingRateArbitrage {
    private pool: ethers.Contract;      // 流动性池
    private perpetual: ethers.Contract; // 永续合约
    
    /**
     * 检查是否存在资金费率套利机会
     */
    async checkOpportunity(): Promise<{
        hasOpportunity: boolean;
        fundingRate: number;
        borrowRate: number;
        expectedProfit: BigNumber;
    }> {
        // 1. 获取当前资金费率
        const fundingRate = await this.perpetual.fundingRate();
        const fundingGrowth = await this.perpetual.fundingGrowthGlobal();
        
        // 2. 获取借贷利率
        const borrowRate0 = await this.pool.borrowRate0();
        const borrowRate1 = await this.pool.borrowRate1();
        
        // 3. 计算预期利润
        const positionSize = ethers.utils.parseEther('10');  // 10 ETH
        
        const fundingPayment = positionSize.mul(fundingRate).div(1e18);
        const borrowCost = positionSize.mul(borrowRate0).div(1e18);
        const expectedProfit = fundingPayment.sub(borrowCost);
        
        return {
            hasOpportunity: expectedProfit.gt(0),
            fundingRate: Number(ethers.utils.formatEther(fundingRate)),
            borrowRate: Number(ethers.utils.formatEther(borrowRate0)),
            expectedProfit
        };
    }
    
    /**
     * 执行资金费率套利
     * 
     * 步骤：
     * 1. 在现货市场做多/做空
     * 2. 在期货市场开相反方向头寸
     * 3. 持有期间获得资金费率收益
     * 4. 平仓时可能获得价差收益
     */
    async execute(
        isLong: boolean,      // 是否做多
        size: BigNumber
    ) {
        // 1. 闪电贷借款
        const [token0, token1] = await Promise.all([
            this.pool.token0(),
            this.pool.token1()
        ]);
        
        // 2. 在现货市场操作
        if (isLong) {
            // 做多：买入 token0，借入 token1
            await this.pool.borrow(token1, size);
            await this.exchange(token1, token0, size);
        } else {
            // 做空：买入 token1，借入 token0
            await this.pool.borrow(token0, size);
            await this.exchange(token0, token1, size);
        }
        
        // 3. 在期货市场开仓
        await this.perpetual.openPosition(
            isLong ? 1 : 2,  // 1 = long, 2 = short
            size,
            {
                gasLimit: 300000
            }
        );
        
        // 4. 监控并平仓
        // 实际实现中需要监控资金费率变化
    }
}
```

## 四、风险控制框架

### 4.1 策略级风险控制

```typescript
/**
 * 风险控制器
 */
class RiskController {
    // 最大单笔交易金额
    readonly maxTradeSize: BigNumber;
    
    // 最大总敞口
    readonly maxTotalExposure: BigNumber;
    
    // 最大滑点容忍
    readonly maxSlippage: number;  // 百分比
    
    // 最大 Gas 价格
    readonly maxGasPrice: BigNumber;
    
    // 连续亏损次数限制
    readonly maxConsecutiveLosses: number;
    
    private consecutiveLosses = 0;
    private totalProfit = BigNumber.from(0);
    
    /**
     * 交易前检查
     */
    async preTradeCheck(
        tradeSize: BigNumber,
        expectedSlippage: number,
        gasPrice: BigNumber
    ): Promise<{ approved: boolean; reason?: string }> {
        // 1. 检查交易规模
        if (tradeSize.gt(this.maxTradeSize)) {
            return { approved: false, reason: 'Exceeds max trade size' };
        }
        
        // 2. 检查滑点
        if (expectedSlippage > this.maxSlippage) {
            return { approved: false, reason: 'Exceeds max slippage' };
        }
        
        // 3. 检查 Gas 价格
        if (gasPrice.gt(this.maxGasPrice)) {
            return { approved: false, reason: 'Gas price too high' };
        }
        
        return { approved: true };
    }
    
    /**
     * 交易后更新统计
     */
    postTradeUpdate(profit: BigNumber) {
        if (profit.lt(0)) {
            this.consecutiveLosses++;
        } else {
            this.consecutiveLosses = 0;
        }
        
        this.totalProfit = this.totalProfit.add(profit);
        
        // 检查是否触发风控
        if (this.consecutiveLosses >= this.maxConsecutiveLosses) {
            console.log('⚠️ 触发最大连续亏损限制，暂停交易');
            return false;
        }
        
        if (this.totalProfit.lt(0)) {
            const lossRatio = this.totalProfit.abs().mul(100).div(this.maxTotalExposure);
            if (lossRatio.gt(50)) {
                console.log('⚠️ 累计亏损超过 50%，建议暂停');
            }
        }
        
        return true;
    }
    
    /**
     * 计算最优仓位大小
     */
    calculateOptimalSize(
        bankroll: BigNumber,
        winRate: number,
        avgWin: BigNumber,
        avgLoss: BigNumber
    ): BigNumber {
        // Kelly Criterion
        const kelly = (winRate * avgWin - (1 - winRate) * avgLoss) / avgWin;
        
        // 半 Kelly（更保守）
        const optimalFraction = kelly / 2;
        
        return bankroll.mul(Math.floor(optimalFraction * 10000)).div(10000);
    }
}
```

### 4.2 头寸管理

```typescript
/**
 * 头寸管理器
 */
class PositionManager {
    private positions: Map<string, Position> = new Map();
    
    /**
     * 分散化配置
     */
    private readonly MAX_POSITIONS = 5;
    private readonly MAX_EXPOSURE_PER_PAIR = 0.3;  // 30%
    
    /**
     * 开仓
     */
    async openPosition(
        pair: string,
        side: 'long' | 'short',
        size: BigNumber,
        entryPrice: BigNumber
    ) {
        // 1. 检查敞口限制
        await this.checkExposureLimits(pair, size);
        
        // 2. 记录头寸
        const position: Position = {
            id: this.generatePositionId(),
            pair,
            side,
            size,
            entryPrice,
            timestamp: Date.now(),
            stopLoss: this.calculateStopLoss(entryPrice, side),
            takeProfit: this.calculateTakeProfit(entryPrice, side)
        };
        
        this.positions.set(position.id, position);
        
        return position;
    }
    
    /**
     * 止损/止盈检查
     */
    async checkExitConditions(currentPrice: BigNumber): Promise<string[]> {
        const actions: string[] = [];
        
        for (const [id, pos] of this.positions) {
            // 止损检查
            if (pos.side === 'long' && currentPrice.lt(pos.stopLoss)) {
                actions.push(`CLOSE:${id}:STOP_LOSS`);
            } else if (pos.side === 'short' && currentPrice.gt(pos.stopLoss)) {
                actions.push(`CLOSE:${id}:STOP_LOSS`);
            }
            
            // 止盈检查
            if (pos.side === 'long' && currentPrice.gt(pos.takeProfit)) {
                actions.push(`CLOSE:${id}:TAKE_PROFIT`);
            } else if (pos.side === 'short' && currentPrice.lt(pos.takeProfit)) {
                actions.push(`CLOSE:${id}:TAKE_PROFIT`);
            }
        }
        
        return actions;
    }
    
    private calculateStopLoss(entryPrice: BigNumber, side: 'long' | 'short'): BigNumber {
        const slippage = side === 'long' 
            ? BigNumber.from(9500)  // 5% 止损
            : BigNumber.from(10500);
        
        return entryPrice.mul(slippage).div(10000);
    }
    
    private calculateTakeProfit(entryPrice: BigNumber, side: 'long' | 'short'): BigNumber {
        const multiplier = side === 'long'
            ? BigNumber.from(12000)  // 20% 止盈
            : BigNumber.from(8000);
        
        return entryPrice.mul(multiplier).div(10000);
    }
}
```

## 五、策略回测框架

```typescript
/**
 * 简单的回测框架
 */
async function backtest(
    strategy: TradingStrategy,
    data: PriceData[],
    initialCapital: BigNumber
): Promise<BacktestResult> {
    let capital = initialCapital;
    const trades: Trade[] = [];
    const equityCurve: number[] = [];
    
    for (let i = 1; i < data.length; i++) {
        const signal = await strategy.generateSignal(
            data.slice(0, i)
        );
        
        if (signal.action !== 'HOLD') {
            const cost = calculateTradingCost(
                signal.action === 'BUY' ? capital : capital,
                data[i].price
            );
            
            const pnl = signal.action === 'SELL' 
                ? capital.mul(data[i].price).div(data[i-1].price).sub(capital)
                : BigNumber.from(0);
            
            capital = capital.add(pnl);
            trades.push({
                entry: data[i-1],
                exit: data[i],
                pnl,
                action: signal.action
            });
        }
        
        equityCurve.push(Number(ethers.utils.formatEther(capital)));
    }
    
    return {
        totalReturn: capital.sub(initialCapital).mul(100).div(initialCapital),
        sharpeRatio: calculateSharpeRatio(equityCurve),
        maxDrawdown: calculateMaxDrawdown(equityCurve),
        winRate: trades.filter(t => t.pnl.gt(0)).length / trades.length,
        totalTrades: trades.length,
        equityCurve
    };
}
```

## 总结

DeFi 量化策略的核心要点：

1. **快速执行**：使用 Flashbots、MEV 保护避免滑点
2. **Gas 优化**：批量操作、多调用聚合
3. **风险控制**：始终设置止损，控制单币种敞口
4. **分散化**：多策略、多市场、多周期
5. **持续迭代**：市场效率提升需要策略不断进化

---

*DEX 博客深度内容系列到此告一段落。如果您对特定策略或技术细节有更多疑问，欢迎在评论区交流！*
