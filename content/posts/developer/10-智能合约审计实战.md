# 智能合约审计实战：从自检到专业审计

## 为什么需要审计

智能合约审计是对合约代码进行系统性安全检查的过程，目的是在部署前发现并修复漏洞。2022 年 Web3 因安全问题损失超过 37 亿美元，**绝大多数损失本可以通过审计避免**。

本文以一个借贷协议的简化版本为例，演示从自检到专业审计的完整流程。

## 目标合约：SimpleLending

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract SimpleLending is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // 抵押品信息
    struct Collateral {
        uint256 amount;
        uint256 borrowedAmount;
        uint256 lastUpdateTime;
    }
    
    // 资产配置
    mapping(address => bool) public supportedCollateral;
    mapping(address => bool) public supportedBorrow;
    mapping(address => uint256) public collateralFactor; // 抵押率 0-100
    mapping(address => uint256) public borrowRate; // 借款利率 bps/second
    
    // 用户数据
    mapping(address => mapping(address => Collateral)) public userCollateral;
    mapping(address => uint256) public totalBorrowed;
    
    // 全局数据
    uint256 public constant BPS = 10000;
    uint256 public constant HEALTH_FACTOR_THRESHOLD = 1e18; // 1.0
    
    address public immutable weth;
    
    event Deposit(address indexed user, address indexed token, uint256 amount);
    event Withdraw(address indexed user, address indexed token, uint256 amount);
    event Borrow(address indexed user, address indexed token, uint256 amount);
    event Repay(address indexed user, address indexed token, uint256 amount);
    event Liquidate(
        address indexed liquidator,
        address indexed user,
        address indexed collateralToken,
        uint256 amount
    );
    
    constructor(address _weth) Ownable() {
        weth = _weth;
    }
    
    // --- 管理函数 ---
    
    function addSupportedCollateral(address token, uint256 factor) external onlyOwner {
        supportedCollateral[token] = true;
        collateralFactor[token] = factor; // factor in BPS (e.g. 8000 = 80%)
    }
    
    function addSupportedBorrow(address token, uint256 rate) external onlyOwner {
        supportedBorrow[token] = true;
        borrowRate[token] = rate; // bps per second
    }
    
    // --- 核心业务逻辑 ---
    
    function deposit(address token, uint256 amount) external nonReentrant {
        require(supportedCollateral[token], "Unsupported collateral");
        require(amount > 0, "Amount must be positive");
        
        Collateral storage col = userCollateral[msg.sender][token];
        
        // 更新抵押数据
        _accrueInterest(msg.sender, token);
        col.amount += amount;
        col.lastUpdateTime = block.timestamp;
        
        // 转账代币
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        
        emit Deposit(msg.sender, token, amount);
    }
    
    function withdraw(address token, uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be positive");
        
        Collateral storage col = userCollateral[msg.sender][token];
        _accrueInterest(msg.sender, token);
        
        require(col.amount >= amount, "Insufficient balance");
        col.amount -= amount;
        
        // 健康检查
        require(_getHealthFactor(msg.sender) >= HEALTH_FACTOR_THRESHOLD, "Health factor too low");
        
        IERC20(token).safeTransfer(msg.sender, amount);
        
        emit Withdraw(msg.sender, token, amount);
    }
    
    function borrow(address token, uint256 amount) external nonReentrant {
        require(supportedBorrow[token], "Unsupported borrow asset");
        require(amount > 0, "Amount must be positive");
        
        Collateral storage col = userCollateral[msg.sender][weth]; // 假设只用 WETH 作为抵押
        
        // 累计利息
        _accrueInterestForUser(msg.sender);
        
        // 健康因子检查
        uint256 borrowedValue = _getBorrowedValue(msg.sender);
        uint256 collateralValue = _getCollateralValue(msg.sender);
        uint256 maxBorrow = collateralValue * collateralFactor[weth] / BPS;
        
        require(borrowedValue + amount <= maxBorrow, "Borrow limit exceeded");
        
        // 更新借款数据
        userCollateral[msg.sender][token].borrowedAmount += amount;
        totalBorrowed[token] += amount;
        
        IERC20(token).safeTransfer(msg.sender, amount);
        
        emit Borrow(msg.sender, token, amount);
    }
    
    function repay(address token, uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be positive");
        
        Collateral storage col = userCollateral[msg.sender][token];
        
        // 先累计利息
        _accrueInterest(msg.sender, token);
        
        // 转账并更新
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        
        if (amount >= col.borrowedAmount) {
            col.borrowedAmount = 0;
        } else {
            col.borrowedAmount -= amount;
        }
        
        totalBorrowed[token] -= amount; // 潜在问题：未考虑部分还款
        
        emit Repay(msg.sender, token, amount);
    }
    
    function liquidate(address user, address collateral, uint256 repayAmount) 
        external nonReentrant 
    {
        require(
            _getHealthFactor(user) < HEALTH_FACTOR_THRESHOLD, 
            "Health factor OK"
        );
        
        Collateral storage col = userCollateral[user][collateral];
        require(col.borrowedAmount > 0, "No debt to liquidate");
        
        // 转账还款
        IERC20(weth).safeTransferFrom(msg.sender, address(this), repayAmount);
        
        // 计算清算量
        uint256 collateralToLiquidate = repayAmount * BPS / collateralFactor[collateral];
        
        // 执行清算
        col.amount -= collateralToLiquidate;
        col.borrowedAmount -= repayAmount; // 可能为负？
        
        // 转给清算人
        IERC20(collateral).safeTransfer(msg.sender, collateralToLiquidate);
        
        emit Liquidate(msg.sender, user, collateral, collateralToLiquidate);
    }
    
    // --- 内部函数 ---
    
    function _accrueInterest(address user, address token) internal {
        Collateral storage col = userCollateral[user][token];
        if (col.lastUpdateTime == 0) return;
        
        uint256 elapsed = block.timestamp - col.lastUpdateTime;
        if (elapsed == 0 || col.borrowedAmount == 0) return;
        
        uint256 borrowRatePerSecond = borrowRate[token];
        uint256 interest = col.borrowedAmount * borrowRatePerSecond * elapsed / BPS;
        
        col.borrowedAmount += interest;
        col.lastUpdateTime = block.timestamp;
    }
    
    function _accrueInterestForUser(address user) internal {
        // 简化：假设只借 WETH
        _accrueInterest(user, weth);
    }
    
    function _getHealthFactor(address user) internal view returns (uint256) {
        uint256 borrowedValue = _getBorrowedValue(user);
        if (borrowedValue == 0) return type(uint256).max;
        
        uint256 collateralValue = _getCollateralValue(user);
        return collateralValue * 1e18 / borrowedValue;
    }
    
    function _getBorrowedValue(address user) internal view returns (uint256) {
        // 简化：假设只借一种资产
        return userCollateral[user][weth].borrowedAmount;
    }
    
    function _getCollateralValue(address user) internal view returns (uint256) {
        // 简化：假设只抵押 WETH
        return userCollateral[user][weth].amount;
    }
}
```

## 第一阶段：自检清单

### 快速检查清单

在提交审计前，先用这个清单自检：

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

# 输出示例
INFO:Detectors:
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#reentrancy-vulnerabilities
Redundant expression: "col.borrowedAmount >= amount" in "repay" (25)
```

