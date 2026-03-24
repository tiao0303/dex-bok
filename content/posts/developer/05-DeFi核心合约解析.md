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

Uniswap V3 引入了**流动性集中**概念，允许 LP 将资金部署在特定价格区间内，大幅提升资本效率：

```solidity
struct Position {
    uint256 tokenId;
    address liquidityOwner;
    int24 tickLower;      // 价格区间下界
    int24 tickUpper;      // 价格区间上界
    uint128 liquidity;    // 流动性数量
    // 结算未实现收益用
    uint256 feeGrowthInsideLast;
}
```

集中流动性让 LP 在低波动市场中获得更高收益，但同时也承担了**范围限制风险**——如果价格超出区间，LP 的头寸将变为纯单边持仓。

### 添加/移除流动性

```solidity
function addLiquidity(
    address tokenA,
    address tokenB,
    uint256 amountADesired,
    uint256 amountBDesired,
    uint256 amountAMin,
    uint256 amountBMin,
    address to,
    uint256 deadline
) external ensure(deadline) returns (uint256 amountA, uint256 amountB, uint256 liquidity) {
    // 计算实际数量（考虑滑点保护）
    (amountA, amountB) = _calculateLiquidityAmounts(
        tokenA, tokenB, amountADesired, amountBDesired, amountAMin, amountBMin
    );
    
    // 安全转账代币
    _safeTransfer(tokenA, from, to, amountA);
    _safeTransfer(tokenB, from, to, amountB);
    
    // 铸造流动性份额（类似 LP token）
    liquidity = _mintLiquidity(to);
}
```

## 二、借贷协议（以 Aave 为例）

### 核心机制：抵押借贷

Aave 的核心逻辑：**超额抵押**——用户存入抵押物（ETH/USDC等），借出其他资产。

```solidity
contract AavePool {
    // 用户存款
    mapping(address => mapping(address => uint256)) public supplies;
    // 用户借款
    mapping(address => mapping(address => uint256)) public borrows;
    // 整体利率模型
    InterestRateModel public interestRateModel;
    
    function supply(address asset, uint256 amount) external {
        // 1. 从用户账户划转资产到协议
        IERC20(asset).transferFrom(msg.sender, address(this), amount);
        
        // 2. 记录存款量
        supplies[msg.sender][asset] += amount;
        
        // 3. 按存款量铸造 aToken（1:1 锚定原资产）
        IAToken(asset).mint(msg.sender, amount);
        
        // 4. 更新全局利率
        _updateInterestRate(asset);
    }
    
    function borrow(address asset, uint256 amount) external {
        // 1. 健康因子检查：抵押物价值 / 借款价值 > 1.5
        require(
            _calculateHealthFactor(msg.sender) >= HEALTH_FACTOR_LIQUIDATION_THRESHOLD,
            "Health factor too low"
        );
        
        // 2. 计算可借额度（考虑借款上限）
        require(getAvailableBorrows(msg.sender, asset) >= amount, "Insufficient collateral");
        
        // 3. 转移资产给用户
        IERC20(asset).transfer(msg.sender, amount);
        borrows[msg.sender][asset] += amount;
        
        // 4. 触发利率累积
        _accrueInterest(asset);
    }
}
```

### 健康因子

健康因子（Health Factor）是借贷协议的核心安全指标：

```
Health Factor = Σ(抵押物价值 × 清算阈值) / 借款总价值

清算阈值：通常为 0.85（85%）
清算触发线：HF < 1.0
```

当 HF 低于 1.0 时，任何人都可以触发**清算流程**——清算人以折扣价买走抵押物，借款人遭受损失。

### 利率模型

利率由市场供需决定——借款利率随利用率上升而上涨：

```solidity
function calculateInterestRate(uint256 utilizationRate) public pure returns (uint256) {
    // 分段线性利率模型
    if (utilizationRate < U_OPTIMAL) {
        // 低利用率时，低利率鼓励借款
        return R_BASE + (utilizationRate * R_SLOPE1) / R_OPTIMAL;
    } else {
        // 高利用率时，高利率抑制借款，保护流动性
        uint256 excess = utilizationRate - R_OPTIMAL;
        return R_BASE + R_SLOPE1 + (excess * R_SLOPE2) / (1e4 - R_OPTIMAL);
    }
}
```

## 三、收益聚合器（Yearn/Aave Vaults）

### 为什么需要收益聚合器

DeFi 协议众多，收益率各异且持续变化。普通用户难以判断最优策略，收益聚合器自动帮用户寻找并执行最佳策略。

### Yearn Vault 的工作原理

```solidity
contract Vault is IERC4626 {
    // 策略分配
    mapping(IStrategy => uint256) public strategies;
    uint256 public totalDebt;
    
    // 存款：用户存入 underlying 资产，获得 share（份额代币）
    function deposit(uint256 assets, address receiver) external returns (uint256 shares) {
        uint256 supply = totalSupply();
        
        shares = supply == 0 
            ? assets  // 第一个存款人直接1:1
            : assets * supply / totalAssets();  // 按比例计算
        
        _mint(receiver, shares);
        _earn();  // 自动投入最佳策略
    }
    
    // 策略切换
    function _earn() internal {
        uint256 want = IERC20(underlying).balanceOf(address(this));
        
        // 分配到各个策略（按预设权重或绩效）
        for (uint i = 0; i < _strategies.length; i++) {
            uint256 amount = want * strategies[_strategies[i]] / 10000;
            IERC20(underlying).transfer(address(_strategies[i]), amount);
            _strategies[i].harvest();  // 收割收益，重新投资
        }
    }
    
    // 年度收益率计算（用于前端展示）
    function getEstimatedAPY() public view returns (uint256) {
        // 汇总各策略历史收益计算年化
    }
}
```

### 策略模式

每个策略负责具体的收益来源：

```solidity
interface IStrategy {
    function want() external view returns (address);
    function deposit() external;
    function withdraw(uint256 amount) external returns (uint256);
    function harvest() external;      // 收割收益
    function harvestTrigger() external view returns (bool);  // 判断是否值得收割
    function estimatedTotalAssets() external view returns (uint256);
}
```

常见的策略包括：
- **借贷策略**：在 Aave/Compound 中存入抵押物获得借贷收益
- **流动性挖矿**：在 DEX 提供流动性获得交易手续费分成
- **收益率复利**：自动将收益再投资，最大化复利效应

## DeFi 合约开发注意事项

| 方面 | 注意事项 |
|------|---------|
| 精度处理 | Solidity 无小数，利率计算需用 `Wad`（10^18）精度 |
| 重入攻击 | 使用 CEI（Checks-Effects-Interactions）模式防重入 |
| 预言机价格 | 使用 TWAP（时间加权平均价）防止价格操纵 |
| 权限控制 | 多签钱包管理协议参数，定期审计 |
| 紧急暂停 | 预留 Circuit Breaker 机制应对极端行情 |

## 总结

三大 DeFi 协议类型各有特点：AMM 用数学公式做市，借贷协议靠超额抵押实现去中心化借贷，收益聚合器则将复杂策略自动化。深入理解这些核心机制的设计权衡，是进阶 DeFi 开发的必经之路。下一篇文章我们将讨论智能合约的测试与部署流程。
