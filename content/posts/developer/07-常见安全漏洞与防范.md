# 智能合约常见安全漏洞与防范

## 安全是 DeFi 的生命线

智能合约安全漏洞的后果远比传统软件严重。代码一旦部署，攻击者就可以利用漏洞盗走价值，而且由于区块链的不可篡改性，被盗资产几乎无法追回。本文中我们将系统梳理最常见的安全漏洞及防御方法。

## 一、重入攻击（Reentrancy）

### 攻击原理

攻击者构造一个恶意合约，在合约余额更新前反复调用受害合约的提款函数：

```solidity
// 有漏洞的合约：先转账，后更新状态
contract VulnerableBank {
    mapping(address => uint256) public balances;
    
    function deposit() external payable {
        balances[msg.sender] += msg.value;
    }
    
    function withdraw(uint256 amount) external {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        
        // 漏洞点：状态更新在外部调用之后
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
        
        balances[msg.sender] -= amount; // 第二次进入时余额尚未扣除
    }
}
```

### 攻击合约示例

```solidity
contract Attacker {
    VulnerableBank public bank;
    
    constructor(address _bank) {
        bank = VulnerableBank(_bank);
    }
    
    // 先存款，使自己有余额可提
    function attack() external payable {
        bank.deposit{value: 1 ether}();
        bank.withdraw(1 ether);
    }
    
    // 收款回调触发下一次 withdraw
    receive() external payable {
        if (address(bank).balance >= 1 ether) {
            bank.withdraw(1 ether);
        }
    }
}
```

### 防御措施

**1. CEI 模式（Checks-Effects-Interactions）**

```solidity
function withdraw(uint256 amount) external {
    // 1. Checks
    require(balances[msg.sender] >= amount, "Insufficient balance");
    
    // 2. Effects（先更新状态）
    balances[msg.sender] -= amount;
    
    // 3. Interactions（最后做外部调用）
    (bool success, ) = msg.sender.call{value: amount}("");
    require(success, "Transfer failed");
}
```

**2. 引入互斥锁**

```solidity
contract SecureBank {
    bool private locked;
    
    modifier noReentrant() {
        require(!locked, "No reentrancy");
        locked = true;
        _;
        locked = false;
    }
    
    function withdraw(uint256 amount) external noReentrant {
        // ...
    }
}
```

**3. 使用 OpenZeppelin 的 ReentrancyGuard**

```solidity
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract SecureBank is ReentrancyGuard {
    function withdraw(uint256 amount) external nonReentrant {
        // ...
    }
}
```

## 二、预言机价格操控

### 攻击原理

攻击者利用闪电贷在短时间内操控交易对价格，使预言机返回错误价格，然后在其他协议中套利。

2022 年 Mango Markets 攻击就是典型案例：攻击者操控代币价格，利用借贷协议取出巨额资产。

### 防御措施

**1. 使用 TWAP（时间加权平均价格）**

```solidity
contract ChainlinkOracle {
    using AggregatorV3Interface for address;
    
    function getTWAP(address token, uint256 interval) public view returns (uint256) {
        uint256 latestPrice = AggregatorV3Interface(token).latestAnswer();
        uint256 price1HourAgo = AggregatorV3Interface(token).latestAnswer(); // 实际应取1小时前数据
        
        // 建议使用 Uniswap V3 TWAP 或 Chainlink 的historical data
        return (latestPrice + price1HourAgo) / 2;
    }
    
    function getLatestPrice(address token) public view returns (uint256) {
        (, int256 price, , , ) = AggregatorV3Interface(token).latestRoundData();
        return uint256(price);
    }
}
```

**2. 多预言机聚合**

```solidity
contract AggregatedOracle {
    mapping(address => address[]) public oracles; // 多个预言机源
    
    function getPrice(address token) public view returns (uint256) {
        address[] memory sources = oracles[token];
        uint256[] memory prices = new uint256[](sources.length);
        
        for (uint i = 0; i < sources.length; i++) {
            prices[i] = Chainlink(sources[i]).getPrice(token);
        }
        
        // 取中位数
        return _getMedian(prices);
    }
}
```

**3. 设置价格波动检查**

```solidity
function validatePrice(address token, uint256 newPrice) internal view {
    uint256 lastPrice = lastPrices[token];
    uint256 maxDeviation = lastPrice * 150 / 10000; // 最大15%波动
    
    require(
        newPrice >= lastPrice - maxDeviation && 
        newPrice <= lastPrice + maxDeviation,
        "Price manipulation detected"
    );
}
```

## 三、整数溢出/下溢