### Mythril 符号执行

```bash
# 安装
pip install mythril

# 分析
myth analyze contracts/SimpleLending.sol --solc-remaps '@openzeppelin=node_modules/@openzeppelin'
```

### OZ Contract Wizard 检查

使用 OpenZeppelin 的在线工具验证是否符合最佳实践。

## 第三阶段：手动审计要点

### 漏洞 1：repay 函数的部分还款逻辑缺陷

```solidity
// 问题代码
if (amount >= col.borrowedAmount) {
    col.borrowedAmount = 0;
} else {
    col.borrowedAmount -= amount;
}

// 问题：repayAmount 可能小于应还利息+本金，导致永远还不清
// 而且 totalBorrowed 减的是传入的 amount，而非实际扣除量
totalBorrowed[token] -= amount; // 错误：应该只减实际还款部分
```

**修复建议**：

```solidity
uint256 toRepay = amount >= col.borrowedAmount ? col.borrowedAmount : amount;
col.borrowedAmount -= toRepay;
totalBorrowed[token] -= toRepay;
```

### 漏洞 2：liquidation 函数边界检查缺失

```solidity
// 问题：col.borrowedAmount -= repayAmount 后可能下溢
col.borrowedAmount -= repayAmount; // 无符号整数下溢风险

// 问题：清算比例可能超过抵押物数量
uint256 collateralToLiquidate = repayAmount * BPS / collateralFactor[collateral];
// 应该检查：collateralToLiquidate <= col.amount
```

**修复建议**：

```solidity
uint256 collateralToLiquidate = repayAmount * BPS / collateralFactor[collateral];
require(collateralToLiquidate <= col.amount, "Insufficient collateral");

col.amount -= collateralToLiquidate;
col.borrowedAmount -= repayAmount; // 现在已知 repayAmount <= col.borrowedAmount
```

### 漏洞 3：健康因子计算假设过于简化

```solidity
// 问题：只考虑一种抵押物和一种借款资产
function _getCollateralValue(address user) internal view returns (uint256) {
    return userCollateral[user][weth].amount; // 假设只抵押 WETH
}
```

现实场景中，用户可能抵押多种资产，系统需要聚合所有抵押品价值。

### 漏洞 4：时间戳依赖

```solidity
uint256 elapsed = block.timestamp - col.lastUpdateTime;
```

区块时间戳可以被矿工操控（±900秒范围），在极端情况下可能影响利率计算精度。建议使用区块高度替代，或设置合理的上限。

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

## 信息类问题
...

## 总结
- 风险评级
- 整体评价
```

## 审计资源与工具

| 工具/资源 | 用途 |
|-----------|------|
| Slither | 静态分析，自动检测常见漏洞模式 |
| Mythril | 符号执行，发现复杂漏洞 |
| Echidna | 模糊测试，属性检查 |
| Surya | 可视化合约结构 |
| OZ Contracts | 经验证的安全实现库 |
| OpenZeppelin Audit | 参考审计报告样本 |

## 总结：审计的最佳实践

1. **代码冻结前审计**：审计应在部署前完成，而非之后补救
2. **多次审计**：重大版本更新后重新审计
3. **Bug Bounty**：主网上线后配合赏金计划
4. **渐进式发布**：先小TVL试运行，逐步扩大规模
5. **监控告警**：部署后持续监控异常活动

记住：**没有任何审计能保证 100% 无漏洞**，但专业的审计能发现绝大多数问题。审计不是终点，安全是一个持续的过程。

---

**10 篇博客系列到此完结。从编程入门到智能合约审计，我们涵盖了区块链开发者需要掌握的核心知识体系。祝你的 DeFi 开发之旅一路顺风！**
