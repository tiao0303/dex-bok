# 智能合约常见漏洞：从入门到理解真实风险

## 前言

智能合约漏洞不是小概率事件——据 DefiLlama 统计，截至 2025 年初，DeFi 领域因合约漏洞累计损失已超过 **70 亿美元**。本文聚焦几类最常见、最易被利用的漏洞类型，用真实案例帮助你建立直观认知。

## 1. 整数溢出与下溢（Integer Overflow/Underflow）

### 原理

Solidity 0.8 之前的版本中，整数变量有固定大小。以 `uint8` 为例，它的取值范围是 0~255。当一个 `uint8` 变量从 255 继续加 1，会**溢出**变成 0；从 0 继续减 1，会**下溢**变成 255。

```solidity
// Solidity 0.7.x（存在溢出风险）
function withdraw(uint256 amount) public {
    balances[msg.sender] -= amount; // 下溢！0 - 1 = 2^256 - 1
    msg.sender.transfer(amount);
}
```

### 真实案例

2018 年的 BEC（Batch Aero Coin）代币事件：攻击者利用整数溢出在单笔交易中凭空生成天量代币，币价瞬间归零，单日蒸发市值 60 亿美元。

### 防御

- 使用 Solidity 0.8+（内置溢出检查，溢出时交易回滚）
- 或使用 OpenZeppelin 的 `SafeMath` 库

## 2. 访问控制缺陷（Access Control Issues）

### 原理

区块链上的合约默认没有权限隔离。如果关键函数（如提款、铸造、参数修改）缺少 `onlyOwner` 或角色校验，任何人都能调用它们。

```solidity
// 错误示例：缺少权限校验
function setOracleAddress(address _oracle) public {
    oracleAddress = _oracle; // 任何人都能改预言机地址！
}

// 正确示例
function setOracleAddress(address _oracle) public onlyOwner {
    oracleAddress = _oracle;
}
```

### 真实案例

2019 年 bZx 攻击事件中，合约的 `pause()` 函数存在权限配置错误；更早的 Parity 多签钱包漏洞则因初始化函数未设为 private，导致任何人可初始化钱包并窃取资产。

## 3. 拒绝服务攻击（DoS）

### 原理

合约逻辑中的边界条件导致交易无法正常完成，攻击者反复触发该条件使合约"瘫痪"。

**类型 A：不可预期的 revert**
```solidity
// 当 recipients[0] 是 address(0) 时会 revert，阻塞整个批量转账
function batchTransfer(address[] memory recipients, uint256 amount) public {
    for (uint i = 0; i < recipients.length; i++) {
        balances[recipients[i]] += amount; // 无 SafeMath 可能溢出
        emit Transfer(msg.sender, recipients[i], amount);
    }
}
```

**类型 B：gas 耗尽（DoS with Block Gas Limit）**
遍历一个不断增长的地址列表，当列表足够大时，消耗的 gas 会超过区块上限，导致交易永远无法打包。

### 真实案例

早期某 NFT 批量铸造合约因在循环中调用 `transfer()` 耗尽 gas，导致 mint 窗口无法正常工作。

## 4. 未初始化的指针（Uninitialized Storage Pointer）

### 原理

Solidity 中的 storage 变量默认指向 slot 0（合约的第一个存储槽）。如果一个 local storage 变量未显式初始化，它实际上指向 slot 0，可能意外覆盖关键变量。

```solidity
// 危险示例
function initialize(address _admin) public {
    bool initialized; // 未初始化，默认指向 slot 0
    address admin;    // 同样指向 slot 0
    
    // 这里的赋值实际上修改了 slot 0 的值
    admin = _admin;
    // ...
}
```

## 5. 交易顺序依赖攻击（Front-Running / Transaction Order Dependence）

### 原理

区块链交易在打包前处于 mempool（内存池）中，矿工或验证者可以看到pending交易并调整排序。攻击者可以通过提高 gas 价格让自己的交易插队到受害者之前。

**典型场景：**
1. 用户在 DEX 挂单购买某代币
2. MEV 机器人侦测到这笔交易，推高该代币价格
3. 用户的交易以更高的价格执行，造成损失

### 真实案例

2022 年的 Uniswap 流动性攻击、多个 NFT  mint 事件中的"三明治攻击"都属此类。

## 6. 随机数可预测（Predictable Randomness）

### 原理

区块链是确定性的，链上无法产生真随机数。以下方式都是**可预测的**：
- `block.timestamp`、`block.difficulty`、`block.number`
- `blockhash()`（在已知区块上）
- 外部 API 喂价

```solidity
// 危险：随机数可预测
function random() internal view returns (uint) {
    return uint(keccak256(abi.encodePacked(block.timestamp, msg.sender)));
}

// 攻击者可以在同一区块内用多个合约地址计算出相同结果
```

### 真实案例

Axie Infinity 早期曾因此类漏洞遭受损失；多个菠菜类 DApp 的随机数被预测导致资金被抽干。

## 7. 依赖外部合约地址的风险

### 原理

合约中使用 `address` 类型存储其他合约引用，但无法保证该地址确实是预期合约。攻击者可部署恶意合约后诱使管理员更新地址。

```solidity
// 危险模式
function setTreasury(address _treasury) external {
    treasury = _treasury; // 没有校验，可能是恶意合约
}
```

## 防御清单

| 漏洞类型 | 核心防御手段 |
|---------|------------|
| 整数溢出 | Solidity 0.8+ 或 SafeMath |
| 访问控制 | 严格角色修饰符 + 权限审计 |
| DoS | 避免循环遍历无上限数据 |
| 未初始化指针 | 显式声明 storage 变量 |
| Front-Running | 随机延迟、提交-揭示机制 |
| 随机数可预测 | Chainlink VRF 等链外随机数 |
| 外部地址依赖 | 地址白名单 + 完整性校验 |

## 结语

理解这些常见漏洞是安全分析的第一步。但知道漏洞存在和能利用它是两回事——下一篇文章我们将深入剖析其中最经典的一种：**重入攻击（Reentrancy）**，包括著名的 The DAO 事件始末，以及现代合约的防御策略。