### 攻击原理

Solidity 0.8 之前的版本不内置溢出检查，攻击者可利用溢出绕过金额检查：

```solidity
// Solidity < 0.8 版本
function withdraw(uint256 amount) external {
    require(balances[msg.sender] - amount >= 0); // 下溢时绕过检查
    balances[msg.sender] -= amount;
    // ...
}
```

### 防御措施

**升级到 Solidity 0.8+** —— 内置溢出检查会在溢出时自动 revert：

```solidity
pragma solidity ^0.8.24;
// 不需要 SafeMath，编译器自动检查
uint256 public balance;
function add(uint256 amount) external {
    balance += amount; // 溢出时自动 revert
}
```

**如果必须使用低版本，引入 SafeMath**：

```solidity
library SafeMath {
    function add(uint256 a, uint256 b) internal pure returns (uint256) {
        uint256 c = a + b;
        require(c >= a, "SafeMath: addition overflow");
        return c;
    }
}
```

## 四、访问控制漏洞

### 攻击原理

忘记添加权限检查，任何人都可以调用管理员函数：

```solidity
// 漏洞：缺少 onlyOwner 修饰器
function setFee(uint256 newFee) public {
    fee = newFee;
}

// 攻击者直接调用，修改手续费为 100%
```

### 防御措施

**1. 显式声明访问控制**

```solidity
contract AccessControl {
    address public owner;
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }
    
    function setFee(uint256 newFee) external onlyOwner {
        fee = newFee;
    }
}
```

**2. 使用 OpenZeppelin AccessControl**

```solidity
import "@openzeppelin/contracts/access/AccessControl.sol";

contract MyContract is AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }
    
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }
}
```

## 五、闪电贷攻击

### 攻击原理

闪电贷允许你在一个交易内借出巨款、进行操作、归还借款。攻击者利用这一点操纵价格或绕过余额检查：

```
1. 借出 1000 ETH
2. 在 DEX 大量买入某代币，推高价格
3. 用被操控的价格在借贷协议借款
4. 归还闪电贷
5. 利润落袋
```

### 防御措施

**1. 价格延迟生效**

```solidity
contract DelayedPrice {
    uint256 public price;
    uint256 public lastUpdateTime;
    uint256 public delay = 1 hours;
    
    function setPrice(uint256 newPrice) external onlyOracle {
        require(
            block.timestamp >= lastUpdateTime + delay,
            "Price update too frequent"
        );
        price = newPrice;
        lastUpdateTime = block.timestamp;
    }
}
```

**2. 检查交易来源**

```solidity
modifier notInFlashLoan() {
    require(
        tx.origin == msg.sender || !IFlashLoan(msg.sender).isFlashLoan(),
        "Flash loan detected"
    );
    _;
}
```

> ⚠️ 注意：此方法可以被绕过，最根本的防御还是使用 TWAP 和多数据源。

## 六、前端绕过攻击

### 攻击原理

前端限制最小交易额，但合约层没有校验，攻击者直接调用合约绕过。

### 防御措施

**服务端校验必须同步到合约层**：

```solidity
function swap(uint256 minAmountOut, uint256 deadline) external {
    require(block.timestamp <= deadline, "Transaction expired");
    require(amountOut >= minAmountOut, "Slippage tolerance exceeded");
    // 执行交换
}
```

## 七、应急响应计划

即使做了充分防御，也要准备应急响应：

```solidity
contract Pausable {
    bool public paused;
    address public pauseGuardian;
    
    event Paused(address account);
    event Unpaused(address account);
    
    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }
    
    function pause() external {
        require(
            msg.sender == pauseGuardian || msg.sender == owner(),
            "Not authorized to pause"
        );
        paused = true;
        emit Paused(msg.sender);
    }
}
```

## 安全检查清单

| 类别 | 检查项 |
|------|--------|
| 重入 | 是否使用 CEI 模式？是否有互斥锁？ |
| 访问控制 | 关键函数是否都有权限检查？ |
| 整数 | 是否使用 SafeMath 或 Solidity 0.8+？ |
| 预言机 | 是否使用 TWAP？是否有多数据源聚合？ |
| 闪电贷 | 价格是否有延迟生效机制？ |
| 前端 | 关键参数在合约层是否校验？ |

## 总结

智能合约安全需要"纵深防御"——每一层都可能失效，但多层防护让攻击者无懈可击。最重要的是：**永远假设你的代码会被攻击，永远不要相信用户输入，永远保持谦逊**。

下一篇文章我们将讨论 Gas 优化技巧，这是智能合约开发的高级话题。
