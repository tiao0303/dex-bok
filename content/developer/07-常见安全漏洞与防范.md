# 智能合约常见安全漏洞与防范

## 安全是 DeFi 的生命线

智能合约安全漏洞的后果远比传统软件严重。代码一旦部署，攻击者就可以利用漏洞盗走价值，而且由于区块链的不可篡改性，被盗资产几乎无法追回。

## 一、重入攻击（Reentrancy）

### 攻击原理

攻击者构造一个恶意合约，在合约余额更新前反复调用受害合约的提款函数。

### 防御措施

**1. CEI 模式（Checks-Effects-Interactions）**

先检查条件，再更新状态，最后做外部调用。

**2. 引入互斥锁**

使用 ReentrancyGuard 修饰器。

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

### 防御措施

**1. 使用 TWAP（时间加权平均价格）**

**2. 多预言机聚合**

**3. 设置价格波动检查**

## 三、整数溢出/下溢

### 攻击原理

Solidity 0.8 之前的版本不内置溢出检查，攻击者可利用溢出绕过金额检查。

### 防御措施

**升级到 Solidity 0.8+** —— 内置溢出检查会在溢出时自动 revert。

## 四、访问控制漏洞

### 攻击原理

忘记添加权限检查，任何人都可以调用管理员函数。

### 防御措施

**1. 显式声明访问控制**

```solidity
modifier onlyOwner() {
    require(msg.sender == owner, "Not authorized");
    _;
}
```

**2. 使用 OpenZeppelin AccessControl**

## 五、闪电贷攻击

### 攻击原理

闪电贷允许你在一个交易内借出巨款、进行操作、归还借款。

### 防御措施

**1. 价格延迟生效**

**2. 检查交易来源**

## 六、前端绕过攻击

### 攻击原理

前端限制最小交易额，但合约层没有校验。

### 防御措施

**服务端校验必须同步到合约层**

## 七、应急响应计划

即使做了充分防御，也要准备应急响应：

```solidity
contract Pausable {
    bool public paused;
    
    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
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